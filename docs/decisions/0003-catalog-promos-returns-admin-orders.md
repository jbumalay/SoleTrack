# ADR 0003 — Catalog Paging, Promos, Returns, Admin Orders

- Status: **Implemented** (2026-10-14; catalog paging, promo codes, returns flow,
  admin orders API — all merged to `develop`)
- Date: 2026-10-14
- Context: catalog filtering was client-side (API shipped every row), no
  discounts existed, the order lifecycle ended at `delivered`/`cancelled`, and
  admins could not see any order. Four backend items closed these gaps while
  keeping the existing frontend working unmodified.

## Decision

1. **Paged catalog, back-compat by trigger.** `GET /api/products` returns
   `{items, page, total_pages, total_items}` only when a catalog-mode param
   (`search`/`sort`/`page`) is sent; legacy `category`/`seller_id`/`limit`-only
   calls keep the bare-array shape. `search` matches name/description/brand via
   `LIKE`; `sort` is allowlisted (`newest|price_asc|price_desc|rating`); invalid
   `sort`/`page`/`limit` → 400. `GET /api/stores` pages the same way on
   `search`/`page`/`limit`. Client `normalizeList` accepts both shapes.
2. **Promos as checkout discounts.** `promo_codes` table (code, percent/fixed,
   min subtotal, expiry, usage limit/count, active flag) + `orders.promo_code_id`
   (no FK, so promos stay deletable) and `discount_amount`. Checkout validates
   the code under a `FOR UPDATE` lock, computes the discount, evaluates the
   free-shipping threshold on the **discounted** subtotal, and increments
   `used_count` once via a guarded `UPDATE` in the same transaction.
3. **Returns as lifecycle extension.** `delivered` → `requested` (customer-owned
   request) → `approved` (owning-seller approval, 403 otherwise; ownership
   checked before status errors). Approval restocks each line (same logic as
   cancel-restock) and appends `approved` (+ `refunded` payment + history row
   only when the order was `paid`, so unpaid/COD returns keep `unpaid`). Cancel
   (customer or seller) follows the same restock path and likewise refunds only
   when `paid`. No reject path (not requested; keeps the item revertible).
   Cancel and simulate/step-matching routes reject `requested`/`approved` orders.
4. **Admin orders API-first.** `GET /api/admin/orders` (paginated, search by
   id/email/name, exact `status`) and `GET /api/admin/orders/:id` (details
   shape + customer email), both `isAdmin`-only. The admin orders page itself
   is a frontend follow-up against this contract.

## Alternatives considered

- **Versioned catalog endpoints (`/api/v2/products`):** rejected — the
  trigger-based envelope preserves back-compat without a second route surface.
- **Shipping threshold on pre-discount subtotal:** rejected — discount-then-
  threshold matches shopper expectations (a discounted basket can lose free
  shipping) and is documented in `api-reference.md`.
- **Seller reject path for returns:** rejected for now — out of scope; can be
  added as `requested` → `delivered` without migration.
- **FK from `orders` to `promo_codes`:** rejected — hard-deleting a promo must
  stay possible; past orders keep `discount_amount` regardless.

## Consequences

- Frontend adopts paging incrementally via `normalizeList`; Dev B builds the
  admin orders page against the documented `{items, page, …}` contract.
- `orders.status` convention is now
  `pending/confirmed/shipped/delivered/cancelled/requested/approved`; any new
  step-matching reader must ignore non-lifecycle rows as simulate/cancel do.
- `used_count` is the only counter incremented inside a customer transaction;
  concurrent checkouts on the last use are serialized by the row lock plus the
  guarded increment.
