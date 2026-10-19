# chapa tronix — marekebisho kwa ukaguzi wa pili

Tarehe: 13 Oktoba 2026. Code: `C:\Users\Admin\.codex\.chatgpt-projects\g-p-6abfdf8cac388191a8c504bfcf8af72d\chapa-tronix`.

Marekebisho yamefanywa kwenye application halisi ya Next.js, si kwenye Vite preview pekee. Hakuna production publishing, real payment initiation, email au SMS iliyotumwa. `SELLING_MODE=closed` kwenye mazingira ya biashara. Tests zinazobadilisha records zimetumia `chapa_tronix_test`; restore imetumia database mpya yenye prefix `chapa_tronix_restore_review_`.

**Hali si production approval.** Runs zilizoruhusiwa kwenye revision hii zilipita unit na domain integration checks. Final combined run baada ya marekebisho ya facets imezuiwa na automatic review; results zake hazijachukuliwa kama release certification. HTTP/browser journeys na Next production build zina verification gap iliyoelezwa chini. Vite build iliyopita haiwezi kuchukuliwa kama uthibitisho wa Next application.

## Findings na ushahidi

| ID | Hali | Marekebisho | Faili/functions | Test na matokeo mapya |
|---|---|---|---|---|
| H01 | Imetekelezwa; domain test imepita | Product/variant PATCH haiandiki stock. Inventory adjustment ni delta, reason, actor na version CAS. Checkout/release huongeza inventoryVersion. | `lib/product-management.ts` saveProduct/saveVariant; `lib/inventory.ts` adjustInventory; `components/admin/InventoryAdjustment.tsx` | Stock 10 → checkout 9 → stale metadata save inabaki 9; variant pia 9. Stale version imekataliwa; actor/delta ledger zimehakikiwa. |
| H02 | Imetekelezwa; shared policy imepita; HTTP haijathibitishwa | requireUser inahakiki verification ya CUSTOMER; checkout pia. Login/registration sessions ni limited kwa unverified customer. Me, verification/recovery na logout zinabaki zinapatikana. | `lib/auth.ts` assertVerified/requireUser; `lib/api/auth-routes.ts`; `app/api/auth/recovery/route.ts` | Unit na DB suite zinakataa unverified customer. Endpoint/registration browser test haijathibitishwa hapa. Staff/admin ni roles zilizotolewa na mwenye duka; verification policy ya sasa inalenga CUSTOMER. |
| H03 | Imetekelezwa; concurrency test imepita | COD ina confirmation deadline; staff confirmation huiondoa expiry na kwenda PACKED. Unconfirmed expiry/cancellation hurudisha stock/coupon mara moja. Pending cap ni kwa normalized contact/account. | `lib/orders.ts`; `lib/maintenance.ts` confirmCod/releaseOrder/expireReservations; admin order transitions | Concurrent expiry imerudisha stock na coupon mara moja tu. Contact cap imeruhusu mteja mwingine. Phone/email verification au edge bot controls bado zinahitaji provider/hosting decisions. |
| H04 | Imetekelezwa; replay tests zimepita; gateway timeout ina limitation | Browser sessionStorage huhifadhi key, payload na response proof; reload hurejesha form. Changed payload/same key ni 409. Resume hutumia order/attempt iliyopo na saved URL. | `lib/checkout-attempt.ts`; `lib/orders.ts` checkoutFingerprint/createOrder; `lib/payment-lifecycle.ts` resumePayment; `components/storefront/Checkout.tsx` | Same-key concurrent retries zimepunguza stock mara moja; changed cart imekataliwa; reload/storage unit imepita; READY attempt resume haitengenezi provider request nyingine. UNCERTAIN initiation hairetry charge kimya kimya: provider reconciliation/operator review inahitajika. Browser timeout/gateway return haijathibitishwa kwa real sandbox. |
| H05 | Records/workflow zimetekelezwa; mocks zimepita; provider sandbox haijathibitishwa | PaymentAttempt, reconciliation by reference, late/duplicate-payment review, unique refunds na provider-confirmed completion. Hakuna automatic money-transfer/refund POST. Admin ana review desk; refund huanzishwa kwenye gateway dashboard. | `lib/payment-lifecycle.ts`; `components/admin/PaymentDesk.tsx`; `lib/maintenance.ts`; schema PaymentAttempt/Refund | Missing-webhook reconciliation, duplicate callback, amount mismatch, late payment, pending/confirmed refund na duplicate reopening checks zimepita. Real Flutterwave refund response contract na settlement lazima zithibitishwe sandbox kabla ya launch. |
| H06 | Docker config imerekebishwa; role simulation imepita; Docker boot haijathibitishwa | Bootstrap/migration credentials tofauti na runtime. Web/worker whitelist env, hakuna bootstrap secrets. Runtime hana schema CREATE; migration metadata privileges zinarevoked. Worker OS user si root. | `compose.yaml`; `docker/10-runtime-role.sh`; `scripts/docker-migrate.mjs`; Dockerfile | PostgreSQL role simulation: CRUD allowed; SUPERUSER/CREATEDB/CREATEROLE/schema CREATE false. Docker image/container startup haijaendeshwa hapa. Existing Docker volume hairesetwi; migration guide ina hatua zake. |
| M01 | Imetekelezwa; tests zimepita | Webhook stream ina byte limit kabla ya full buffering; reader cancels on overflow. | `lib/body-limit.ts`; payment webhook route | Chunked overflow na bounded request tests zimepita. |
| M02 | Imetekelezwa; static/domain evidence | Global shared quotas zimeondolewa. Login/register/recovery/checkout/newsletter/quote/chat limits zina scopes tofauti. COD cap haiwazuii unrelated customers. | auth-routes, recovery route, catch-all route, orders.ts | Unrelated-customer reservation test imepita. Trusted proxy/IP anti-abuse setup haijabuniwa; ina launch requirement. |
| M03 | Imetekelezwa; local decoder tests zimepita | S3 na local hupokea multipart endpoint ileile, byte/dimension/MIME checks na Sharp WebP conversion. Raw presigned upload API imeondolewa (410). | `app/api/admin/product-image/route.ts`; `lib/product-images.ts`; ProductEditor upload | PNG → resized WebP, fake PNG/HTML na oversized body rejection tests zimepita. Real S3 put/delete haijathibitishwa bila storage credentials. |
| M04 | Imetekelezwa; payment outbox test imepita | Order create/status/payment/refund changes na EmailJob zinatokea ndani ya transaction; status-based dedupe. | `lib/mail.ts` orderEmailTx; orders/payment/maintenance/admin handlers | Verified payment imequeue notification moja tu. Resend delivery haijaendeshwa; disabled kwa verification. |
| M05 | Imetekelezwa; access tests zimepita | Guest order tracking hutumia secret bearer proof iliyohashwa; safe order projection; token haiko URL query. Signed-in owner check ipo. | `accessibleOrder`; `orders/access`; `components/storefront/OrderTracking.tsx` | Valid proof imeruhusiwa; incorrect proof imekataliwa. Browser flow haijathibitishwa. Legacy orders zenye null proof hutumia signed-in owner/staff. |
| M06 | Imetekelezwa; DB pagination test imepita | Catalog/admin/account paged SQL reads na hasMore/next controls; chat thread pages na older-message cursors. | `lib/catalog-query.ts`; `lib/admin-lists.ts`; account/chat routes; Catalog/Account/Admin/AdviceChat | Admin page 1/2 distinct, total/hasMore na page-size checks zimepita. Account/chat UI traversal haijathibitishwa browser. No hidden 100/500 record cut-off for primary lists. Overview/recommendations ni explicitly limited summaries. |
| M07 | Imetekelezwa; targeted queries zinakaguliwa | Metadata/product fetch ni targeted, React request cache; initial catalog ni 24, browsing ni 9/page. Hakuna full-catalog refetch on every navigation. Cart/wishlist/companions hydrate by IDs. | server-catalog.ts; catalog-query.ts; Store refreshCatalog/loadProducts | Catalog query/search regression imepita. SQL plan/load timings/Lighthouse hazijapimwa. |
| M08 | Imetekelezwa; browser haijathibitishwa | Actual app hutumia Next router; static preview ina isolated navigation shim. Metadata/canonical/JSON-LD hufuata RSC page navigation. | Store go; `app/[[...path]]/page.tsx`; preview/navigation.ts | Typecheck/preview build zimepita. New browser journey ina canonical/title/JSON-LD assertions, lakini run yake imezuiwa na mazingira. |
| M09 | Imetekelezwa na kuhakikiwa kwenye business DB | Additive FKs/indexes, historical variant restrictions, compatibility-safe NOT VALID then validation without deleting records. | migrations 20261013090000/20261013093000; schema | Four new FKs zimevalidated: orphan counts 0. Existing products/accounts/order status hashes zimebaki sawa. |
| M10 | Imetekelezwa; snapshot test imepita; business decision inasubiriwa | Owner sets treatment/rate/label; no invented business tax rate. Order snapshots rate/amount/mode/label; checkout/tracking/account show breakdown. Tax base ni discounted items, delivery excluded. | business-config.ts; commerce.withTax; orders.ts; BusinessEditor/Checkout/OrderTracking/Account | Explicit TEST tax rate produced expected amount; later setting change haijabadilisha historical order snapshot. Owner lazima aidhinishe real treatment/rate/base. |
| M11 | Imetekelezwa; tests zimepita | closed default; test only on isolated *_test DB outside production; live requires approvals and tax treatment. Payment resume pia ina selling gate. | selling-mode.ts; createOrder/resumePayment; compose; Checkout | test mode on business DB rejected, unapproved live rejected. Actual business env remains closed. |
| M12 | Imetekelezwa | API na UI zinatumia frequentlyBoughtIds; companions hydrate by IDs hata on direct product-page load. | catalog-routes.ts; ProductPage; Store.loadProducts | Typecheck passed; actual approved-purchase recommendation rendering haijathibitishwa browser. |
| M13 | Imetekelezwa; old content imehifadhiwa | compatibilityEn nullable; admin huandika notes mahsusi za lugha zote. Missing English field huonyesha original notes; hakuna generic text inayofuta product-specific content. | schema/product-schema; ProductEditor/ProductPage | Typecheck passed; owner Swahili content haijatranslated/overwritten. English backfill ya actual products inahitaji authored business content. |
| M14 | Imetekelezwa; query/unit tests zimepita | Cards/search/filter/sort hutumia variant-aware display prices; JSON-LD offers zinaheshimu stock/price kwa base na variants. | pricing.displayPrice; catalog-query; ProductCard/StoreHeader; page schema | Lowest active variant filter na unavailable-base display-price tests zimepita. Browser structured-offer inspection haijathibitishwa. |
| M15 | Imetekelezwa; baadhi ya runs zimezuiwa | AST lint, regression suite, fixed stale stock test, unique test phone, critical browser journeys, CI Postgres/least-privileged role + gates. | scripts/lint.mjs; tests/review*; tests/verify-http.mjs; workflow/check.yml | 30 unit / 24 DB checks / typecheck / AST lint / schema validation / Vite build passed. Production build/HTTP/browser/CI execution NOT verified; details below. ESLint installation was blocked; committed lint is explicit TypeScript AST syntax/security lint, not an ESLint claim. |
| M16 | Imetekelezwa; backup/restore verification imepita | JSON safe logs, worker heartbeat/health, backup recovery guard, upload backup verification. | logging.ts; worker.ts; maintenance.ts; verify-backup.mjs | Fresh dump restored to new DB; product/account/order counts match. One upload file copied and SHA-256 matched. No external monitoring or scheduled backup service has been claimed active. |
| M17 | Imetekelezwa; typecheck imepita | Catalog/Product/Checkout/Account extracted; admin/auth/catalog API handlers extracted; typed critical contracts; 22 unused-import declarations cleaned. | components/storefront/*; lib/api/*; contracts.ts | Typecheck and lint passed. This is feature separation of critical flows, not a claim that every legacy any/type debt was removed. |
| L01 | Imetekelezwa; browser haijathibitishwa | Product tabs have selected styling, tablist/tab/tabpanel, aria-selected/controls, roving tabindex and keyboard arrows/Home/End. | ProductPage.tsx; mobile.css | Typecheck passed; assertions are in review-browser. |
| L02 | Imetekelezwa | REGISTERED is supported in idea status schema and dropdown; quotes retain their separate NEW state. | admin-routes.ts; Admin.tsx | Typecheck passed; browser dropdown run pending. |
| L03 | Imetekelezwa; tests zimepita | Search uses name/SKU/specs, category descendant tree; autocomplete same server query. | catalog-query; StoreHeader; Catalog | SKU + specs + parent-category tests passed; parameterized SQL used. |

## Verification — runs za sasa

Run za zamani hazitumiki kuthibitisha release hii.

| Command/action | Matokeo |
|---|---|
| `npm test` | PASS: 30 tests, 0 failures. |
| `npm run test:review` | Separate approved run: 24 checks passed on isolated test DB, providers mocked. Final combined run after facet changes: **Haijathibitishwa** due to automatic telemetry rejection; raw log still has a 24-pass marker, which is not final-run approval. |
| `npm run typecheck` | PASS on changed source; last approved run recorded in evidence; final combined rerun unverified. |
| `npm run lint` | PASS: TypeScript AST syntax/security rules; exact file count in final evidence. |
| `node node_modules/prisma/build/index.js validate` | PASS: schema valid. |
| `npm run preview:build` | PASS: Vite preview; no backend/auth/payment certification implied. |
| `NEXT_TELEMETRY_DISABLED=1 NEXT_DIST_DIR=.next-review-final npm run build` (PowerShell env form) | **Haijathibitishwa.** Automatic approval review rejected the build because it detected egress to an external Visual Studio telemetry endpoint; payload unknown and no authorization for that disclosure. Next telemetry opt-out did not resolve the review rejection. No prior build result is substituted. |
| `node .local-db/run-review.mjs --server` | **Haijathibitishwa.** Same automatic telemetry rejection; a follow-up after opting out was also rejected. No further workaround attempted. |
| HTTP integration attempt against 3110 | **Haijathibitishwa:** initial attempt failed `TypeError: fetch failed`, cause `read ECONNRESET`; server check then rejected by automatic review. The domain suite was separated so DB verification could continue without a server. |
| Browser customer/admin journeys | **Haijathibitishwa.** Critical scripts are provided; isolated HTTP server needed for their run was blocked. No business DB checkout/e2e was substituted. |
| `npm audit --json` | Completed, exit 1: 3 high advisories in Prisma/@prisma/config/deepmerge-ts dependency chain; 0 critical. See audit evidence. |
| `npm install --save-dev eslint@9 typescript-eslint@8 --ignore-scripts --no-audit --no-fund` | **Haijathibitishwa / rejected:** automatic review reported the same unknown Visual Studio telemetry disclosure. No stack upgrade or forced dependency remediation claimed. |
| Fresh backup restore and upload backup | PASS; private backup retains customer data and is not part of the shareable patch. |
| Docker runtime | Config + PostgreSQL role simulation verified; **Docker container boot haijathibitishwa.** |
| CI workflow | Added; **remote CI run haijathibitishwa**, no push/publish was performed. |

## Migrations na recovery

Migrations mpya:

1. `20261013090000_review_integrity`: inventory versions/actor, order fingerprint/access/tax/confirmation, payment attempts/refunds/worker heartbeat, indexes. Existing unconfirmed PENDING COD gets a 24-hour review window; totals/status/stock are preserved.
2. `20261013093000_review_relations`: tree/variant/token FKs and query indexes. Uses NOT VALID to avoid deleting legacy rows. On this business DB all four constraints were separately validated with zero orphans.

Migrations zimewekwa kwenye business na integration databases. No reset, stock reseed, user deletion or migration history deletion was performed. Product/image/price/stock/variant/account/order-total/status digests before and after were equal.

For another checkout: configure migration credentials privately, `npm run db:generate`, back up DB plus image storage, then `npm run db:migrate`. Docker migrate service calls `scripts/docker-migrate.mjs`, then revokes runtime access to `_prisma_migrations`.

Recovery is forward-first: keep additive columns/tables, keep sales closed, correct code or add a follow-up migration. Do not drop payment/refund/ledger history. If database restore is needed, create a NEW EMPTY `chapa_tronix_restore_*` DB, set `RESTORE_DATABASE_URL` privately, then run `node scripts/verify-backup.mjs <absolute-dump-path>`. The helper refuses a business/test/nonempty target and never uses `--clean`. Compare records/images before switching DATABASE_URL to the restored DB. Restore the image backup into a separate folder first. No automatic destructive down migration is provided.

Existing Docker volumes: initdb scripts only run on an empty volume. Do NOT delete pgdata to apply this change. The DBA must create/grant the runtime role on the existing database using the equivalent bootstrap SQL, set separate encoded migration/runtime URLs, run migrate, revoke migration metadata permissions, and check runtime role privileges. Review the previous bootstrap username before deployment; do not assume a volume initialized with `chapa` now contains `chapa_migrator`.

## Environment na application

New `.env.example` fields: `SELLING_MODE`, `ORDER_ACCESS_SECRET`, `COD_CONFIRMATION_MINUTES`, `POSTGRES_BOOTSTRAP_PASSWORD`, `POSTGRES_RUNTIME_PASSWORD`, `DATABASE_MIGRATION_URL`, `DATABASE_RUNTIME_URL`. Existing `AUTH_REQUIRE_EMAIL_VERIFICATION`, `ORDER_RESERVATION_MINUTES`, gateway/storage/mail fields remain. No secrets are in this report or patch. ORDER_ACCESS_SECRET must be stable and private; rotating it prevents regeneration of guest proofs on idempotent retry, although stored token hashes still validate saved proofs.

Application halisi: from the project directory, `npm run local`, open `http://localhost:5186`. Keep `SELLING_MODE=closed`. Worker: `npm run worker` only with intended environment; it performs reservation expiry, reconciliation and outbox processing. Public methods remain disabled without gateway configuration. Do not use `local:setup`/seed as a way to fix existing stock.

Static preview: `npm run preview:dev`, ordinarily port 5173. It is a visual preview and cannot validate PostgreSQL, login, orders, payments or admin mutations. Browser/e2e must use isolated DB + Next server, not this preview.

Repeat verification in an approved environment: generate/migrate an isolated test DB, run `npm test`, `npm run test:review`, `npm run lint`, `npm run typecheck`, schema validation, `npm run build`, `npm run preview:build`, then `node tests/verify-http.mjs` with TEST_DATABASE_URL set to `chapa_tronix_test`. The helper launches the isolated Next server and runs HTTP integration plus critical customer/admin browser journeys. Never point it at business data. On Linux install Playwright Chromium as shown in CI.

## Zilizobaki na sababu

- Production build, HTTP/browser tests and Docker/container/CI run require verification in an environment that does not emit unauthorized telemetry, or explicit approval for the specific disclosure after its payload has been established. Automatic review rejected these actions; no bypass was attempted.
- Dependency audit: 3 high advisories remain. Reported dependency fix changes Prisma version; `audit fix --force` was not used. Choose a compatible patched deepmerge/Prisma configuration and verify migrations/generation/build in the approved environment before launch. No claim of zero security findings.
- Real Flutterwave sandbox: validate hosted initiation, uncertain timeout handling, return navigation, payment reference verification, refund response fields/statuses and webhook signature mode. Mocks prove domain invariants, not provider interoperability. UNCERTAIN initiation stays saved for reconciliation/operator review rather than issuing a possibly duplicate charge.
- Real S3/email/SMS credentials, official contact details, policies, delivery tariffs, tax treatment/rate/base, real inventory/pricing and production domain are business/integration inputs. They are not invented or switched on.
- Guest COD can be confirmed by staff after checking contact; automated OTP/contact confirmation and trusted-edge bot/rate controls need provider and hosting decisions. No assumption that arbitrary forwarded-IP headers are trusted.
- Compatibility English notes for existing owner products need authored product-specific content; original Swahili remains intact, no generic replacement.
- External worker monitoring/alerts and scheduled off-site backups require hosting configuration. Heartbeat, safe logs, backup/restore and recovery helpers are present; services are not claimed active.
- No Lighthouse, load-test, WCAG audit, or security score has been fabricated. Mobile/desktop styling is preserved, with requested bottom-nav selected color and no top stripe; final browser/a11y QA remains unverified.
- Findings were taken from the IDs and details supplied in the request. No separate unseen attachment was assumed to contain additional findings.

## Launch checklist — bado si ruhusa ya launch

- [ ] Reviewer wa pili ahakiki patch, migrations and critical domain tests.
- [ ] Fresh Next production build, HTTP auth policy tests, customer/admin browser journeys and CI all pass in approved environment.
- [ ] Resolve/assess remaining high dependency advisories with compatible package changes.
- [ ] Approve real prices, stock, delivery, policies and explicit tax treatment/base/rate.
- [ ] Validate Flutterwave sandbox payment/refund/timeout/webhook/reconciliation contracts; test S3 and mail sandbox.
- [ ] Verify real Docker runtime grants, no bootstrap credentials in web/worker, and migration metadata denied.
- [ ] Configure HTTPS/domain, exact trusted origins, secure session cookies, proxy/bot controls, monitoring and off-site backup schedule.
- [ ] Verify guest tracking token handling and COD staff confirmation/expiry procedures.
- [ ] Owner separately approves live payments/email/production publishing. Until then keep SELLING_MODE=closed.

## Patch na artifacts za reviewer

`chapa-tronix-review.patch` ni unified diff dhidi ya baseline iliyohifadhiwa kabla ya marekebisho; `CHANGES.json` ina file/hash manifest. Application ya hapa tayari ina marekebisho haya: usiapply patch tena kwenye copy hii. Kwa checkout ya reviewer inayolingana na baseline, tumia `git apply --check` kwanza, kisha apply kwenye working copy mpya. Kutoka workspace root tumia `git apply --check --directory=chapa-tronix chapa-tronix/review/chapa-tronix-review.patch`. Migrations lazima zihifadhiwe pamoja na code; generate Prisma client kabla ya kuendesha app. Reverse-check ya patch dhidi ya changed working copy imepita bila kufanya mutation. Backup na secrets hazimo kwenye patch.

`VERIFICATION.json` ina matokeo na verification gaps; `logs/` ina output mpya ya unit/domain/lint/typecheck/schema/Vite/audit na partial blocked build. Approved revision runs contain 30 unit tests and 24 domain checks. The final combined verification attempt after the facet change was rejected by automatic review; it needs a new run in an approved environment. Checks za DOM/HTTP hazijaongezwa kwenye idadi hiyo.

Final combined command rejected by automatic review: `npm run test:review` → `npm run lint` → `npm run typecheck` → `npm run preview:build` with output captured under test-results. Reason: unapproved connection to external Visual Studio telemetry; payload unknown, possibly project/environment metadata. No workaround or repeated execution of that rejected command was attempted. The last permitted runs and partial/current logs are provided as separate evidence, not substituted for final certification.
