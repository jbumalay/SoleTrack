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
  db.ts                    # pool singleton + initDb DDL (12 tables)
  seed.ts                  # seedData (users, catalog, orders)
  auth.ts                  # getAuthenticatedUser + requireAuth/isSeller/isAdmin
  utils.ts                 # asyncHandler, error middleware, limit/days parsers
  app.ts                   # Express factory (routes + Vite/static + error handler)
  routes/                  # public, auth, cart, orders, seller, admin
src/
  App.tsx                  # route tree (public Layout branch, lazy /admin + /seller)
  main.tsx                 # React mount
  constants.ts / types.ts
  context/AuthContext.tsx  # login/register/logout/me, localStorage token
  services/api.ts          # fetch wrapper (Bearer header) + ~40 endpoint methods
  pages/                   # Home, Products, ProductDetail, Stores, StoreDetail,
                           # Cart, Checkout, About, Contact, Login, Register,
                           # Dashboards (customer), OrderTracking, NotFound,
                           # admin/* (Dashboard, Users, Reports, Categories),
                           # seller/* (Dashboard, Products, SellerOrders, Reports,
                           #           Reviews, StoreProfile, SellerLayout)
  components/              # Header, Footer, Layout, ProductCard, StoreCard, CancelModal,
                           # admin/AdminLayout, ui/* (shadcn-style; most @radix-ui unused)
  lib/
vite.config.ts             # Tailwind + React + PWA plugins, @ → src, manualChunks
index.html                 # #root + /src/main.tsx
public/                    # icon-source.svg, pwa-*.png, screenshot-*.png (KEEP — not ignored)
scripts/                   # generate-icons.mjs, generate-screenshots.mjs (PWA asset gen)
```

## Route tree (`src/App.tsx`)

- `/` under `<Layout>` (header/footer): `Home`, `Products`, `product/:id`,
  `Stores`, `store/:id`, `Cart`, `Checkout`, `About`, `Contact`, `Login`,
  `Register`, `Dashboard` (customer), `order-tracking/:id`.
- `/admin` under lazy `AdminLayout`: index `AdminDashboard`, `users`, `reports`,
  `categories`.
- `/seller` under lazy `SellerLayout`: index `Dashboard`, `products`, `orders`,
  `reports`, `reviews`, `profile`.

## Key backend modules (`server/`)

| File | Contents |
|---|---|
| `config.ts` | `PORT` (default 3000), DB env reads (`DB_HOST/PORT/USER/PASS/NAME`), business constants, `MAX_LIST_LIMIT`, `SESSION_TTL_MS` |
| `db.ts` | Pool singleton + DDL: 12 `CREATE TABLE IF NOT EXISTS` + idempotent `UNIQUE(product_id, user_id)` on `reviews` + expired-session purge |
| `seed.ts` | `seedData()`: 6 users, 4 categories, 8 sizes, 15 products, inventory, 10 reviews, 12 orders + history |
| `app.ts` | `createApp()`, `express.json()`, route registration, Vite-middleware (dev) vs `dist/` static + SPA fallback (prod); no permissive CORS |
| `auth.ts` | `getAuthenticatedUser` + `requireAuth`/`isSeller`/`isAdmin` middleware |
| `routes/public.ts` | Health, products (validated/inlined LIMIT), categories, sizes, stores |
| `routes/auth.ts` | Login/register/me/logout (role allowlist, email+password validation) |
| `routes/cart.ts` | Cart ×4 + checkout transaction |
| `routes/orders.ts` | orders/my, orders/details, verified one-per-user reviews, simulate, restocking cancel, payment/history |
| `routes/seller.ts` | Seller dashboard, products CRUD, reports, reviews, orders + payment confirmation, profile |
| `routes/admin.ts` | Analytics + admin dashboard, users, reports, categories, sizes, order payment confirmation |
| `server.ts` | Thin bootstrap only (~19 lines) |

## Frontend ↔ backend contract

`src/services/api.ts` is the single client: `API_BASE_URL = "/api"`, same-origin
fetch, `Authorization: Bearer <soletrack_token>` from `localStorage`, JSON-only
handling (non-JSON → generic error). Every method maps 1:1 to a server route —
see `api-reference.md`. No pagination, no retry, no refresh logic.
