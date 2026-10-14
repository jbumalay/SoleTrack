# Security Assessment

Statically verified against the current tree (no DB connections attempted; servers OFF).
Re-audited after the `server/` split + auth hardening + PWA cleanup — items marked
**Fixed** were verified in code; **Outstanding** items remain open by design choice or
as documented follow-ups. Nothing below invents runtime test results.

## Findings

| # | Severity | Finding | Evidence | Status |
|---|---|---|---|---|
| 1 | **High** | **Self-assigned role on register** — closed with an allowlist (`customer`/`seller` only; `admin` rejected with 400). Admin-created users still allow any role, but that route requires `isAdmin` | `server/routes/auth.ts` (allowlist + validation) | **Fixed** |
| 2 | **Medium** | **Missing-password crash** — guarded (`typeof password !== "string"` → 400 before any `.length`); login also returns 400 when email/password are absent instead of throwing inside `bcrypt.compare` | `server/routes/auth.ts` (login + register) | **Fixed** |
| 3 | **Medium** | **No rate limiting / brute-force protection** on login/register (no `express-rate-limit` or equivalent anywhere; single grep hit-free) | `server/routes/auth.ts`; no rate-limit dep in `package.json` | **Outstanding** |
| 4 | **Medium** | **Bearer tokens in `localStorage`** — XSS-reachable; no HttpOnly cookie option, no refresh rotation, 24h window | `src/services/api.ts`, `src/context/AuthContext.tsx` | **Outstanding** |
| 5 | **Medium** | **Open CORS** — removed the permissive `cors()` middleware; same-origin serving in both modes, cross-origin denied by default. `cors` dep still listed (prune separately) | `server/app.ts` (no cors import; justification comment) | **Fixed** |
| 6 | **Medium** | **Weak public seed credentials** — `admin123`/`seller123`/`customer123` documented in repo; any deployment with seed run is trivially compromised | `server/seed.ts`, `ACCOUNTS.md` (dev-only banner) | **Outstanding** (mitigated in docs only: dev-only banner) |
| 7 | **Low** | **`LIMIT ?` bound parameter** — eliminated: client `limit` is validated/clamped (`parseListLimit`, max 100) and inlined; invalid values → 400. Needs live-DB smoke test to confirm | `server/utils.ts`, `server/routes/public.ts` | **Fixed** (static; runtime verification pending XAMPP) |
| 8 | **Low** | **PWA `CacheFirst` staleness** — moved catalog APIs to `NetworkFirst` + 10s timeout (fresh data, cache fallback offline only) | `vite.config.ts` (runtimeCaching + comment) | **Fixed** |
| 9 | **Low** | **Missing security headers** — no `helmet`, no HSTS/CSP/frame-ancestors; SPA fallback + PWA widens clickjacking/SW scope considerations | `server/app.ts` (no helmet import), `package.json` (no helmet dep) | **Outstanding** |
| 10 | **Low** | **No input validation library** — free-form bodies validated ad hoc (register/login/cart/seller/admin coerce + range-check; ratings/statuses allowlisted) but there is still no shared schema layer; `orders.status`/`payment_status` unconstrained VARCHAR | `server/routes/*`; no zod/validator dep | **Outstanding** (partially mitigated) |
| 11 | **Info** | **`process.env.GEMINI_API_KEY` exposed to client bundle** — removed the dead `define` (grep confirms zero `GEMINI`/`import.meta.env` usage in `src/`) | `vite.config.ts` (define removed) | **Fixed** |

## Static secret / artifact sweep (read-only, values not printed)

- Grep for `GEMINI|api[_-]?key|secret|soletrack_token|DB_PASS|password`: hits are
  **code references only** (env reads, bcrypt fields, `localStorage` key, seed
  passwords already documented as weak). No private keys, no bearer tokens, no
  connection strings with credentials found.
- **No `.env` files exist** in the tree (only the new `.env.example` with placeholders)
  — nothing secret to have been committed.
- **Binaries/artifacts:** `public/*.png` (PWA icons + screenshots) are **keep** —
  required at runtime and explicitly not ignored. No `dist/`, no lockfile, no dumps,
  no logs found. `scripts/*.mjs` + `public/icon-source.svg` are the PWA asset sources.
- Seed PII is fictional demo data (Bicol-region names/addresses in `seedData`).

## Positive controls (verified)

- Passwords hashed with `bcryptjs` (cost 10) at seed, register, and admin-create;
  hashes never returned (`password_hash` destructured out on all auth reads).
- All SQL uses parameterized `?` placeholders — no string-interpolated values found
  (client `limit` is validated + inlined as an integer, never interpolated raw).
- Checkout uses a real transaction with row-guard decrement + rollback.
- Ownership checks on order details / seller order status / seller reviews;
  self-delete blocked for admins; in-use guards on category/size deletes.
- Registration role allowlist (`customer`/`seller`); seller APIs additionally gated on
  `status === 'active'`; every async handler wrapped so rejections return JSON.
