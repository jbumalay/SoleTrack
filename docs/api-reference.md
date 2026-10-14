# API Reference

Base: same-origin `/api`. Envelope: `{ status: "success"|"error", data?|message? }`.
Auth: `Authorization: Bearer <token>` (DB-backed `sessions` row, 24h TTL) unless noted.
All paths verified against `server/` route registrations (`server/routes/*.ts`, mounted in `server/app.ts`).

## Public (no auth)

| Method | Path | Query / body | Notes |
|---|---|---|---|
| GET | `/api/health` | — | `{status, message}` liveness |
| GET | `/api/products` | `?id=` single with `reviews[]`,`inventory[]`; else list with stock/rating aggregates: legacy `?category=&limit=&seller_id=` → bare array; catalog mode `?search=&sort=newest\|price_asc\|price_desc\|rating&page=&limit=` (default `page=1,limit=12`, max 100) → `{items[],page,total_pages,total_items}` | `limit` validated/clamped (max 100) + inlined; `limit=abc` → 400; `sort`/`page` invalid → 400; `search` matches name/description/brand (`LIKE %..%`); `limit` alone keeps bare array for back-compat |
| GET | `/api/categories` | — | all rows |
| GET | `/api/sizes` | — | ordered by `size_id` |
| GET | `/api/stores` | legacy (no params) → bare array; paged `?search=&page=&limit=` (defaults `page=1,limit=12`) → `{items[],page,total_pages,total_items}`; always `ORDER BY brand_name ASC` | `search` matches brand/username/description/location; invalid `page`/`limit` → 400 |
| GET | `/api/stores/:id` | path id | profile + active products; 404 if not seller |

## Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | `{email, password}` | bcrypt verify → `{...userInfo (no hash), token}`; 401 on failure |
| POST | `/api/auth/register` | `{email, password (≥8), role?, first_name?, last_name?, brand_name?}` | `role` allowlisted (`customer`/`seller`; `admin` → 400); seller → `pending_approval`; auto-login token; missing/short password → 400 |
| GET | `/api/auth/me` | — (Bearer) | `{...userInfo}` or 401 |
| POST | `/api/auth/logout` | — (Bearer, optional) | deletes session row; always 200 |

## Cart & checkout (auth)

| Method | Path | Shape |
|---|---|---|
| GET | `/api/cart` | → `{items[], total}` (price/image/stock joined) |
| POST | `/api/cart/add` | `{product_id, quantity, size_id?}` → upsert |
| PUT | `/api/cart/update?id=` | `{quantity}` |
| DELETE | `/api/cart/remove?id=` | — |
| POST | `/api/checkout` | `{shipping_address, payment_method, promo_code?}` → `{order_id, subtotal, discount, promo_code, shipping, total}`; transactional; shipping free over ₱500 else ₱50 evaluated on discounted subtotal; `WELCOME10` seeded (10% off) | unknown/inactive/expired/over-limit/under-minimum promo → 400; usage increments once per order in the same transaction |

## Orders / reviews / payments (auth, owner-scoped)

| Method | Path | Shape / rule |
|---|---|---|
| GET | `/api/orders/my` | own orders, each with ≤3 preview items |
| GET | `/api/orders/details?id=` | owner, or seller with item in order, or admin; includes `items[]` + `history[]` + `discount_amount`/`promo_code` |
| POST | `/api/orders/simulate?id=` | advances pending→confirmed→shipped→delivered; customer: own only; seller: own-item only; admin: any |
| PUT | `/api/orders/cancel?id=` | owner only; allowed from `pending`/`confirmed`; restocks each line into `inventory` in the same transaction + `cancelled` history row; double-cancel → 400 without double-restock |
| POST | `/api/reviews` | `{product_id, rating 1–5, comment?}`; requires `delivered` order containing product → 400 otherwise; one per `(product_id,user_id)` → 400 on duplicate (`UNIQUE` backstop; legacy `user_id NULL` rows exempt) |
| GET | `/api/payment/history?order_id=` | owner or admin; returns `order_status_history` rows |

## Seller (`isSeller`: role=seller AND status=active)

| Method | Path | Shape |
|---|---|---|
| GET | `/api/seller/dashboard` | `{total_products, total_stock, inventory_value, low_stock_count (<30), trend[], topSelling[]}` |
| GET | `/api/seller/products` | own products + `inventory[]` per size |
| POST | `/api/seller/products` | `{product_name, description, base_price, category_id, image_url, inventory[]?}` |
| PUT | `/api/seller/products` | `{product_id, …same}`; ownership check; transactional; rejects negative stock |
| DELETE | `/api/seller/products?id=` | soft delete |
| GET | `/api/seller/reports/sales?days=` (default 7) | `{metrics{total_revenue,total_orders,aov,total_customers,products_sold,pending_orders_count}, trend[], categoryBreakdown[], topSelling[10]}` |
| GET | `/api/seller/reviews?product_id=` (required) | ownership-checked review list |
| GET | `/api/seller/orders` | distinct orders with own products (+ own items each) |
| PUT | `/api/seller/orders/status` | `{order_id, status ∈ pending/confirmed/shipped/delivered/cancelled}`; blocks delivered/cancelled; requires own item |
| PUT | `/api/seller/orders/payment` | `{order_id, payment_status ∈ paid/refunded}`; requires own item; 403 otherwise; idempotent re-mark; appends `order_status_history` |
| GET | `/api/seller/profile` | user fields + `profile` row |
| PUT | `/api/seller/profile` | `{brand_name?, description?, logo_url?, banner_url?, location?, contact_email?, phone?}` (upsert) |

## Admin (`isAdmin`: role=admin)

| Method | Path | Shape |
|---|---|---|
| GET | `/api/analytics/stats` | `{total_sales, total_orders, total_customers, total_products}` (legacy flat) |
| GET | `/api/admin/dashboard` | user/order/product stats + `recent_orders[5]` |
| GET | `/api/admin/users?search=&role=&status=` | filtered user list (no hashes) |
| POST | `/api/admin/users` | `{email, password ≥8, role, first_name, last_name, brand_name?, status?}` |
| PUT | `/api/admin/users/:id` | `{role, status, first_name, last_name, brand_name}` |
| DELETE | `/api/admin/users/:id` | soft delete; 400 on self-delete |
| GET | `/api/admin/reports` | `{metrics (excl. cancelled), trend[30d], sellerBreakdown[10]}` |
| GET/POST | `/api/admin/categories` | list / `{category_name, description?}` |
| PUT/DELETE | `/api/admin/categories/:id` | update / delete (400 if products use it) |
| GET/POST | `/api/admin/sizes` | list (numeric sort) / `{size_value}` |
| DELETE | `/api/admin/sizes/:id` | delete (400 if inventory uses it; no update route) |
| PUT | `/api/admin/orders/payment` | `{order_id, payment_status ∈ paid/refunded}`; admin-only, any order; idempotent re-mark; appends `order_status_history` |
| GET/POST | `/api/admin/promo-codes` | list / `{code (3–50 A-Z0-9_-, stored uppercase), discount_type ∈ percent\|fixed, discount_value (>0; percent ≤100), min_subtotal? (≥0, default 0), expires_at? (NULL = never), usage_limit? (NULL = unlimited), is_active?}`; duplicate → 409 |
| PUT/DELETE | `/api/admin/promo-codes/:id` | update (same validation; `expires_at: null`/`usage_limit: null` clears; `used_count` server-managed) / hard delete (past orders keep `discount_amount`) |

Count: ~41 `/api/*` route registrations (58 `app.*` matches include static/PWA fallbacks).
No pagination anywhere; list endpoints return full sets.
