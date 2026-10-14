# SoleTrack — Test Accounts

> ⚠️ **DEV-ONLY — DO NOT USE IN PRODUCTION.** All passwords below are weak,
> publicly documented seed credentials (`admin123` / `seller123` / `customer123`).
> Change or remove them before any shared, staged, or public deployment.

| Role | Username | Email | Password |
|------|----------|-------|----------|
| **Admin** | `admin` | admin@soletrack.com | `admin123` |
| **Seller** | `bicolartisan` | bicolartisan@soletrack.com | `seller123` |
| **Seller** | `abacaheritage` | abacaheritage@soletrack.com | `seller123` |
| **Seller** | `mayonfootwear` | mayonfootwear@soletrack.com | `seller123` |
| **Seller** | `bicolandiaweaves` | bicolandiaweaves@soletrack.com | `seller123` |
| **Customer** | `juandelacruz` | juan.delacruz@example.com | `customer123` |

## Notes

- All passwords are plaintext — the app hashes them with bcrypt on seed.
- **Admin** routes: `/admin` (dashboard, users, reports, categories)
- **Seller** routes: `/seller` (dashboard, products, orders, reports, reviews)
- **Customer** routes: `/` (browse, cart, checkout), `/dashboard`
- Seeded automatically on first `npm run dev` — safe to re-run.
