# ADR 0002 — Auth Hardening

- Status: **Partially implemented** (2026-10-13; items 1, 4a, 5 done — cookies/rate-limit/helmet remain open)
- Date: 2026-10-13
- Context: Auth today is DB-backed opaque Bearer tokens (`sessions` table, 24h TTL)
  stored in `localStorage`, issued at login **and** at register — where the client
  supplied its own `role` (allowing self-admin). No rate limiting,
  open CORS, no security headers. See `../security-assessment.md` findings 1–5, 9–10.

## Decision (partially implemented 2026-10-13)

1. ✅ **Allowlist register roles** to `customer`/`seller` (sellers land in
   `pending_approval`, blocked from seller APIs by `isSeller` until activated);
   `admin` rejected with 400. Admin creation stays admin-only via `/api/admin/users`.
2. ⬜ **HttpOnly, SameSite cookies** — NOT done (still `localStorage` Bearer; see roadmap item 4).
3. ⬜ **Rate-limit** `/api/auth/login` and `/api/auth/register` — NOT done (roadmap item 3).
4. ✅/⬜ **CORS removed** (same-origin serving; cross-origin denied by default) — done;
   **`helmet` NOT done** (roadmap item 5).
5. ✅ **Auth input validation** (email format/length, password ≥ 8 with missing-guard,
   name/brand length caps) — done in `server/routes/auth.ts`.

## Alternatives considered

- **JWT stateless:** rejected for now — stateful sessions already support instant
  revocation (logout/deletes); JWT would add revocation infra for no academic benefit.
- **OAuth/SSO:** out of scope for a classroom XAMPP deployment.

## Consequences

- Frontend `apiService`/`AuthContext` switch from `localStorage` Bearer to
  `credentials: "include"` cookies — touches every authed call, but the envelope stays.
- Existing tokens invalid on rollout (acceptable: dev-stage app, 24h TTL anyway).
- New deps (`helmet`, rate-limiter, CSRF) need installing — currently **not** installed
  per scope constraints.
