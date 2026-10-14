# Modernization Roadmap

Prioritized by risk/effort. Items marked ✅ were completed in this cleanup pass;
the rest are proposals. Nothing in P1–P3 is started unless marked.

## P0 — security (do first)

1. ✅ **Closed register role escalation** — allowlist `role` to `customer`/`seller`; `admin` rejected (`server/routes/auth.ts`).
2. ✅ **Guarded missing password** — 400 before any `.length` on register and login (`server/routes/auth.ts`).
3. **Add rate limiting** on `/api/auth/*` (e.g. `express-rate-limit`; no new deps installed yet).
4. **Move tokens to HttpOnly cookies** (+ CSRF protection, short access + rotating refresh);
   remove `localStorage` bearer pattern (`api.ts`, `AuthContext.tsx`).
5. ✅/⬜ **CORS locked** (permissive middleware removed); **helmet headers still missing** (HSTS/CSP/frame-ancestors).

## P1 — reliability & correctness

6. ✅ **Split the backend monolith** — `server.ts` (1615 lines) → `server/` modules
   (config, db, seed, auth, utils, app, routes/*); see `decisions/0001-backend-split-strategy.md`.
7. **Input validation** (zod or equivalent) on all write routes; constrain
   `orders.status`/`payment_status` (ENUM or check constraint + shared constants).
8. ✅ **Fixed `LIMIT ?` binding** — validated/clamped + inlined (`server/utils.ts`, `server/routes/public.ts`); live-DB smoke test still pending (XAMPP).
9. **Cart upsert race** — unique `(user_id, product_id, size_id)` + `ON DUPLICATE KEY`
   instead of read-then-write.
10. **Pagination** on all list endpoints (products, orders, admin users, reports).

## P2 — hygiene & DX

11. **Dependency pruning** — ~24 unused `@radix-ui/*` (only `react-slot` imported), plus `cmdk`/`vaul`/`embla-carousel-react`/`date-fns` with zero `src/` imports; dedupe the double `vite` entry (deps + devDeps); drop `cors` (no longer imported). Remove only after a clean `vite build` + `tsc` with them gone.
12. **Tests** — none exist. Start with checkout-transaction + auth-gate integration tests
   (needs a test DB + harness; currently zero infra).
13. **CI** — lint + build + tests on push (no workflow exists; no git repo yet).
14. ✅ **PWA caching** — catalog APIs moved to `NetworkFirst` + 10s timeout; dead `GEMINI_API_KEY` client define removed (`vite.config.ts`).
15. ✅ **`PORT` env support** — `server/config.ts` reads `process.env.PORT` (default 3000).

## P3 — polish

16. ✅ Structured error logging (token-prefix debug lines removed; error middleware logs messages only).
17. Replace `SELECT *` + N+1 loops (seller orders, `orders/my`) with joins/batched queries.
18. Reporting `DOUBLE` casts → decimal-safe handling if real money is involved.
19. Soft-delete cascade policy (user delete leaves orphan orders/cart rows by design — document).

## Deliberately omitted docs

No `testing.md` (no tests exist — would be fiction), no `deployment.md` (no target
env defined; `start` + `NODE_ENV=production` covered in setup), no `contributing.md`
(no repo/discussion norms yet). Add when the underlying reality exists.
