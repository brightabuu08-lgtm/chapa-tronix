# SMS workspace and replaceable providers

Revision: 16 October 2026. Live SMS remain disabled. This document describes an
implemented application feature, not a live telecom service or a delivery guarantee.
No customer message, account purchase or provider registration was authorized by this change.

## Using the workspace

Sign in as ADMIN, open `/admin`, then **SMS**. Staff and customer roles cannot read
or mutate the SMS API. The workspace provides single-recipient service messages,
order templates, segment estimation, paged/filterable history, safe cancellation,
bounded retry, order-event settings and a worker health indicator. It is not a bulk
marketing campaign service, a two-way inbox or a customer OTP login service.

`QUEUED` means stored locally; `SENDING` means submitting; `ACCEPTED` means accepted
by the provider, not delivered. `DELIVERED` requires an authenticated custom-provider
receipt or lookup. `UNCERTAIN` means a timeout/crash/ambiguous response: check the
provider; never compose another message merely because delivery is unknown.
`FAILED` with a provider reference is a terminal delivery failure, not a safe resend.
Only definitive pre-acceptance rejection can be retried, up to five total attempts.
429 responses use delayed exponential retries. Uncertain requests are not auto-resent.

Every manual request carries a UUID. A retry with the same key and normalized
recipient/text returns the same job; changed payload conflicts. A deliberate new
request gets a new key. The UI retains the key while retrying an unsuccessful submit
in the same open form; it does not store message text or restore a draft after reload.

The three-segment limit counts GSM escape characters and UTF-16 units for Unicode.
This is an estimate, not a quote: check actual billing, taxes, sender registration and
credit expiry with the provider. Tanzania mobile numbers only are accepted.

## Activation and configuration

Keep these defaults until a separately approved, owner-controlled test:

```dotenv
SMS_PROVIDER=disabled
SMS_SEND_ENABLED=false
SMS_SENDER_ID=CHAPATRONIX
BEEM_API_KEY=
BEEM_SECRET_KEY=
SMS_CUSTOM_URL=
SMS_CUSTOM_API_KEY=
SMS_CUSTOM_WEBHOOK_SECRET=
```

The sending switch applies in development/ngrok as well as production. Secrets are
server-side only. Configure web and worker identically, deploy the additive migration,
regenerate Prisma, then restart both. Run `npm run worker` under a managed service.
The existing worker also expires stock reservations; do not stop it as an SMS off-switch.
Use `SMS_SEND_ENABLED=false` and restart web/worker instead. Already accepted SMS
cannot be recalled. Review pending jobs before re-enabling; queue entries expire in 24h.

Order notifications default off. ADMIN can choose statuses and the default SMS language
(Swahili/English). This release uses a store-wide SMS language, not a per-customer
language preference. Settings affect new order events, not old orders. Disable/cancel
existing queued messages separately. Superseded order statuses are cancelled before
submission, though an order can change after a network submission has started.
Order SMS are queued in the same transaction as the existing order notification.
SMS disabled/unconfigured creates no automatic backlog and cannot send via another provider.
Provider and sender are captured on each job. Drain/cancel old queues before changing
the provider identity, sender or custom API URL; do not point existing references at
a different custom service. Switching from Beem to custom affects new jobs only.

## Beem adapter

Set `SMS_PROVIDER=beem`, sender approved for the intended Tanzania networks, and the
two Beem credentials. Transport uses HTTPS with normal TLS verification, Basic
authentication and a single-recipient JSON request to `https://apisms.beem.africa/v1/send`.
It records `request_id` as the provider reference. This adapter supports GSM-compatible
text only; Unicode is rejected rather than guessing an encoding parameter.

The Beem send contract was mocked, not exercised against a real account. Native Beem
delivery receipt authentication/lookup must be verified from merchant documentation and
implemented before claiming automatic Beem delivery tracking. The custom callback below
is NOT a Beem callback and must not be configured as one. For now inspect Beem reports
for accepted/uncertain Beem submissions; the app never invents a delivered state.

Official examples: https://beem.africa/sms/ and
https://github.com/beem-africa/python-client . Never copy examples that disable TLS checks.

## Contract for the owner's future SMS API (version 1)

This contract is designed for this store. It does not assert an existing external API.
The future service implements it, or a new adapter translates its native contract.
Use `SMS_PROVIDER=custom`, a fixed HTTPS `SMS_CUSTOM_URL` with no credentials/query/hash,
a bearer API key and a separate random callback secret of at least 32 characters.
The configured URL is server configuration, never a URL supplied by a customer.

### 1. Submit

`POST {SMS_CUSTOM_URL}/messages`

Headers: `Authorization: Bearer <server-only-key>`, `Content-Type: application/json`,
`Idempotency-Key: <local-job-id>`. Body:

```json
{
  "clientReference": "local-job-id",
  "to": "255712345678",
  "sender": "CHAPATRONIX",
  "text": "Chapa Tronix: Oda CT-123 imepokelewa."
}
```

Return 2xx with `{"messageId":"provider-unique-id","status":"ACCEPTED"}` only after
durably accepting the message. IDs must be non-empty and at most 150 characters.
The future service MUST durably deduplicate the client reference for the lifetime of
the job and its receipt history; the same key with changed payload must return 409.
Do not charge or forward to a carrier twice on repeated requests. Return 429 only if
the request was definitely not accepted. A 4xx rejection, except 408, must likewise
mean no acceptance/charge. Ambiguous outcomes remain uncertain, never auto-retried.
Keep responses under 16 KiB; redirects are rejected. Send timeout is 15 seconds.

### 2. Lookup / reconciliation

`GET {SMS_CUSTOM_URL}/messages/by-client-reference/{URL-encoded-local-job-id}`
with the same bearer authentication. Return:

```json
{
  "eventId": "provider-event-or-stable-state-id",
  "clientReference": "local-job-id",
  "messageId": "provider-unique-id",
  "status": "DELIVERED"
}
```

Allowed status values: `ACCEPTED`, `DELIVERED`, `UNDELIVERABLE`. Only these four fields
are accepted. Lookup uses the same event/state identifier while a state is unchanged.
404 or provider outage does not prove it is safe to resend; the job stays unresolved.
Worker reconciles accepted/uncertain custom jobs periodically without initiating a new send.

### 3. Authenticated callback

`POST https://<store-domain>/api/sms/webhook` with the same four-field receipt body.
Choose a unique `eventId` per job/event, maximum 150 characters. `clientReference`
maximum 100 characters. Include:

```text
X-SMS-Timestamp: <Unix timestamp in whole seconds>
X-SMS-Signature: sha256=<lowercase hex HMAC-SHA256>
```

Sign the exact UTF-8 bytes of `timestamp + "." + rawRequestBody` with
`SMS_CUSTOM_WEBHOOK_SECRET`. Timestamp must be within five minutes of the store clock.
Both servers need synchronized clocks. Callback body has a streaming 16 KiB limit.
The callback secret authenticates the provider, not a browser/user login.

Duplicate events are acknowledged without reapplying. Provider references must match
the saved job. Terminal delivery states never regress to ACCEPTED. Contradictory late
events are kept in the event history for review; they do not overwrite a terminal state.
On 5xx retry with a new timestamp/signature but the same eventId/body; on repeated 4xx
investigate the integration. Lookups provide recovery when a callback is lost.
Callbacks may continue while sending is switched off, provided SMS_PROVIDER remains custom
and its callback secret remains configured; disabling outbound SMS must not lose receipts.

The custom system still needs a lawful carrier/aggregator connection to deliver actual SMS.
An API and dashboard alone cannot remove telecom delivery costs.

## Tests and database safety

```powershell
npm run db:generate
# Set TEST_DATABASE_URL privately to local chapa_tronix_test on port 55437.
# Apply migrations to that test DB separately before the following command.
npm run test:sms
npm test
npm run typecheck
npm run lint
```

`test:sms` validates the exact test database identity, runs domain tests, then an owned
Next test server and browser journeys. It forcibly uses mock/disabled transports and no
real mail or payment. Mock SMS can run only on a local chapa_tronix_test database with
SELLING_MODE=test and outside production. Domain tests mock all external requests.
The browser runner uses installed Chrome locally or Playwright Chromium in CI.
CI configuration includes this command, but remote CI results are not implied by local runs.

New migration: `202610160001_sms_outbox`; only SmsJob/SmsEvent tables, indexes and the
nullable order foreign key are added. No existing stock/order/user rows are reset or seeded.
After an approved deployment backup, run `npm run db:migrate` with migration credentials
and the target database URL. Runtime credentials need CRUD on the new tables; Docker's
existing default grants apply when migrations run as the configured migrator.

Recovery: turn SMS sending off, deploy the previous application if needed, and retain the
new tables/history. Do not drop tables as a routine rollback. Restore a verified backup
only for an actual data incident with an agreed recovery point; restoration can overwrite
new business data. Local additive migration verification does not prove Docker/staging
runtime grants, real provider delivery, throughput, sender approval or credit billing.
