# Account-only storefront — 16 October 2026

Scope: require sign-in before shopping; preserve existing administrators; select the
destination from the stored role; keep public registration customer-only.

## Behavior and implementation

| Requirement | Implementation | Verification |
|---|---|---|
| Guests first see sign-in or registration | `lib/access-policy.ts`, server page and metadata guards in `app/[[...path]]/page.tsx`, `components/Store.tsx` | Real HTTP redirects and Chrome journeys; direct retail URLs and anonymous catalog API requests |
| Customers enter their shopping dashboard | Auth responses include `/shop`; Account uses returned destination | Registration and actual password login, refresh, logout, customer blocked from admin API |
| Administrators use existing accounts | Stored ADMIN/STAFF roles select `/admin`; separate AdminShell remains | Existing role fixtures sign in through the shared form; no administrator signup controls |
| No public admin creation | Strict registration schema rejects injected role; server creates CUSTOMER explicitly | Role-injection request rejected with 400 and no user row created |
| Verification policy cannot be bypassed | Shared server/client access policy and existing `requireUser` | Separate verification-enabled HTTP suite, including registration sessions and account/checkout denial |
| Backend access enforced | Catch-all API gate plus authenticated checkout owner | Anonymous API 401; customer administration API 403; order belongs to signed-in customer |
| Concurrent checkout remains idempotent | Retry serialization/unique conflicts on rate-limit counters, preserving quotas | Two simultaneous authenticated requests both succeed with the same order and stock 10 → 9 |

Password recovery, verification, unsubscribe, contact and legal pages remain available
without a shopping session. Authenticated staff can deliberately use View store.
Product/static image URLs are public assets, not confidential storage. Private product
pages are omitted from the sitemap and robots excludes indexing.

## Operational boundaries

- No schema migration, business database reset, reseed, administrator replacement or
  credential change is required. No new environment variables were added.
- Email verification is enforced when `AUTH_REQUIRE_EMAIL_VERIFICATION=true`; this
  task did not enable that flag or external email delivery.
- Real SMS/email/payment providers and production publishing remain disabled.
- All account/order writes in the regression runs target `chapa_tronix_test` on
  loopback port 55437. No business account/order fixtures were created.
- Vite is a static demonstration. The Next application is the authenticated system.
  Run `npm run local` and open http://localhost:5186.

## Test notes

`VERIFICATION.json` and adjacent fresh logs record outcomes. An initial double-click
test caught a real rate-limit transaction race (409 before order idempotency); the
implementation was corrected rather than changing the expected result.

A browser redirect assertion originally used Playwright's default 5-second limit
while the development server was compiling. Assertions now wait up to 45 seconds;
the required redirect and denial behavior are unchanged. Synthetic products without
images produce React/Next image console warnings in the test catalog; the journey
result reports page runtime exceptions separately and does not claim zero console
warnings. These fixtures are not business products.

An initial build hit Windows EPERM creating an existing `.next` subdirectory. A
fresh output directory was used without deleting the previous build or any data.

CI now runs `test:access` instead of historical `test:audit`, whose anonymous retail
flows conflict with the new login requirement. Other historical guest browser
scripts are retained and have not been revalidated for this access policy. This
handover is evidence for this change, not a claim of a new full production audit.

## Recovery and review

Review the complete source archive and manifest. Restore the previous source version
to revert the access policy; no data rollback is needed. Preserve `.env`, `.uploads`
and the database when applying source changes. Existing sessions continue to work;
use a private window or sign out to inspect the first-time login screen.

Confirm both roles, session expiry, mobile keyboard access and logout before launch.
Domain/HTTPS, approved selling mode, tested email delivery and backup/restore remain
separate launch requirements; this change does not authorize a public launch.
