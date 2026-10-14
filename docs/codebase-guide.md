# Codebase Guide

## Entry points

| Entry | File | Purpose |
|---|---|---|
| Backend | `server.ts` (thin bootstrap) + `server/` modules | Express app, DDL bootstrap, seed, all `/api/*` routes, Vite/static hosting, `listen(PORT)` |
| Frontend | `src/main.tsx` | `StrictMode` → `App`, imports `index.css` |
| Routes | `src/App.tsx` | `BrowserRouter` + three branches (see below) |

## Directory map

```text
server.ts                  # thin bootstrap (initDb + seed + createApp + listen)
server/
  config.ts                # PORT/DB_* env + business constants
  db.ts                    # pool singleton + initDb DDL (13 tables)
  seed.ts                  # seedData (users, catalog, orders, WELCOME10 voucher)
  auth.ts                  # getAuthenticatedUser + requireAuth/isSeller/isAdmin
  utils.ts                 # asyncHandler, error middleware, limit/page/days parsers
  app.ts                   # Express factory (routes + Vite/static + error handler)
  routes/                  # public, auth, cart, orders, seller, admin
src/
  App.tsx                  # route tree (public Layout branch, lazy /admin + /seller)
  main.tsx                 # React mount
  constants.ts / types.ts
  context/AuthContext.tsx  # login/register/logout/me, localStorage token
  services/api.ts          # fetch wrapper (Bearer header, omitted when logged out) + ~55 endpoint methods
  pages/                   # Home, Products, ProductDetail, Stores, StoreDetail,
                           # Cart, Checkout, About, Contact, Login, Register,
                           # Dashboards (customer), OrderTracking, Account,
                           # Invoice, Wishlist, NotFound,
                           # admin/* (Dashboard, Users, Orders, Promos, Reports,
                           #           Categories),
                           # seller/* (Dashboard, Products, SellerOrders, Reports,
                           #           Reviews, StoreProfile, SellerLayout)
  components/              # Header, Footer, Layout, ProductCard, StoreCard, CancelModal,
                           # AddressBook, ImagePicker, NotificationBell,
                           # admin/AdminLayout, ui/* (shadcn-style; most @radix-ui unused)
  utils/                   # normalizeList, wishlist, guestCart, addresses,
                           # reviewReplies, notifications
  lib/
vite.config.ts             # Tailwind + React + PWA plugins, @ → src, manualChunks
index.html                 # #root + /src/main.tsx
public/                    # icon-source.svg, pwa-*.png, screenshot-*.png (KEEP — not ignored),
                           # uploads/ (runtime product images from POST /api/seller/uploads)
scripts/                   # generate-icons.mjs, generate-screenshots.mjs (PWA asset gen)
```

## Route tree (`src/App.tsx`)

- `/` under `<Layout>` (header/footer): `Home`, `Products`, `product/:id`,
  `Stores`, `store/:id`, `Wishlist`, `Cart`, `Checkout`, `About`, `Contact`,
  `Login`, `Register`, `Dashboard` (customer), `account`, `invoice/:id`,
  `order-tracking/:id`.
- `/admin` under lazy `AdminLayout`: index `AdminDashboard`, `users`, `orders`,
  `promos`, `reports`, `categories`.
- `/seller` under lazy `SellerLayout`: index `Dashboard`, `products`, `orders`,
  `reports`, `reviews`, `profile`.

## Key backend modules (`server/`)

| File | Contents |
|---|---|
| `config.ts` | `PORT` (default 3000), DB env reads (`DB_HOST/PORT/USER/PASS/NAME`), business constants, `MAX_LIST_LIMIT`, `SESSION_TTL_MS` |
| `db.ts` | Pool singleton + DDL: 13 `CREATE TABLE IF NOT EXISTS` (+ idempotent `orders.promo_code_id`/`discount_amount` columns, no FK) + idempotent `UNIQUE(product_id, user_id)` on `reviews` + expired-session purge |
| `seed.ts` | `seedData()`: 6 users, 4 categories, 8 sizes, 15 products, inventory, 10 reviews, 12 orders + history, `WELCOME10` promo |
| `app.ts` | `createApp()`, `express.json()`, route registration, Vite-middleware (dev) vs `dist/` static + SPA fallback (prod); no permissive CORS |
| `auth.ts` | `getAuthenticatedUser` + `requireAuth`/`isSeller`/`isAdmin` middleware |
| `routes/public.ts` | Health, products (search/sort/pagination with back-compat bare array), categories, sizes, stores (search/pagination) |
| `routes/auth.ts` | Login/register/me/logout (role allowlist, email+password validation) + self-service profile edit + password change |
| `routes/cart.ts` | Cart ×4 + checkout transaction (optional promo discount, shipping on discounted subtotal) |
| `routes/orders.ts` | orders/my, orders/details (+discount/promo), verified one-per-user reviews, simulate, restocking cancel, return requests, payment/history |
| `routes/seller.ts` | Image upload (base64 → `public/uploads`), seller dashboard, products CRUD, reports, reviews, orders + payment confirmation + return approvals, profile |
| `routes/admin.ts` | Analytics + admin dashboard, users, reports, categories, sizes, order payment confirmation, orders list/detail, promo CRUD |
| `server.ts` | Thin bootstrap only (~19 lines) |

## Frontend ↔ backend contract

`src/services/api.ts` is the single client: `API_BASE_URL = "/api"`, same-origin
fetch, `Authorization: Bearer <soletrack_token>` from `localStorage` (omitted
when logged out), JSON-only handling (non-JSON → generic error). Methods cover
the main flows (catalog, cart/checkout incl. `promo_code`, orders incl.
`requestReturn`, seller status/payment/return, admin users/orders/promos) —
see `api-reference.md` for the full server surface. Paginated endpoints return
`{items, page, total_pages, total_items}`, normalized client-side by
`normalizeList` (which also accepts bare arrays); no retry, no refresh logic.
