# chapa tronix

> Source for the Chapa Tronix storefront. Historical audit reports are under `review/`; their dated results are not a current deployment status. Never run seed/reset commands against an existing business database. Keep its `.env`, uploads and backups outside Git.

A mechatronics store for Tanzania, using English by default with optional Swahili, built with Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL and Prisma. Identity: orange and graphite, locally served Inter and Space Grotesk, Lucide icons, and the tagline **Where Intelligence Meets Mechanics**.

## Current storefront

- Compact mobile product cards and automatic category carousel.
- Login and account registration open in a glass popup and inherit the selected storefront language.
- Learning Hub includes an automatic 3D robotics animation.
- Cash on delivery or pickup only. Orders enter `PENDING` for store confirmation; stock is reserved on the server.
- To explicitly accept pending cash orders, set `SELLING_MODE=live`, `CASH_ONLY=true` and `CASH_ORDERS_OPEN=true`. This does not mark unfinished tax, delivery or policy settings as approved.
- PostgreSQL data, customer records, `.env`, uploaded images, credentials and build outputs are not committed. Configure them separately on each installation.

## Run the working store

On this Windows machine, from this project directory:

```powershell
npm run local:setup
npm run local
```

Open http://localhost:5186. Sign in at `/account` and open `/admin`. Local administrator credentials are recorded privately in `.env`. Setup preserves existing products, prices, photographs, stock and credentials. PostgreSQL uses a separate local cluster on port 55437; the isolated test database is not the selling database.

For a fresh installation run `npm ci` first. See [DEPLOYMENT.md](DEPLOYMENT.md) for ngrok, a regular Node server, Docker, email, payments, backups and the owner's launch settings.

### Serve the Cloudflare domain from this PC

Set `PUBLIC_SITE_URL` in `.env` to the exact HTTPS origin (currently `https://chapatronix.store`). The local launcher preserves this public origin for scripts, authentication and account email links while trusting the loopback server. Do not put paths or credentials in this value.

Build after changing the website with `npm.cmd run production:build`. Stop the existing `npm.cmd run local` terminal with Ctrl+C, then run `npm.cmd run production` from this directory. The production server uses port 5186 and the existing business database, so the Cloudflare tunnel route stays the same. Keep that terminal and the PC running. The production launcher uses the latest successful build recorded locally; confirm a successful full build before switching from the existing server.

The latest October 18 compact-storefront update passed TypeScript checking, 69 unit tests and 34 isolated integration checks. Guest HOME/catalog browsing returns 200; anonymous account/admin APIs remain 401. Browser checks passed HOME, catalog, Learning Hub and cart at widths 360, 390, 768 and 1440 with no horizontal overflow, aligned three-column mobile footer, retained cart and checkout sign-in handoff. A separate signup-return browser check and the final production-build verification were blocked by automatic approval review after an external Application Insights connection with unverified payload was detected. The build compiled and completed type checking/static generation before that final verification was blocked; a completed deployable build is not claimed. External Cloudflare access and replacement of the owner's existing development process remain unverified. Real payment processing was not enabled by this visual update.

## Implemented modules

| Module | Behavior |
| --- | --- |
| Storefront | Featured parts, new arrivals, project collections, real best sellers from paid order history, verified/moderated reviews, learning guides and newsletter signup |
| Navigation | Category-aware search and autocomplete, native category disclosure, mobile drawer with outside-tap dismissal and horizontal swipe; independent mobile layout |
| Catalog | Database categories/subcategories, keyword/brand/stock/price/voltage/interface filters, sorting and pagination; newly saved products refresh without reload |
| Product | Working gallery thumbnails and keyboard-dismissable zoom, SKU/specifications, manufacturer datasheets, availability, variants, approved reviews and related/frequently purchased parts |
| Cart | Device persistence; each product's orange plus button reflects membership and a second click removes it; correct variant names, prices and quantities |
| Checkout | Server prices, configurable regional delivery/pickup, coupons, saved addresses, stock checks, serializable transactions, retry-safe order keys and confirmation |
| Payments | Hosted Flutterwave card/Tanzanian mobile-money adapter, configured signature scheme, transaction re-verification, duplicate protection and late-payment audit |
| Accounts | Email/phone sign-in, bcrypt, revocable HttpOnly sessions, profile, addresses, order history/tracking, synchronized wishlist, one-time password reset and email verification |
| Admin | Product CRUD/archive/restore, photographs, discount controls, variants, category hierarchy, CSV import, stock ledger, orders/tracking, roles, customers, coupon upsert/disable, review moderation, quotes, ideas and activity logs |
| Business settings | Official contact details, delivery fees, pickup/COD, tax note, optional USD estimates, editable policies and owner approval flags |
| Communications | Stored buyer/seller conversations, institutional quotes, project ideas, opt-in newsletter/unsubscribe, queued order and account email, retryable email jobs |
| Operations | Worker expires unpaid online reservations and returns stock/coupon usage once; cleans expired sessions/tokens/rate counters; health endpoint and database backup helper |
| SEO/security | Database product metadata and sitemap, canonicals, Product/Organization/Breadcrumb JSON-LD, private-page noindex, nonce CSP, secure headers, origin checks, rate limits, size limits and server authorization |

Credentials and the business's real commercial decisions are still required for live merchant operations. No live payment, refund or email delivery is claimed without those providers. The prototype policy text and sample catalog values are not automatically approved for selling.

## Discount and inventory

Admin → Products → Add/Edit product has **Regular price (TZS)**, **Discount (%)** and a selling-price preview. A discount stores the effective selling price and the original price; entering 0 removes the crossed-out price. Variants have their own price, discount and stock. Checkout ignores browser-supplied prices. Cancellation and reservation expiry restore the matching product or variant once and release coupon usage.

Stock adjustments are recorded in InventoryMovement. Refund payment transfer is handled through the gateway; stock from physical returns is adjusted after inspection instead of assuming every refund means a sellable item came back.

CSV adds new products transactionally. Columns: `id,slug,name,sku,price,stock,categoryId,brand,voltage,interface,description,descriptionEn,images,compatibility`; optional `discountPercent,datasheet,projectTags`. In CSV, price is the regular price; discountPercent computes the selling price. Separate several image paths or project tags with `|`; use quoted fields for commas. Duplicate IDs roll back the batch. Variant management is inside each product editor.

## Design system and mobile

| Token | Definition |
| --- | --- |
| Primary | Graphite green `#172e2e` |
| Identity accent | Orange `#f96734` |
| Purchase button | Darker orange `#bf4219`, readable white text |
| Text / muted | `#1b292b` / `#64706f` |
| Surface / border | `#f4f6f3` / `#e1e6e2` |
| Type | Space Grotesk headings; Inter body; local WOFF2 files |
| Spacing | 4, 8, 16, 24, 32, 48, 64px |
| Corners | 6–12px, shared CSS tokens |

Shared styles live in `app/globals.css` and `app/storefront.css`. `app/mobile.css` owns layout dimensions at widths up to 767px, including search, product grids, checkout, admin tables and safe-area bottom navigation. The catalog/account/cart data are shared, while desktop and mobile presentation can be adjusted separately. Reduced-motion preferences are respected.

## Site map

Customer: `/`, `/shop`, `/category/:id`, `/product/:slug`, `/cart`, `/checkout`, `/account`, `/wishlist`, `/reset-password`, `/verify-email`, `/quote`, `/chat`, `/ideas`, `/learn`, `/learn/:slug`, `/about`, `/contact`, `/faq`, `/privacy`, `/terms`, `/returns`, `/shipping`, `/unsubscribe`.

Staff: `/admin`, with role-filtered modules and independent server authorization. Account and order responses are never publicly listed.

## Database

`prisma/schema.prisma` is authoritative. Seven deployment migrations are included.

| Models | Purpose |
| --- | --- |
| User, Session, Address, VerificationToken | Roles, hashed passwords/sessions, saved addresses, expiring one-time recovery/verification links |
| Category, Product, Variant | Active category tree, descriptions/specifications/images, regular/sale prices and separate variant stock |
| Order, OrderItem, Payment | Price snapshots, delivery/coupons, idempotency, reservation expiry and unique provider transaction references |
| InventoryMovement, Coupon | Product/variant stock ledger and atomic coupon limits |
| Review, Wishlist | Verified-purchase moderated reviews and account-saved products |
| Quote, IdeaSubmission, NewsletterSubscriber | Institutional requests, project registration/consent and newsletter subscription state |
| AdviceThread, AdviceMessage | Customer-owned conversations and staff replies |
| StoreSettings, EmailJob | Owner settings and leased, deduplicated, retryable email outbox |
| AuditLog, RateLimit | Staff activity history and shared throttling counters |

The generated Prisma client is excluded from Git and rebuilt when needed. All admin mutations require a server-checked role; changing a user's role revokes their sessions. Photographs are public store content, but uploaded files must pass the image decoder and size checks.

## Checks

```powershell
npm test
npm run typecheck
npm run build
npm run preview:build
```

For API/browser tests, use a separate terminal:

```powershell
node scripts/start-local.mjs --test
```

Then:

```powershell
node tests/reset-test-limits.mjs
npm run test:integration
npm run test:operations
node tests/admin-catalog-refresh.mjs
node tests/admin-image-upload.mjs
node tests/checkout-browser-qa.mjs
node tests/admin-workspace-qa.mjs
npm run test:browser
node tests/mobile-sidebar.mjs
```

Browser tests use installed Google Chrome. If repeated admin sign-ins reach the deliberate login throttle, reset limits in the isolated test database only. The reset helper validates that database identity. API tests refuse to use the selling database. See [QA.md](QA.md) for results and remaining owner-dependent checks.

## Preview versus real application

`npm run preview:build` produces the explicitly labelled static Vite demo. It does not accept real orders, payments, registrations or messages. Use Next.js at localhost:5186 or its ngrok tunnel to exercise the working database-backed store. The preview remains useful for visual/touch regression checks.

## Review revision — 13 October 2026

The current findings table, verification evidence, migration/recovery plan and launch checklist are in [review/REVIEW_HANDOVER.md](review/REVIEW_HANDOVER.md). Earlier QA results do not certify this revision. Sales remain explicitly closed by SELLING_MODE; test mode is permitted only against an isolated test database. Product editing no longer adjusts existing inventory; use the separate delta/reason/version inventory form. Payment attempts, reconciliation and verified refund records are included, but provider sandbox and blocked build/browser checks remain pending.


## Cash-first launch and Brevo preparation — 16 October 2026

Checkout now hides unavailable online payment methods. With `PAYMENT_PROVIDER=disabled`,
customers use cash on delivery or store pickup when the business setting `codEnabled` is enabled.
Do not turn on live sales by changing a payment setting: `SELLING_MODE` and the commercial approvals
still apply. Existing COD confirmation, reservation expiry and inventory release rules remain in place.
Submitting an order is not evidence that cash has been received. Confirm the order before dispatch;
record payment through the existing authorized order-status workflow only after collecting money.

### Domain and Brevo

1. Register the chosen business domain in the owner's account. Keep control of DNS and renewal access.
2. Select the deployment host and configure its required DNS records and HTTPS. A domain alone does
   not host the Next application, database, persistent images or worker.
3. Set `APP_URL`, `NEXT_PUBLIC_APP_URL` and exact `TRUSTED_ORIGINS` to the HTTPS storefront URL.
4. Add and authenticate the sender domain in Brevo using the exact verification/DKIM/DMARC records
   shown in that account. Preserve unrelated MX records and existing mail authentication policies.
   Do not invent DNS values or add a second SPF record.
5. Configure a verified sender address in `MAIL_FROM` (address only), `MAIL_FROM_NAME=chapa tronix`,
   optional `MAIL_REPLY_TO`, and `BREVO_API_KEY` privately. Use `MAIL_PROVIDER=brevo` only after approval
   for a controlled test send. Until then keep `MAIL_PROVIDER=disabled`.
6. Run the worker with the same runtime mail settings as the web service. The existing outbox queues
   order/status and account-link email. Review pending jobs before enabling a previously disabled queue
   to avoid releasing old customer notifications unexpectedly. Expired/superseded account links are cancelled.
7. Verify registration, verification, reset-password and order-status delivery to an owner-controlled
   inbox, including the generated HTTPS links. API acceptance is not proof of inbox delivery.

Brevo API delivery is implemented without an additional package. Resend remains supported.
The transport sends plain text and a stable outbox idempotency key. Provider deduplication is subject
 to provider guarantees; this does not assert unlimited exactly-once delivery. Provider errors remain
 retryable in the existing outbox and response details/API keys are not logged.
Brevo transactional sending does not provision a staffed support inbox; configure mailbox access and
reply handling with the chosen email host separately. Newsletter subscription is not automatically
converted into a Brevo marketing list.

### Future AzamPesa / AzamPay integration

Do not put Azam credentials in Flutterwave variables. No Azam adapter is enabled or represented as
working. Confirm whether the merchant contract supplies a direct AzamPesa API or AzamPay gateway API;
obtain official sandbox documentation, credentials, callback verification and refund/reconciliation rules.
The existing integration points are `lib/payments.ts` (initiate/verify), `lib/payment-lifecycle.ts`
(attempts/resume/reconcile/refunds) and the payment webhook in `app/api/[...path]/route.ts`.
The current provider-specific reference/signature/refund mappings must be adapted together,
with sandbox tests for success, cancellation, timeout, duplicate callback and late payment.
Database records and order history must remain intact. Leave `PAYMENT_PROVIDER=disabled` meanwhile.

Official references:
- https://developers.brevo.com/reference/send-transac-email
- https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC
- https://azampesa.co.tz/en/lipa-hapa-na-azampesa/
- https://azampay.com/developers


## SMS workspace — 16 October 2026

ADMIN → SMS now provides single-recipient service messaging, order templates, paged history,
order-event preferences, queued cancellation and safe retry. The worker supports Beem send,
a documented custom-provider API and test-only mock adapters. Sending defaults off everywhere.
See [docs/SMS.md](docs/SMS.md) for the custom API/callback contract, activation, migration,
verification and rollback. Native Beem delivery tracking still requires verified merchant docs
and implementation; no real SMS or credits were purchased/sent in this work.


## Separate administration and customer layouts — 16 October 2026

Use `/admin` for staff/administrator sign-in and management. This route has its own
administration header, identity, language switch, sign-out, workspace navigation and
minimal footer. Store search/cart/mobile navigation, funding registration, newsletter,
WhatsApp/store footer and customer cookie banner are not rendered in this workspace.
Use **View store** to visit the customer storefront.
Role checks on administration APIs remain enforced; the visual separation grants no privileges.

## Account-only storefront - 16 October 2026

Latest storefront refresh: the catalog shows up to 24 items per page with compact
responsive cards. `StoreNotices` replaces large persistent promotional sections
with session-dismissible notices and an opt-in expandable email form. The login
uses an original WebGL robotic workcell with an optimized image fallback and reduced-motion support.
Navy/teal styling is scoped in `app/storefront-refresh.css`; administration remains
separate. `test:access` also checks density, paging, notices, cart state and motion
against an isolated database. See `review/storefront-refresh-20261016`.

The shared entry page uses `LoginLanding`: a full-screen robotic workcell in a navy/teal
studio, minimal introductory text, then a glass sign-in/customer registration card
on scroll. The shared landing/login has no brand header or animation controls.
The language switch stays inside the form. The original 3D scene uses native WebGL2,
physical link lengths and grasp timing, shadows, a mobile poster fallback, automatic
reduced-motion support and offscreen rendering suspension. No 3D library was added.
Styles are scoped in `app/immersive-login.css` and `app/robotics-demo.css`.

Administration uses compact overview metrics, a payment-aware empty chart state,
and a responsive navy/teal workspace in `app/admin-polish.css`. Existing product,
discount and stock controls are preserved. Admin sign-out revokes the session and
opens the same `/account` page used by customers. Current verification is recorded
in `review/robot-admin-20261016`; earlier review folders are historical evidence.

The actual Next application requires a valid session before shopping. `/` opens
`/account` for guests, `/shop` for customers and `/admin` for staff/administrators.
The shared sign-in form chooses the destination from the stored account role.
Public registration creates CUSTOMER accounts only; supplying a role is rejected.
Existing administrator credentials and records are preserved. `/admin` also offers
sign-in only, without an administrator registration form.

Both server-rendered shopping pages and their APIs enforce access. Recovery,
email verification, unsubscribe, legal information and contact remain available
without signing in. Signed provider callbacks remain available to providers.
Product image/static URLs are not confidential storage. Product URLs are omitted
from the sitemap and the private application is excluded from search indexing.

`AUTH_REQUIRE_EMAIL_VERIFICATION=true` additionally blocks customer shopping until
verification succeeds; it requires working email delivery. This change does not
enable that flag or live email/SMS/payments. No migration or new environment variable
is required. Selling-mode and provider approval gates remain in force.

The Vite preview is a public static demonstration, not the authenticated application.
Use `npm run local` and open http://localhost:5186 for the real application.
Run `npm run test:access` with an isolated `TEST_DATABASE_URL` to check real HTTP and
Chrome journeys plus email-verification enforcement. CI now runs this suite instead
of the historical `test:audit` suite whose guest-shopping assumptions no longer
match the product requirements; that historical suite has not been revalidated.
