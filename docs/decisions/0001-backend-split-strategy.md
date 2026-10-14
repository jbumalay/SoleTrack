# ADR 0001 — Backend Split Strategy

- Status: **Implemented** (2026-10-13; was proposed, now done — no prior history fabricated)
- Date: 2026-10-13
- Context: `server.ts` is a 1615-line monolith containing DB bootstrap, DDL for
  12 tables, seed data (~230 lines), auth helpers, ~35 route handlers, role
  middleware, and Vite/static hosting. Every backend change touches the same file;
  testing any route requires booting the whole server + DB.

## Decision (proposed)

Split incrementally, **without behavior change**, in this order:

1. `server/db.ts` — pool creation + env reads + DDL + `seedData()` verbatim. ✅ done
   (`server/seed.ts` holds the seed; `server/config.ts` the env + constants).
2. `server/auth.ts` — `getAuthenticatedUser`, `isSeller`, `isAdmin`, token helpers. ✅ done
   (plus `requireAuth`).
3. `server/routes/{public,auth,cart,orders,seller,admin}.ts` — route groups,
   mounted in `server/app.ts` from a thin `server.ts` bootstrap (~19 lines). ✅ done.
4. Shared constants (`SHIPPING_*`, `LOW_STOCK_THRESHOLD`) in `server/config.ts`,
   kept in sync with `src/constants.ts`. ✅ done (status enums still ad-hoc strings).

Each step must keep `tsc --noEmit` green and preserve every route path/method/shape
documented in `../api-reference.md`.

## Alternatives considered

- **Full rewrite (separate backend repo/framework):** rejected — academic scope, working
  code, single-process deploy is a feature (XAMPP-friendly).
- **Leave as-is:** rejected — file size already blocks parallel work and review.

## Consequences

- Parallel ownership per domain; unit-testable handlers; smaller diffs.
- Slight import-plumbing overhead; must keep the `esbuild server.ts --bundle` build
  working (entry stays `server.ts`).
