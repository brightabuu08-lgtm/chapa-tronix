# Setup and deployment

## Windows: continue using this project

Node.js 22+ and PostgreSQL 18 are required. From the project directory:

```powershell
npm ci
npm run local:setup
npm run local
```

Open http://localhost:5186. The setup helper uses a separate PostgreSQL cluster on `127.0.0.1:55437`, creates least-privilege application and test roles, applies the five migrations and seeds missing catalog entries. Existing product prices, photographs, stock, category edits and administrator credentials are preserved. It does not change an existing PostgreSQL service on port 5432.

The locally generated administrator email/password are stored privately in `.env`. Sign in at `/account`, then open `/admin`. Do not put passwords in a URL or share `.env`, `.local-db`, database backups or browser sessions.

## Share the working application with ngrok

Stop the Next.js terminal with Ctrl+C. Start these in two terminals:

```powershell
ngrok http 5186
```

```powershell
npm run share
```

If detection fails:

```powershell
npm run share -- --url https://YOUR-NGROK-DOMAIN
```

The helper starts the local database when needed, sets the exact HTTPS origin and allows secure development WebSockets. Restart it whenever the ngrok URL changes. A phone uses its own cart and login cookies; sign in on that phone. Share the ngrok HTTPS URL. Keep both terminals open. Live ngrok routing must be checked once an actual public tunnel is available.

## PostgreSQL and production configuration

Copy `.env.example` into the deployment's secret environment. Set `DATABASE_URL` to the private PostgreSQL connection, `APP_URL` and `NEXT_PUBLIC_APP_URL` to the same public HTTPS origin. Keep `TRUSTED_ORIGINS` empty unless there is a specific additional legitimate origin. Set a unique administrator email and a randomly generated password of at least 12 characters for initial seeding.

Run:

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run build
npm start
```

The cached client generator skips regenerating an unchanged schema, avoiding Windows DLL locks while the development server is open. Stop the server before changing the Prisma schema. Windows uses the regular Next.js production build; Linux/Docker uses standalone output. If checking a separate output folder, pass the same `NEXT_DIST_DIR` to both build and start.

Protect the database behind a private network, use its provider's TLS configuration and put the Node service behind HTTPS. Keep uploads on durable storage. A local filesystem deployment needs a persistent Node service; for serverless hosting, configure the S3 environment variables and the image bucket's allowed browser PUT origin.

## Docker

Docker is an alternative to the Windows database helper. Set POSTGRES_BOOTSTRAP_PASSWORD and a separate POSTGRES_RUNTIME_PASSWORD privately; configure encoded DATABASE_MIGRATION_URL for the migrator and DATABASE_RUNTIME_URL for chapa_runtime on the internal db:5432 service. Web/worker receive only runtime credentials. Do not remove an existing pgdata volume to apply role changes; see review/REVIEW_HANDOVER.md.

```sh
docker compose build
docker compose up -d db
docker compose run --rm migrate
# Seed only a NEW empty install, with admin credentials passed privately. Never reseed existing business inventory.
docker compose up -d web worker
```

The web service listens on localhost:3000 for an HTTPS reverse proxy. Named volumes preserve PostgreSQL and uploaded images. The worker sends queued email, expires unconfirmed COD and unpaid online reservations and removes expired sessions/tokens/rate counters. Keep both services running. Docker deployment commands are supplied; a Docker runtime was unavailable for executing the image build in this workspace.

## Enable email

Set `MAIL_PROVIDER=resend`, `RESEND_API_KEY` and a verified `MAIL_FROM`. Start `npm run worker` for a direct Node deployment; the Compose worker runs automatically. `npm run worker:once` processes a single batch. Without credentials, messages remain queued and no email is sent. Admin → Email queue shows delivery status and lets an administrator retry failed jobs. Queue bodies and reset tokens are not exposed by that admin API.

Registration prepares verification email. `/reset-password` prepares a one-time, one-hour reset link, revokes old sessions on use and hashes the new password. Verification links expire after 24 hours. Set `AUTH_REQUIRE_EMAIL_VERIFICATION=true` only after email delivery works. Test delivery, spam placement and reset/verification links on the final domain with an address you control.

Provider documentation: https://resend.com/docs/api-reference/emails/send-email

## Enable payments

Set `PAYMENT_PROVIDER=flutterwave`, `FLUTTERWAVE_SECRET_KEY` and `FLUTTERWAVE_WEBHOOK_SECRET` for the approved merchant account. Configure the provider's webhook URL as `https://YOUR-DOMAIN/api/payments/webhook`.

The hosted checkout adapter uses Flutterwave v3. The default `FLUTTERWAVE_SIGNATURE_MODE=verif-hash` checks the v3 secret header using a constant-time comparison. Use `hmac` only for a provider configuration that actually delivers the v4 `flutterwave-signature` scheme; both schemes are never accepted simultaneously. Every paid notification is additionally verified against the provider's transaction API, order reference, amount and TZS currency. Duplicate references cannot credit an order twice. Late payments on released/cancelled orders are recorded for administrator review.

Never collect card data in this application. Check actual enabled Tanzanian networks in the merchant dashboard; displayed network names are not proof of merchant support. Run a merchant sandbox transaction, invalid-signature test, duplicate webhook, wrong-amount test, late payment and refund reconciliation before switching to live credentials. Online refunds must be completed with the gateway before recording/reconciling them; the application does not pretend to transfer refund money.

Provider documentation: https://developer.flutterwave.com/docs/webhooks and https://developer.flutterwave.com/v4.0/docs/webhooks

## Owner settings before real orders

Admin → Business settings:

- Set official phone, WhatsApp, email, exact pickup directions and opening hours.
- Approve actual selling prices, stock and photo usage rights.
- Set delivery rates, pickup and cash-on-delivery availability; add the tax note appropriate to the business.
- Write and approve Privacy, Terms, Returns/Warranty and Shipping policies. The four texts must be completed before policy approval.
- Optionally set a TZS-per-USD rate. USD values are estimates; checkout is always in TZS.

Checkout remains closed in every environment unless SELLING_MODE is explicitly selected. Live mode additionally requires price/stock, delivery, policy and tax-treatment approval. Test mode accepts only an isolated *_test database outside production. This does not approve those business decisions automatically.

## Backups and recovery

```powershell
npm run db:backup
```

The helper passes the database password privately through the process environment and creates a PostgreSQL custom-format archive under `.local-db/backups` (or `BACKUP_DIR`). Include `.uploads` or the configured image directory in backups; keep database and photographs from the same checkpoint. Protect and encrypt backups outside the web root. Enable the production database provider's scheduled backups and retention.

Restore to a new empty database first, using `pg_restore --no-owner --no-acl --dbname NEW_DATABASE BACKUP.dump`, with credentials supplied through the environment. Confirm products, orders and image files before choosing a recovery cutover. Never restore a test backup over the selling database. The local backup archive was created and its table-of-contents was verified readable; a destructive restore over existing data was not performed.

## Readiness check

- `/api/health` returns 200 when PostgreSQL can be reached; no credentials are returned.
- Confirm HTTPS, correct canonical URLs, sitemap and private-page noindex.
- Create/edit a discounted product with a photograph; view it on a phone.
- Test purchase, stock deduction, coupon use and cancellation in staging.
- Check the email worker and expired online reservations.
- Check image/database persistence after a restart and verify a restore in a disposable database.
- Measure Lighthouse on the final HTTPS hosting environment. The requested 90+ scores have not been certified by the local browser checks.

## Review verification and recovery

Use the current [review handover](review/REVIEW_HANDOVER.md) for the two additive migrations, existing-volume runtime-role setup, backup recovery, new environment variables and actual verification gaps. Refund completion is now recorded only after provider verification; the app does not initiate a real refund transfer. Never run audit fix --force without compatibility verification. Production build and browser tests for this revision were blocked by automatic telemetry review and are not certified by older runs.

## PC email delivery (18 October 2026)

`npm.cmd run local` and `npm.cmd run production` now start a dedicated email worker after Next reports ready, when a configured Brevo/Resend sender and database are present. Restart an already-running website once to load this launcher change. The worker checks the outbox every 30 seconds, records the `mail` heartbeat and stops with its website. Test launches never start it, and bootstrap/admin credentials are excluded from its environment. This email worker does not replace the full maintenance worker for reservations and payment reconciliation.

Verification: Brevo transactional authentication accepted a validation request (400 missing sender, rather than 401/403). A single deduplicated owner test email was accepted by Brevo and recorded SENT; inbox delivery remains for the owner to confirm. Other existing pending messages were not dispatched by this scoped test. The live outbox had nine older pending messages and a stale maintenance heartbeat before repair; after restart the email worker will process eligible pending jobs and cancel expired account links.

Password reset/verification and related operations passed 30 isolated integration checks: request, one-time token, new password, old password rejection and verification replay rejection. Seven outbox checks using a mock provider passed, including single-job delivery without dispatching unrelated queued messages. All 71 unit tests and TypeScript checking passed. Reset links use the configured public HTTPS domain and a fragment token, expire after one hour, and revoke existing sessions after a successful reset.

## Guest storefront and compact offers update (18 October 2026)

All customer-facing browsing, checkout details, project ideas, quotes, support questions and order tracking stay on their own routes for guests. A guest support question uses the existing quote/support inbox with supplied contact details; private saved conversations remain account-protected. Order tracking still requires a valid order proof. Account/admin data remain protected.

The final checkout submit opens a native liquid-glass dialog for login/registration, retaining the current route, cart and checkout draft. Closing or Escape dismisses it. Successful customer login closes the dialog without creating or charging an order automatically; the customer confirms the final order again. An expired session also opens this dialog instead of redirecting away. Account verification, when configured, is handled inside this checkout dialog or in Profile.

The former tall discount card grid is replaced by a compact offer ribbon with real offer percentages, old/new prices and savings. Offer cards expand across the row on desktop and scroll horizontally on mobile; no empty columns are reserved for missing products.

Verification: TypeScript passed; 71 unit tests, 34 existing integration checks and 19 new guest journey HTTP checks passed. The guest tests write only to the isolated test DB and send no real email or order. Browser interaction/visual checks for the latest dialog and offer ribbon have not been run after the earlier telemetry approval block. Production publication is not claimed by these source changes.
