# Current revision — 13 October 2026

See [review/REVIEW_HANDOVER.md](review/REVIEW_HANDOVER.md) and review/VERIFICATION.json for current results. Unit/domain tests passed; Next production build and HTTP/browser journeys for this revision remain **unverified**, blocked by automatic review of unknown Visual Studio telemetry. The prior results below are historical and MUST NOT be used as evidence for this revision.

# QA and handover

Checked on 12–13 October 2026 against local PostgreSQL, installed Google Chrome and Next.js 16.3.8. Sales data was not used for test purchases: API, admin and checkout writes ran against the separate `chapa_tronix_test` database.

## Passed

| Check | Evidence |
| --- | --- |
| TypeScript | `npm run typecheck`; full Next production build also completed its TypeScript stage |
| Production | Complete compilation, page generation and trace collection passed in `.next-verified`; production server/browser smoke also passed |
| Static visual preview | `npm run preview:build` passed |
| Unit tests | 22 tests: totals, cart/variants, discount rounding, auth validation, status transitions, CSV safety, idea consent, uploads, request origins, ngrok and configured webhook signature modes |
| Commerce/security API | 31 checks: sign-in, session cookie, role/origin enforcement, server prices, stock deduction, order idempotency, concurrent last-unit checkout, cancellation, product CRUD, chat ownership and unsigned webhook rejection |
| Additional business operations | 30 checks: discount validation, variants, coupon calculation/release, tracking updates, reservation expiry/restock once, email deduplication, password reset/revocation, email verification and newsletter consent/unsubscribe |
| Customer browser journey | Mobile registration, gallery thumbnails and zoom/Escape, discounted cart, account autofill, pickup, order confirmation, account history and clearing the cart |
| Admin browser | 12 modules at 360px and 1440px: no API/runtime errors or page overflow |
| Responsive storefront | 40 combinations: 10 routes at 360, 390, 768 and 1440px; no page overflow or client runtime errors |
| Cart interaction | Two selected products retain the orange state; second click removes the chosen item; reload preserves the remaining item |
| Mobile menu | Toggle, outside tap, right edge swipe, left swipe, vertical scrolling, category/navigation links, language switch and native toggle with script execution disabled |
| Product visibility | Newly saved products immediately appear in admin, catalog and home; newest ordering and prices above TZS 300,000 tested |
| Photographs and discount form | Uploaded image preview, persisted URL, public WebP and product image load; 25% discount stored correctly; fake upload rejected; no Arduino default |
| Worker | One local maintenance batch completed; without email credentials messages remained queued |
| Backup | PostgreSQL archive created; `pg_restore --list` verified 121 readable archive entries |
| Production endpoints | Health, sitemap, robots, product/category pages and clean credential-query redirects checked |

Screenshots and machine-readable browser results are internal test outputs under `test-results/`; they are excluded from Git and delivery. The code contains a Linux CI workflow for units, types, Next and preview builds. That remote CI workflow has not been executed from this local workspace.

## Fixes made during review

- Replaced default image behavior with controlled upload/preview/save and real image decoding.
- Refreshed database catalog after admin changes; removed the default price ceiling that hid expensive new products.
- Added regular price, discount percentage and effective selling price to product and variant editors.
- Corrected variant prices/names in cart, order totals and stock movements.
- Corrected filtered-cart item indices and stale/unavailable cart handling.
- Kept removal available even when a cart product subsequently becomes out of stock.
- Added native mobile menu behavior, outside dismissal, swipe and keyboard focus handling; separated mobile measurements from desktop.
- Added address selection, pickup instructions, order tracking updates and clearer customer confirmation/status copy.
- Added one-time reset/verification, email queue leases/deduplication/retry and unpaid reservation expiry.
- Corrected newsletter unsubscribe persistence and admin request races.
- Added category cycle validation, active variants and product restore; preserved category edits during seed.
- Used the appropriate configured Flutterwave v3/v4 signature scheme rather than accepting incompatible schemes together.
- Improved localized validation, purchase-button contrast, reduced motion, real metadata/sitemap and product breadcrumbs.
- Corrected six-month revenue to aggregate the full period instead of deriving it from only 100 recent orders.
- Removed credentials from account query URLs, retained POST-only forms and kept generated clients, uploads, credentials and backups out of Git/Docker build context.

## Launch items requiring the business owner

| Item | Where / what is needed |
| --- | --- |
| Actual contact and pickup details | Admin → Business settings: phone, WhatsApp, email, directions and hours |
| Selling information | Approve actual prices, available stock, descriptions and image rights |
| Delivery/tax decisions | Real delivery fees/coverage, COD availability, pickup and tax note |
| Commercial policies | Complete/review the four policy texts and approve them; draft placeholders are not approved legal advice |
| Merchant payments | Approved merchant account, sandbox/live credentials, supported networks and final webhook URL; real sandbox transaction/reconciliation |
| Email | Verified sender and provider key; verify inbox delivery and reset/verification links on the final HTTPS domain |
| Hosting | Domain, HTTPS hosting, persistent database/images, worker process, backup retention and monitoring |

Production checkout is gated on the owner's price/stock, delivery and policy approval flags. It does not become a live merchant store merely because it compiles.

## Verification limits

- No active public ngrok tunnel or physical phone was available; mobile tests used Chrome touch emulation and local HTTPS asset interception.
- Live payment/email delivery and refunds could not be exercised without the owner's provider accounts.
- Docker/Linux commands and CI are supplied; the Docker image and remote workflow were not executed locally.
- Keyboard, labels, images, focus, responsive layout and contrast improvements were checked, but there is no claim of a formal WCAG audit.
- Lighthouse was not installed in the available runtime; no 90+ score is claimed. Measure the final HTTPS deployment with the configured providers and production data.
- The backup archive was verified readable; no destructive restore over the selling database was performed.

See `DEPLOYMENT.md` for complete startup, ngrok and deployment commands.
