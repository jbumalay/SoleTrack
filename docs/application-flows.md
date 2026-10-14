# Application Flows

## 1. Browse → cart → checkout (customer)

1. **Browse:** `Home`/`Products` call `getProducts({category?, limit?, seller_id?})`
   → `GET /api/products`; `ProductDetail` calls `getProduct(id)` → `GET /api/products?id=`
   (detail payload includes `reviews[]` + `inventory[]` with `size_value`).
   Server-side search/sort/pagination: `?search=` (name/description/brand),
   `?sort=newest|price_asc|price_desc|rating`, `?page=&limit=` (defaults 1/12,
   max 100) → `{items, page, total_pages, total_items}`; legacy
   `category`/`seller_id`/`limit`-only calls still return a bare array, so
   existing callers work unmodified (client `normalizeList` accepts both shapes).
2. **Stores:** `Stores` → `GET /api/stores`; `StoreDetail` → `GET /api/stores/:id`
   (profile + active products with stock/rating aggregates).
3. **Cart:** requires login. `addToCart` → `POST /api/cart/add`
   `{product_id, quantity, size_id}` (upserts on user+product+size match);
   `Cart` page → `GET /api/cart` (items joined with price/image + per-size stock);
   update/remove via `PUT /api/cart/update?id=` / `DELETE /api/cart/remove?id=`.
4. **Checkout:** `Checkout` → `POST /api/checkout` `{shipping_address, payment_method, promo_code?}`.
   Server in one transaction: verifies cart non-empty → checks each line's inventory →
   validates the promo code when sent (unknown/inactive/expired/over-limit/under-minimum → 400)
   → computes `subtotal` minus `discount` (percent or fixed), free shipping over ₱500 else ₱50 fee
   evaluated on the discounted subtotal → inserts order (status
   `pending`, with `promo_code_id`/`discount_amount`) + history + items → decrements inventory (guarded `stock_quantity >= ?`)
   → increments promo `used_count` once → clears cart. Returns `{order_id, subtotal, discount, promo_code, shipping, total}`.
5. **Track:** `getMyOrders` → `GET /api/orders/my` (each order carries up to 3 preview
   items); `getOrderDetails` → `GET /api/orders/details?id=` (items + status history,
   plus `discount_amount`/`promo_code`).
   Customer can `cancelOrder` (`PUT /api/orders/cancel?id=`) only while
   `pending`/`confirmed` (restocks each line into `inventory` in the same transaction + `cancelled` history row;
   `requested`/`approved` orders cannot cancel); `simulateOrderProgress` (`POST /api/orders/simulate?id=`)
   advances `pending → confirmed → shipped → delivered` (demo helper, owner-scoped; rejects in-return orders).
   **Returns:** customer requests on a `delivered` order (`POST /api/orders/return?id=` → `requested` + history);
   the owning seller approves (`PUT /api/seller/orders/return {order_id}` → `approved`, restock + `refunded`,
   403 for other sellers).
6. **Review:** `POST /api/reviews` `{product_id, rating 1–5, comment}`; display name
   derived from `first_name/last_name` or username; requires a `delivered`
   order containing the product (400 otherwise) and one review per user per
   product (duplicate → 400).

## 2. Seller journey (approve → product → order)

1. **Register** as seller → `POST /api/auth/register` with `role: 'seller'` →
   `status = 'pending_approval'`. `isSeller` rejects until an admin sets `active`
   (via `PUT /api/admin/users/:id`).
2. **Profile:** `GET/PUT /api/seller/profile` (brand fields on `users` + upsert
   `seller_profiles` row).
3. **Products:** `GET /api/seller/products` (own products + inventory per size);
   `POST /api/seller/products` (product + optional `inventory[]`
   `{size_id, stock_quantity}`); `PUT /api/seller/products` (ownership check +
   transaction; rejects negative stock); `DELETE /api/seller/products?id=`
   (soft delete via `deleted_at`).
4. **Orders:** `GET /api/seller/orders` (distinct orders containing own products,
   each with own items only); `PUT /api/seller/orders/status`
   `{order_id, status}` — validates against
   `pending/confirmed/shipped/delivered/cancelled`, refuses changes to
   `delivered`/`cancelled`, requires at least one own item;
   `PUT /api/seller/orders/payment` `{order_id, payment_status ∈ paid/refunded}`
   (same own-item check, 403 otherwise; idempotent re-mark; appends history);
   `PUT /api/seller/orders/return` `{order_id}` approves a `requested` return
   (own-item check, 403 otherwise; non-requested → 400) → `approved` + per-line
   restock + `payment_status = 'refunded'` in one transaction.
5. **Reports/reviews:** `GET /api/seller/reports/sales?days=` (revenue/orders/AOV/
   customers/units + trend + category breakdown + top 10); `GET /api/seller/reviews?product_id=`
   (ownership-checked); dashboard adds low-stock count (threshold 30 units/product).

## 3. Admin journey (users → categories → orders → promos)

1. **Dashboard:** `GET /api/admin/dashboard` — user stats (total/active/sellers/
   customers/pending approvals), order count + revenue, product count, 5 recent orders.
2. **Users:** `GET /api/admin/users?search=&role=&status=` (LIKE filters, newest first);
   `POST /api/admin/users` (admin-created, min-8 password enforced here);
   `PUT /api/admin/users/:id` (role/status/name/brand); `DELETE /api/admin/users/:id`
   (soft delete; self-delete blocked with 400).
3. **Categories/sizes:** full CRUD at `/api/admin/categories[/:id]` and
   `/api/admin/sizes[/:id]`; deletes refuse in-use records (products → category,
   inventory → size) with 400.
4. **Reports/analytics:** `GET /api/admin/reports` (revenue excl. cancelled, 30-day
   trend, top-10 seller breakdown); `GET /api/analytics/stats` (older flat totals).
   `PUT /api/admin/orders/payment` `{order_id, payment_status ∈ paid/refunded}`
   (admin-only, any order; idempotent re-mark; appends history).
5. **Order visibility:** admins bypass owner checks on `orders/details` and
   `payment/history`; `payment_status` is visible in `orders/details` for
   owner, owning seller, and admin. Dedicated admin endpoints (API-first; the
   admin orders page is a frontend follow-up): `GET /api/admin/orders?search=&status=&page=&limit=`
   (paginated `{items, page, total_pages, total_items}`, search by id/email/name)
   and `GET /api/admin/orders/:id` (details shape + customer email).
6. **Promos:** full CRUD at `/api/admin/promo-codes[/:id]` (uppercase-normalized
   codes, percent ≤ 100, duplicate → 409; `used_count` server-managed, past
   orders keep `discount_amount` after delete). Seed voucher `WELCOME10`.

## 4. Auth journey

Register (`role` allowlisted to `customer`/`seller`; `admin` → 400; missing/short
password → 400; inactive-status accounts → 403) or login →
`bcrypt.compare` → `crypto.randomBytes(32)` hex token + 24h expiry row in `sessions` →
token returned in body → `AuthContext` stores in `localStorage` →
every `apiService.request` attaches `Authorization: Bearer`. `GET /api/auth/me`
validates; `POST /api/auth/logout` deletes the row and clears storage.
No cookies, no refresh, no server-side role issuance beyond the stored `users.role`.
