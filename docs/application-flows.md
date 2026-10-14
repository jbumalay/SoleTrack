# Application Flows

## 1. Browse → cart → checkout (customer)

1. **Browse:** `Home`/`Products` call `getProducts({category?, limit?, seller_id?})`
   → `GET /api/products`; `ProductDetail` calls `getProduct(id)` → `GET /api/products?id=`
   (detail payload includes `reviews[]` + `inventory[]` with `size_value`).
2. **Stores:** `Stores` → `GET /api/stores`; `StoreDetail` → `GET /api/stores/:id`
   (profile + active products with stock/rating aggregates).
3. **Cart:** requires login. `addToCart` → `POST /api/cart/add`
   `{product_id, quantity, size_id}` (upserts on user+product+size match);
   `Cart` page → `GET /api/cart` (items joined with price/image + per-size stock);
   update/remove via `PUT /api/cart/update?id=` / `DELETE /api/cart/remove?id=`.
4. **Checkout:** `Checkout` → `POST /api/checkout` `{shipping_address, payment_method}`.
   Server in one transaction: verifies cart non-empty → checks each line's inventory →
   computes `subtotal`, free shipping over ₱500 else ₱50 fee → inserts order (status
   `pending`) + history + items → decrements inventory (guarded `stock_quantity >= ?`)
   → clears cart. Returns `{order_id, subtotal, shipping, total}`.
5. **Track:** `getMyOrders` → `GET /api/orders/my` (each order carries up to 3 preview
   items); `getOrderDetails` → `GET /api/orders/details?id=` (items + status history).
   Customer can `cancelOrder` (`PUT /api/orders/cancel?id=`) only while
   `pending`/`confirmed`; `simulateOrderProgress` (`POST /api/orders/simulate?id=`)
   advances `pending → confirmed → shipped → delivered` (demo helper, owner-scoped).
6. **Review:** `POST /api/reviews` `{product_id, rating 1–5, comment}`; display name
   derived from `first_name/last_name` or username.

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
   `delivered`/`cancelled`, requires at least one own item.
5. **Reports/reviews:** `GET /api/seller/reports/sales?days=` (revenue/orders/AOV/
   customers/units + trend + category breakdown + top 10); `GET /api/seller/reviews?product_id=`
   (ownership-checked); dashboard adds low-stock count (threshold 30 units/product).

## 3. Admin journey (users → categories)

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
5. **Order visibility:** admins bypass owner checks on `orders/details` and
   `payment/history`.

## 4. Auth journey

Register (any role string accepted — see security note) or login →
`bcrypt.compare` → `crypto.randomBytes(32)` hex token + 24h expiry row in `sessions` →
token returned in body → `AuthContext` stores in `localStorage` →
every `apiService.request` attaches `Authorization: Bearer`. `GET /api/auth/me`
validates; `POST /api/auth/logout` deletes the row and clears storage.
No cookies, no refresh, no server-side role issuance beyond the stored `users.role`.
