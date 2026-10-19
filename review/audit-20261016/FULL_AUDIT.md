# chapa tronix — Full audit, repairs and second-review handover

Audit date: 16 October 2026 (East Africa time; some raw logs use 15 October UTC).
Source: `C:\Users\Admin\.codex\.chatgpt-projects\g-p-6abfdf8cac388191a8c504bfcf8af72d\chapa-tronix`.

This report supersedes earlier verification summaries for this audit. The latest status table governs over earlier passing build/browser logs; older results are historical evidence only. A build alone is not evidence of business behavior. Individual run results, failures and remaining checks are recorded below and in the accompanying logs. No production publishing, real payment, SMS or outbound email was authorized or performed.

## 1. What the system does

chapa tronix sells mechatronics components to students, hobbyists, schools, workshops and engineers in Tanzania. It supports a Swahili-first storefront, English copy, TZS pricing, delivery and Kigamboni pickup, customer accounts, stock reservations, order processing and an administration workspace.

### Page and feature inventory

| Routes | Features and access |
|---|---|
| `/` | Categories, product collections, project ideas, learning links, business information, newsletter |
| `/shop`, `/category/[id]` | Search by name/SKU/specifications, descendant categories, brand/stock/voltage/interface/price filters, sorting, server pagination |
| `/product/[slug]` | Gallery, variants, pricing/discount, specifications, compatibility, datasheet, bundle suggestions, moderated reviews, cart and wishlist |
| `/cart`, `/checkout` | Persistent cart, quantity and variant selection, coupons, addresses, shipping/tax calculation, order submission and payment return recovery |
| `/account` | Registration/login/logout, order history pagination, profile, saved addresses, data export; admin entry according to role |
| `/reset-password`, `/verify-email` | Single-use account proofs, password reset and session revocation |
| `/wishlist`, `/track-order` | Saved active products; owner or guest proof-based order summary and eligible payment resume |
| `/quote`, `/ideas`, `/chat` | Bulk/institutional requirements, project idea registration, advice threads and messages |
| `/learn`, `/learn/[slug]` | Learning guides |
| `/about`, `/contact`, `/faq` | Business/support information |
| `/privacy`, `/terms`, `/returns`, `/shipping`, `/unsubscribe` | Draft/approved policies and newsletter withdrawal |
| `/admin` | Overview, products/variants/images, stock ledger, categories, orders/COD, customers/roles, coupons, reviews, quotes, ideas, advice, email queue, payment review/refunds, logs, business settings and report exports |
| `/sitemap.xml`, `/robots.txt` | Public indexing configuration |
| Unknown paths | Not-found screen and noindex; streamed Next responses can have HTTP 200 |

### Roles and boundaries

- Anonymous: public browsing, forms and proof-based guest checkout/tracking, subject to selling mode and limits.
- CUSTOMER: own account, addresses, wishlist, orders, advice and data export. Verification policy applies to protected services, including a newly registered session.
- STAFF: operational reading and permitted order/support/review work. Product/inventory writes, business settings, roles, refunds and sensitive reports require ADMIN.
- ADMIN: business administration. Own-role change is blocked to avoid accidental lockout.
- Worker/gateway: background reservations, reconciliation, email jobs and signed provider events; no human login role.

The `/admin` shell can return a page to a visitor, but server-side authorization protects every data/action route; a shell response of 200 does not grant admin access.

### Data and integrations

PostgreSQL + Prisma stores users/sessions/tokens, addresses, categories/products/variants, inventory movements, orders/items, payments/attempts/refunds, coupons, reviews/wishlist, quotes/ideas, advice threads/messages, newsletters, audit logs, email outbox, rate limits, worker heartbeat and business settings. Monetary snapshots are integer TZS. Existing seven migrations were retained. No schema/migration changes were introduced by this audit.

- Actual application: Next App Router, React and TypeScript. Vite is a separate static preview; it cannot prove database, authentication or payment behavior.
- Payment adapter: Flutterwave, signature verification plus provider verification/reconciliation. Disabled during this audit; mocked verification is distinct from provider sandbox certification. Other gateway names in the original brief are not implemented adapters.
- Email: Resend outbox adapter; disabled for real delivery, fetch mocked for outbox tests. SMS: no production adapter configured.
- Images: local persistent uploads or optional S3; shared byte/dimension validation and WebP conversion. Actual local image journey tested; real S3 storage not exercised.
- WhatsApp: configured click-to-chat link, not an automated messaging integration.
- Docker: separate migration and runtime URLs, shared runtime allowlist for web/worker. Container execution was not established by reading this configuration.

## 2. Findings, ordered by severity

No new Critical exploit was demonstrated in the tested scope. That is not a statement that no Critical defect exists. “Fixed” below means code was changed; verification scope is given in sections 3–4. Previously fixed high-risk commerce requirements were rechecked rather than reimplemented unnecessarily.

| # | Eneo | Tatizo | Anaathirika | Ukubwa | Suluhisho / hali | Juhudi |
|---|---|---|---|---|---|---|
| A01 | Authentication | Shared verification quota allowed unrelated accounts to block one another | Wote | High | Fixed: per-account resend quota, per-proof redemption limits; registration verification policy tested separately | Wastani |
| A02 | Secrets / deployment | Worker still inherited the entire `.env` through Compose, including migration/bootstrap credentials | Admin | High | Fixed: remove worker `env_file`; use the same explicit runtime allowlist as web | Ndogo |
| A03 | Account privacy | Account UI could retain previous account data while a new account request was pending | User | High | Fixed: owner-tagged result, request-generation guard, reset/loading state, logout proof/draft cleanup | Wastani |
| A04 | Dependencies | Fresh npm audit reported three high entries in Prisma config/deepmerge dependency chain | Admin | High | Fixed: scoped deepmerge-ts 8.0.2 override, no Prisma/Next stack upgrade; subsequent audit zero findings | Ndogo |
| A05 | Data integrity | Category ancestry checks and writes were separate; concurrent reciprocal edits could commit a cycle | Admin | High | Fixed: serializable category validation/write/audit transaction and concurrent-parent regression | Wastani |
| A06 | QA safety | Older mutation/browser scripts could target the business server and test startup could connect to a stale server | Wote | High | Fixed: exact isolated DB/port checks, config proof and per-run server identity, test-only server lifecycle; no business fixtures | Wastani |
| O01 | Launch operations | Real email, gateway sandbox, HTTPS hosting and real S3 are unverified | Wote | High | Remains: credentials/domain/merchant and hosted environment needed; do not enable live selling | Kubwa |
| O02 | Privacy operations | Retention, legal contact, controller/processor obligations and cross-border arrangements need business decisions | Wote | High | Remains: approve actual policy and PDPC process; code changes do not certify compliance | Wastani |
| O07 | Release verification | Final production build fails with filesystem EPERM; standard production startup was rejected before execution | Wote | High | Haijathibitishwa: logs and exact commands supplied; fresh staging build/runtime check required, earlier passing builds do not certify the revision | Wastani |
| A28 | Mobile / desktop admin | Long email/record values expanded the outer page instead of scrolling the table | Admin | Medium | Fixed: shrinkable grid children and a table wrapper limited to its parent width; long-record admin regression rerun | Ndogo |
| A29 | Export privacy | An async multi-page export could outlive logout/account switching | User | Medium | Fixed: captured owner, mounted-session guard and profile ownership check on every page; pending export switch regression | Wastani |
| O06 | Browser download verification | Native Chrome downloads return `canceled`, including an independent synthetic page without application code | User | Medium | Haijathibitishwa: generated JSON and API ownership can be checked separately; native file completion remains a strict failed check, not counted as passed | Wastani |
| O08 | Development environment | Intermittent generated-JSON parse/reload failures occurred in the original dev workspace during earlier checks | Wote | Medium | Exact cause unconfirmed; byte-matched temporary run passed flow checkpoints. Recheck cold start in a clean staging environment | Wastani |
| A07 | Inventory | Admin cancellation restored stock without incrementing base-product inventory version | Admin | Medium | Fixed: version increment alongside delta/ledger; stale adjustments now conflict consistently | Ndogo |
| A08 | Account emails | Token issuance and queue persistence were not atomic; pending obsolete/consumed links could be delivered | User | Medium | Fixed: token/outbox transaction, unique token job key, cancellation and worker validity check | Wastani |
| A09 | Passwords | bcrypt 72-byte truncation could affect Unicode passwords despite a character-length limit | User | Medium | Fixed: shared 12–72 character AND at most 72 UTF-8 byte schema for registration/reset; proof validation precedes reset hashing | Ndogo |
| A10 | SEO/navigation | Custom client routing could update visible content without Next metadata/canonical/JSON-LD | Wote | Medium | Fixed: actual Next Link/router/path state; separate preview shim | Wastani |
| A11 | Checkout | Refresh lost the unsent address/contact draft | User | Medium | Fixed: bounded tab-session draft, controlled inputs, expiry, completion/logout cleanup | Wastani |
| A12 | Tracking | Manually supplied guest proof was not retained for payment resume; COD could show irrelevant resume | User | Medium | Fixed: keep supplied proof, check method/expiry/status, catch errors and validate payment URL | Wastani |
| A13 | Privacy / API | Account payload exposed internal retry fields; no owner data download | User | Medium | Fixed: explicit safe order select plus authenticated paged data export and browser download | Wastani |
| A14 | Wishlist | Archived product could remain exposed through saved products/write API | User | Medium | Fixed: filter active products and reject archived/unknown product writes | Ndogo |
| A15 | Abuse isolation | Shared order-number and newsletter recipient handling lacked scoped limits | Wote | Medium | Fixed: tracking key includes actor/proof; newsletter per-recipient throttle | Ndogo |
| A16 | Account proofs | Recovery/verification secrets in query URLs could enter request logs/history | User | Medium | Fixed: new emails use fragments, frontend consumes them; legacy links still work | Wastani |
| A17 | Export security | CSV formula protection did not cover leading whitespace/BOM | Admin | Medium | Fixed: neutralize prefixed formula cells, regression cases | Ndogo |
| A18 | Selling mode | Launch approval did not require configured tax treatment and usable official contact | Wote | Medium | Fixed: explicit live gate includes configured tax mode and support email/phone; no rate invented | Ndogo |
| A19 | Catalog pricing | Starting variant price could use base-product discount/old price | User | Medium | Fixed: derive display price and discount from the same sellable offer | Ndogo |
| A20 | SEO | Sitemap could stop at the first catalog page; malformed nested URLs looked valid | Wote | Medium | Fixed: targeted all-active slug query, route-shape guard, private paths disallowed in robots | Wastani |
| O03 | Maintainability/performance | Store/Admin components remain large; complete URL filter restoration, review pagination and large-data load limits need further work | Wote | Medium | Partial: extracted category management/export/routes and targeted sitemap; broader refactor/load tests deferred | Kubwa |
| O04 | Returns/invoicing | Automated customer return/RMA, cash refund accounting, fiscal receipt integration and partial refund policy are not complete | Wote | Medium | Provider-confirmed full online refund records exist; business/provider decisions required for the rest | Kubwa |
| O05 | Accessibility/devices | Full WCAG audit, screen-reader review, physical phone/ngrok checks and performance/load measurements not completed | Wote | Medium | Browser viewport/keyboard/error checks are evidence only for tested journeys | Wastani |
| A21 | Upload validation | Configured S3 public root with trailing slash could reject valid image URLs | Admin | Low | Fixed: normalize root; retain host/prefix checks and reject lookalike host | Ndogo |
| A22 | Admin UX | Staff saw controls they could not use; own-role control invited a rejected action | Admin | Low | Fixed: role-aware actions and disabled own-role selector; server checks retained | Ndogo |
| A23 | Product editing | Missing/inactive category could silently appear as the first available category | Admin | Low | Fixed: preserve explicit category state and require valid selection | Ndogo |
| A24 | Accessibility | Product visibility filter lacked an unambiguous accessible name; radio groups lacked shared names | Wote | Low | Fixed: explicit filter label, grouped checkout radios, pressed navigation state | Ndogo |
| A25 | Order support | No printable guest/owner order summary | User | Low | Added print/PDF summary; clearly not fiscal receipt or proof of payment | Ndogo |
| A26 | HTTP handling | Valid API HEAD lacked explicit handling; signed malformed webhook JSON became server error | Wote | Low | Fixed: bodyless HEAD status/headers and 400 malformed webhook JSON | Ndogo |
| A27 | Local tooling | Build/dev output and old generated TS caches could collide or break fresh checks | Admin | Low | Fixed: per-port dev dist directory, exclude stale output, isolated test/build copies; no ignored TS errors | Wastani |

## 3. Change map and how to verify each repair

The changes are already applied in the original project folder; do not apply the patch a second time there. Complete files are in `FULL_CHANGED_FILES.zip` and the full source package. `AUDIT.patch` contains the diff from the private source snapshot taken at the start of this audit. Existing owner work before that snapshot is preserved. Never apply this patch over a later modified tree without reviewing conflicts.

| Findings | Files / functions | Verification / expected behavior |
|---|---|---|
| A01 | `app/api/auth/recovery/route.ts`; `requireUser` / `assertVerified` in `lib/auth.ts` | On verification-required isolated server register three accounts; each gets its own three resend requests, fourth is 429. Before proof account/export/checkout/wishlist/chat are 403; identity/logout remain usable; valid proof unlocks account |
| A02 | `compose.yaml` worker environment | Static inspect: no worker `env_file`, only runtime allowlist; Docker rollout must inspect effective env names without dumping values and verify the grants in `docker/10-runtime-role.sh` against the running database |
| A03/A13 | `components/storefront/Account.tsx`, `PersonalDataExport.tsx`, `app/api/account/export/route.ts`, account handler | Sign out account A, sign in B while B account response is delayed: A orders/addresses must not appear. Export includes B only, pages through records, excludes hashes/proofs/provider refs. Anonymous 401; unverified 403 when required |
| A04 | `package.json`, `package-lock.json` override | `npm audit --json`; patched merge graph/cycle unit test; Prisma validate and application build |
| A05 | `lib/category-management.ts` / `saveCategory`; admin category dispatch | `tests/category-concurrency.ts`: save reciprocal A→B/B→A concurrently; at least one rejected, no saved cycle; only committed edits logged |
| A06 | `tests/isolated-server.mjs`, `run-audit.mjs`, `audit-server.mjs`, legacy HTTP/browser scripts | Business ports 3000/5186 refused for mutation scripts. Server must prove exact test DB and current run ID. Audit runner stops its own server via IPC |
| A07 | `lib/api/admin-routes.ts` order cancellation | Cancel test order once: stock restored, version incremented and ledger recorded; repeated cancellation cannot duplicate restoration. `tests/integration.ts` checks version |
| A08/A16 | `lib/account-tokens.ts`, `lib/mail.ts`, `AccountRecovery.tsx` | Mock mail worker: latest valid link sends once, obsolete/consumed/expired proof jobs cancel; token and queue rollback together. New URL uses `#token`; reset revokes old session and token replay fails |
| A09 | `lib/commerce.ts` / passwordSchema; recovery route | ASCII 12–72 characters and multi-byte boundary tests; long Unicode inputs exceeding 72 bytes rejected on both registration/reset |
| A10/A20 | `components/Store.tsx`, Next page metadata, `lib/store-routes.ts`, sitemap/robots, preview Link/navigation | Click home→shop→product: pathname, title, canonical and product JSON-LD agree. Invalid route renders not-found/noindex. Sitemap includes an active fixture beyond page one |
| A11 | `Checkout.tsx`, `lib/checkout-attempt.ts` | Fill address, refresh, verify exact text remains; double-click creates one order; logout/completion clears draft; storage expiry and field allowlist unit tests |
| A12/A25 | `OrderTracking.tsx`, order access projection, print CSS | Paste a guest proof manually. COD has no online resume. Eligible online order reuses that proof; mocked 503 displays alert; print summary available and identified as non-fiscal |
| A14/A15 | API wishlist/newsletter/order-access handlers | Archived product write returns 404; no inactive product in wishlist; separate proof/account scopes do not consume a global order quota |
| A17 | `lib/commerce.ts` / csvCell | Test formulas after spaces, tabs and BOM plus ordinary cells; exported CSV opens formula cells as text |
| A18 | `lib/selling-mode.ts`, translated error map | Closed mode always denies checkout; test mode restricted to isolated DB outside production; live needs approvals, configured tax treatment, email and phone |
| A19 | `lib/pricing.ts` / displayOffer; ProductCard | Product base discount differs from cheapest variant: card price/old price/percentage must belong to selected offer; product variant and structured offers retained |
| A21 | `lib/product-schema.ts` | Trailing-slash allowed S3 prefix accepts correct URL; lookalike host fails; upload bytes still go through server conversion |
| A22/A23/A24 | `components/admin/Admin.tsx`, `ProductEditor.tsx`, Checkout | Staff lacks forbidden edit buttons, API still 403; category not silently substituted; visibility filter accessible by label; radio group keyboard behavior; admin sections at mobile/desktop |
| A28/A29 | Admin layout CSS; PersonalDataExport mounted/owner guards | Long-recipient records must scroll inside the table. Start export, sign out and sign into another account before the response: the old export must be discarded |
| A26/A27 | API dispatcher, scripts/start-local/start-ngrok, tsconfig | HEAD has zero body; malformed signed webhook 400; typecheck ignores obsolete build caches but still checks source. Dist output separate by local port |

### Earlier reviewer findings rechecked

| Original ID | Current disposition | Evidence |
|---|---|---|
| H01 | Existing separation retained; A07 completes cancellation version consistency | Domain stale stock 10→checkout9→metadata save remains9; same for variants, version conflicts and ledger |
| H02 | Existing registration-session policy retained; A01 improves throttling | Separate verification-policy HTTP suite, protected service 403 and single-use proof/reset tests |
| H03 | Existing COD expiry/confirmation retained | Domain expiry/repeat release/coupon release and COD confirmation tests |
| H04 | Existing idempotency/fingerprint retained; A11 fixes pre-submit draft | Domain retry/changed-payload checks, unit gateway return/cart tests, browser refresh/double-click |
| H05 | Existing attempt/reconciliation/refund records retained | Domain missing-webhook reconciliation, late paid cancellation review, duplicate payment/refund checks using mocks; no real provider call |
| H06 | Compose role split retained and A02 corrects worker secret inheritance | Runtime role query: no superuser/createDB/createRole, but local app remains database owner. Docker grants read statically, actual Docker role execution unverified |
| M01/M02/M03/M11 | Streaming request cap, scoped limits, shared image pipeline and explicit selling mode retained/improved | Domain byte limits/gates; HTTP input/CSRF; local image browser journey; A01/A15/A18/A21 |
| M04/M05/M06/M07/M09/M10 | Existing outbox/proof tracking/pagination/targeted reads/relations/tax snapshots retained | Outbox/operations/domain/HTTP tests and schema validation. No new tax rate. Customer CSV invoice summary is not fiscal certification |
| M08/M12/M13/M14 | Next navigation corrected; bundle ID contract, bilingual compatibility and variant-aware catalog retained | Browser metadata/compatibility and pricing/domain checks; actual structured offer data inspected |
| M15/M16/M17 | Audit harness/CI improved; backup restore exercised; code split partially improved | Fresh check logs, backup-restore JSON, new helper/export files. Remote CI run, production monitoring alerts and full monolith decomposition remain unverified/incomplete |
| L01/L02/L03 | Existing tabs, idea states and descendant/spec/SKU search retained | Browser tabs/keyboard and domain search/state checks. No redesign |

## 4. Fresh verification results

Latest full journey run: `journeys-2026-10-16T06-15-53-498Z.json` / `temp-journeys.log`. Runtime source/config comparisons match all 99 compared files. The overall journey command exits **1**: 9 suites passed and one suite retains the strict failed native-download assertion. It is not reported as a passing run.

| Command / check | Fresh result | Evidence / scope |
|---|---|---|
| `npm test` | 40 passed, 0 failed | `unit-release.log` |
| `npm run test:review` | 27 passed | `domain-handover.log`: stock/variants, idempotency, expiry, reconciliation/refunds, authorization, pagination and tax snapshots |
| `npm run lint` | 129 files, 0 errors | `lint-handover.log`; repository AST syntax/security rules |
| `npm run typecheck` | Exit 0 | `typecheck-handover.log` |
| `node node_modules/prisma/build/index.js validate` | Valid | `schema-release.log` |
| `node node_modules/prisma/build/index.js migrate status` | 7 migrations; schema up to date | `migration-status.log`; read-only, no migration/reset/seed on business DB |
| `npm run preview:build` | Exit 0 | `preview-handover.log`; static Vite only |
| `npm audit --json` | Exit 0, 0 reported vulnerabilities | `dependency-audit-release.json`; raw output retained separately; no security score inferred |
| Audit runner / packaged equivalent `npm run test:audit` | 9 suites passed, 1 failed; overall exit 1 | Actual orchestration `node .local-db/run-temp-audit.mjs` invoked packaged `tests/run-audit.mjs` in an isolated byte-matched copy. Configure TEST_DATABASE_URL privately to reproduce with the packaged command |
| Category concurrency / integration / operations / mail | 3 / 34 / 30 / 4 checks passed | Latest journey log; only mock mail fetches |
| HTTP security/navigation audit | 89 checks passed | Role denial, exports, malformed/oversized inputs, CSRF, metadata, sitemap, route shape |
| Required-verification policy | 30 checks passed | Separate server configuration; independent accounts/cookies, 403 policy retained |
| Critical browser journeys | 9 groups passed | Navigation/metadata/tabs/cart/auth/admin stock/edit/archive/restore |
| Admin workspace | 12 sections at 360px and 1440px passed | Long records stay inside their table; no page overflow or runtime/API errors in these checks |
| Image workflow | Passed | Actual selected image persisted, converted WebP served, product/discount shown, fake bytes rejected |
| Extended customer browser | 11 checkpoints passed, then strict native-file assertion failed | Refresh, double-click, tracking, account privacy, pending-export discard, 44 route/viewport combinations, generated JSON owner checks |
| `node tests/download-environment.mjs` | Exit 1: `canceled` | Independent synthetic Chrome page, no application/database; native file completion remains **Haijathibitishwa** |
| `npm run build` | **Haijathibitishwa**, latest exit 1 | `build-temp.log`: `EPERM: operation not permitted, mkdir` in the temporary copy's `.next/server/app/api/account`; other final attempts and errors retained. Earlier passing builds do not certify this final revision |
| Standard Next production-server smoke | **Haijathibitishwa**, command rejected before execution | `npm start -- --hostname 127.0.0.1 --port 5190`: automatic approval review said `approval required by policy, but AskForApproval::Granular.sandbox_approval is false`. See `production-smoke.json` |
| Backup restore / business preservation | Restored to separate DB; unchanged business hashes/counts | `backup-restore.json`, `business-comparison.json`: 11 products, 0 variants, 2 accounts, 2 orders |
| Patch applicability | Reverse check passed against the changed tree | `git apply --reverse --check --ignore-space-change --whitespace=nowarn review/audit-20261016/AUDIT.patch`; no files changed by this command |

Final production build/runtime must be verified outside the current blocked filesystem/approval environment before launch. Intermittent generated-JSON parse/reload failures were observed in the original dev workspace during earlier runs; the final temporary-workspace run completed the user-flow checkpoints above without those errors. Their exact underlying cause was not established, so a clean staging cold-start check remains required. Development route compilation was warmed for interactive tests; no cold-start speed or load score is claimed.


Raw logs include failed exploratory runs. They are retained as evidence, not counted as successes. In particular an initial filesystem EPERM build, dev cache/JSON race, browser wait and checkout-draft failures were investigated; passing reruns must be read with their timestamp and scope. Next streamed not-found behavior was checked against installed documentation: the test checks noindex + not-found UI and permits its documented HTTP 200. This is not a change to a checkout or authorization requirement.

The integration/browser server is a test-only programmatic Next server with the same App Router source and run identity; production still uses standard Next build/start. The audit runs include the actual source directory and a final byte-matched temporary source copy, both with explicit test-database and disabled-provider environment overrides; guards check the database/run identity before mutations. Policy and build copies contain sanitized test configuration and no business uploads. Sources are compared in the final evidence. Email/payment provider calls are mocked; this is not a real sandbox certification.

### Reproduce safely

Use a separate PostgreSQL database named `chapa_tronix_test` on local port 55437. Never point these commands at the business database. `TEST_DATABASE_URL` is secret and must be supplied privately, not pasted into an issue or screenshot. Install dependencies and generate Prisma client first. Migrate/seed **only the new isolated database** before the harness; seeding an existing business database is prohibited.

```powershell
npm ci
npm run db:generate
# Set DATABASE_URL and TEST_DATABASE_URL privately to the isolated test database.
npm run db:migrate
npm run db:seed
npm test
npm run lint
npm run typecheck
node node_modules/prisma/build/index.js validate
npm run test:review
npm run test:audit
npm run build
npm run preview:build
npm audit --json
```

`npm run lint` is the repository's TypeScript AST syntax/security-rule checker, not a claim of comprehensive ESLint coverage. It rejects unsafe dynamic execution/raw SQL and unbounded API body calls. Remote GitHub Actions was updated but has not been run/pushed by this audit. CI seed targets only its disposable test database.

## 5. Data, migrations and recovery

No new schema migration was needed for these repairs; all seven existing migrations remain. Do not reset, force-push schema, drop/recreate the business database or reseed owner stock. Existing database remains the source of business truth.

For a new/staging deployment: back up first, set `DATABASE_URL` privately to the migration-role URL for that command and run `npm run db:migrate` (Docker maps `DATABASE_MIGRATION_URL` into the migration container; runtime web/worker retain `DATABASE_RUNTIME_URL`); runtime web/worker must use the limited runtime role. For an existing deployment, inspect `prisma migrate status` first and review any unapplied pre-existing migration before applying it. Do not run the setup/seed process to update an established business database.

The audit made an actual private pg_dump and restored it into a new `chapa_tronix_restore_audit_*` database. Product/account/order counts were compared. This proves that dump restored in this local environment; it does not prove off-site retention, encrypted storage policy or production recovery time. Owner dumps and credentials are excluded from source ZIPs.

Rollback: stop web/worker, keep new writes stopped, restore the prior application source/dependency lock (or review/reverse `AUDIT.patch` against this exact revision), reinstall dependencies and regenerate/build. No down migration exists because no schema migration was introduced. For actual data recovery, restore the verified dump to a separate database, inspect it, then change runtime URL with the business owner's recovery decision. Do not overwrite current orders with an older dump automatically. Dependency rollback reintroduces the audited advisory and should not be used for normal operation.

Business before/after counts and SHA-256 comparisons match: 11 products, 0 variants, 2 accounts and 2 orders. Full product records include image references/prices/stock. This comparison excludes session changes and does not pretend to be a file-byte baseline for every public image. See `business-before.json`, `business-after.json` and `business-comparison.json`.

## 6. Configuration and running the actual application

No new secret environment variables were required for application behavior in this audit. `.env.example` now documents the optional, separate `TEST_DATABASE_URL` used by verification. `.env.example` retains the complete configuration contract: database/runtime/migration URLs, origin, selling mode, proof secret, COD/payment reservation times, verification policy, Resend, Flutterwave and optional S3. Test-only `AUDIT_TEST_PORT`, `AUDIT_SUITES`, `TEST_POLICY_APP_DIR` and `AUDIT_RUN_ID` are harness controls, not production settings. Set secrets privately and never copy test credentials into a hosted deployment.

From the source directory, on this configured Windows workspace:

```powershell
npm run local
```

This starts the real Next application on `http://localhost:5186` and uses the existing local PostgreSQL instance on 55437. If already running old source, stop that application's terminal and restart it; do not delete data to restart. `npm run preview:dev`/the Vite build is a static preview and must not be used to verify admin or checkout. A normal independent dev setup uses `npm run dev` on port 3000; use matching configured origins. Production uses `npm run build`, `npm start`, an HTTPS proxy and a separately monitored worker after launch approvals. Keep `SELLING_MODE=closed` until approved.

## 7. Privacy and remaining business inputs

A blocked native-file download is not declared fixed merely because its generated JSON is correct. The independent `tests/download-environment.mjs` probe provides the distinction.

The technical review checks access control, data minimization, safe exports and private proof handling. It is not a legal compliance certificate. Official Tanzania PDPC guidance identifies controller/processor registration and data-subject rights, and discusses retention, minimization and cross-border transfers. The business must determine its applicable registration/process, official privacy contact, retention schedule, processing providers/agreements and international transfer arrangements, and approve the actual published policy.

Primary references consulted: https://pdpc.go.tz/ ; https://pdpc.go.tz/services/registration/ ; https://pdpc.go.tz/privacy-notice/ ; https://pdpc.go.tz/data-subject-rights/ . The Act PDF lookup timed out, so this audit does not claim a section-by-section legal reading or invent a retention period.

Needed from owner: official sending domain/address and domain access; chosen contracted payment provider/merchant sandbox; verified support/pickup details; tax treatment and approved prices/delivery/return/warranty terms; privacy/retention responsibilities. Do not send API keys or account passwords through chat; enter them privately in environment configuration.

## 8. Final launch checklist and roadmap

### Fanya sasa — before public customers

- [ ] Final production build and standard-server smoke pass in an authorized clean staging environment; native browser download completes.
- [ ] Reviewer checks `AUDIT.patch`, full files and fresh logs; resolve any remaining failed verification recorded above.
- [ ] Real provider sandbox: mobile-money success, cancellation, timeout, missing/duplicate webhook, late payment, refund verification; reconcile provider references with database records.
- [ ] Real email sandbox/test recipients: sending domain DNS, verification/reset delivery, queue retries and provider idempotency.
- [ ] Confirm business tax/delivery/prices/policies/contact and PDPC/retention process. Keep selling closed until approved.
- [ ] HTTPS/staging deployment with secure cookies; actual Docker runtime grants checked, migration secrets absent from web/worker, least-privilege runtime not database owner.
- [ ] Continuous worker/heartbeat alerts, off-site backup encryption/retention and restore drill on hosted infrastructure.
- [ ] Physical Android/iPhone/ngrok and keyboard/screen-reader walkthrough; approved design preserved.
- [ ] Staff exercise discount entry, add stock to existing sold-out product, stale edit, soft archive/restore, order/COD confirmation/cancellation, reports and role denial.

### Baadaye — planned improvements

- Customer return/RMA workflow, cash-refund ledger, partial refunds and fiscal receipt integration after business/provider policy decisions.
- Finish splitting large Store/Admin modules with typed contracts while maintaining regression coverage.
- URL-persistent filter/back/refresh state, cursor/review pagination, bounded large-report streaming and production-size load tests.
- Measure performance/Lighthouse/accessibility on the hosted application and slow mobile network; no unmeasured score is assigned here.
- Provider SMS notifications only after an explicit provider/consent choice; optional USD requires approved exchange-rate/display policy.

This handover is for a second reviewer. It does not authorize opening the store to real customers.
