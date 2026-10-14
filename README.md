# SoleTrack — Bicol Heritage Footwear Marketplace

Academic e-commerce marketplace for Filipino / Bicol artisan footwear.
Single-repo app: **Express + MySQL** backend (thin `server.ts` bootstrap plus
`server/` modules: config, db, seed, auth, routes, app factory) serving a
**React 19 + React Router + Tailwind + PWA** frontend from the same process
(Vite middleware in dev, `dist/` static in production).

## Tech stack

| Layer | Tech |
|---|---|
| Backend | Express 4, mysql2/promise, bcryptjs, dotenv |
| Frontend | React 19, react-router 7, Tailwind 4, sonner, recharts, motion, lucide-react |
| Build | Vite 6, esbuild (server bundle to `dist/server.cjs`), tsx (dev) |
| PWA | vite-plugin-pwa (autoUpdate, NetworkFirst for catalog APIs) |
| DB | MySQL / MariaDB (XAMPP-compatible), database `soletrack_node` |

## Prerequisites

- **Node.js 20+**
- **MySQL or XAMPP/MariaDB** — app defaults to `127.0.0.1:3308`, database
  `soletrack_node`, user `root`, empty password. **XAMPP defaults to port 3306**,
  so for XAMPP set `DB_PORT=3306` in your `.env`.
- Servers are **off** by default in this workspace — start MySQL before `npm run dev`.

## Quick start

```powershell
Copy-Item .env.example .env   # then edit DB_PORT etc. as needed
npm install                   # installs deps + verifies package-lock.json
npm run dev                   # tsx server.ts → bootstraps DB, seeds data, serves on :3000
```

Open http://localhost:3000. First run creates the database, all 12 tables, and
seed data (users, categories, sizes, products, inventory, reviews, orders).

```powershell
npm run build    # vite build + esbuild server bundle → dist/
npm start        # node dist/server.cjs  (reads NODE_ENV itself; set NODE_ENV=production for static mode)
npm run lint     # tsc --noEmit (requires the committed tsconfig.json)
npm run clean    # cross-platform dist removal
```

## Seed accounts (DEV-ONLY)

> ⚠️ **Weak, publicly documented passwords — local development only.**
> Change before any shared/staged/public deployment. Full table: [`ACCOUNTS.md`](ACCOUNTS.md).

| Role | Email | Password | Routes |
|---|---|---|---|
| Admin | `admin@soletrack.com` | `admin123` | `/admin` (dashboard, users, reports, categories) |
| Seller | `bicolartisan@soletrack.com` (+3 more) | `seller123` | `/seller` (dashboard, products, orders, reports, reviews) |
| Customer | `juan.delacruz@example.com` | `customer123` | `/` (browse, cart, checkout), `/dashboard` |

Seller registrations get `status = pending_approval` and must be activated by an
admin before the seller middleware (`isSeller` requires `status === 'active'`)
grants access.

## Scripts

| Script | Command | Notes |
|---|---|---|
| `dev` | `tsx server.ts` | Dev server + Vite middleware on :3000 |
| `build` | `vite build && esbuild …` | Frontend to `dist/` + server bundle to `dist/server.cjs` |
| `start` | `node dist/server.cjs` | Cross-platform; `NODE_ENV=production` switches to static serving |
| `clean` | `node -e fs.rmSync…` | Cross-platform (old `rm -rf` broke Windows) |
| `lint` | `tsc --noEmit` | Fixed by adding `tsconfig.json` (was broken: no config file) |

## Project structure

```text
server.ts            # Thin bootstrap (initDb + seed + createApp + listen)
server/
  config.ts          # PORT/DB_* env + business constants
  db.ts / seed.ts    # pool + DDL (12 tables) / seed data
  auth.ts            # getAuthenticatedUser + requireAuth/isSeller/isAdmin
  app.ts             # Express factory (routes + Vite/static + error handler)
  routes/            # public, auth, cart, orders, seller, admin
src/
  main.tsx           # React entry (StrictMode → App)
  App.tsx            # Routes: / (Layout branch), /admin (lazy), /seller (lazy)
  context/AuthContext.tsx  # Bearer-token auth, localStorage "soletrack_token"
  services/api.ts    # fetch wrapper + endpoint methods (mirrors server routes)
  pages/ components/ lib/
scripts/             # generate-icons.mjs, generate-screenshots.mjs (PWA assets; do not edit per scope)
public/              # PWA icons + screenshots (keep *.png — NOT gitignored)
docs/                # architecture, flows, API, data model, security, setup, roadmap, ADRs
ACCOUNTS.md          # seed account table (dev-only banner)
.env.example         # placeholder env template (no secrets)
```

Docs index: [`docs/architecture.md`](docs/architecture.md) ·
[`docs/codebase-guide.md`](docs/codebase-guide.md) ·
[`docs/application-flows.md`](docs/application-flows.md) ·
[`docs/api-reference.md`](docs/api-reference.md) ·
[`docs/data-model.md`](docs/data-model.md) ·
[`docs/security-assessment.md`](docs/security-assessment.md) ·
[`docs/development-setup.md`](docs/development-setup.md) ·
[`docs/modernization-roadmap.md`](docs/modernization-roadmap.md)

## Troubleshooting

- **DB connection refused** — MySQL/MariaDB is off (verified: XAMPP binaries
  exist but servers are OFF). Start it, then check `DB_HOST`/`DB_PORT`/
  `DB_USER`/`DB_PASS`/`DB_NAME`. Remember XAMPP = port **3306**, app default = **3308**.
- **Port 3000 in use** — set `PORT` in `.env` or stop the other process
  (`server/config.ts` reads `PORT`, default 3000).
- **`npm run lint` failed / "no tsconfig"** — fixed: `tsconfig.json` is now committed
  (strict, `moduleResolution: bundler`, `jsx: react-jsx`, `@/*` → `src/*`).
- **`npm run clean` fails on Windows** — fixed: now uses `node -e fs.rmSync`.
- **`npm start` fails on non-Windows** — fixed: plain `node dist/server.cjs`
  (old `set NODE_ENV=production&&` was Windows-only; server reads `NODE_ENV` itself).
- **Lockfile** — `package-lock.json` is committed; `npm ci` for reproducible installs.
- **No git repo / no LICENSE** — intentional manual steps (see below);
  do not assume a license — owner must choose one.
