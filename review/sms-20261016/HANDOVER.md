# SMS za chapa tronix — mrejesho wa utekelezaji

Tarehe: 16 Oktoba 2026. Code imewekwa kwenye mradi uliopo. Hakuna SMS halisi,
email halisi, malipo ya credits au mabadiliko ya oda/bidhaa yaliyofanywa kwa majaribio.
SMS_PROVIDER=disabled na SMS_SEND_ENABLED=false zimewekwa wazi kwenye mazingira ya sasa.

## Kilichotengenezwa

- Admin → SMS: kuandika ujumbe wa huduma kwa namba moja, kutumia templates,
  kuhesabu segments, historia yenye pagination/filter, kuzuia ujumbe unaosubiri
  na retry inayoruhusiwa kwa ombi lililokataliwa kwa uhakika tu.
- Customer na staff wamezuiwa kwenye UI na API. Origin validation na throttling
  kwa admin/mpokeaji vinatumika; hakuna quota moja ya ujumbe inayofungia wateja wote.
- Taarifa za hatua za oda zinaweza kuchaguliwa na admin. Zimezimwa kwa chaguo-msingi;
  mfumo hautumii oda za zamani kutengeneza backlog mpya. Taarifa huingia kwenye
  transaction ya oda na email; transaction ikishindwa hakuna SMS inayobaki kutumwa.
- Adapters tofauti: Beem ya kutuma, custom HTTPS API ya mfumo wa mmiliki wa baadaye,
  na mock ambayo haiwezi kuwashwa kwenye database ya biashara au production.
- Provider/sender snapshot kwa kila job; idempotency na payload fingerprint;
  worker claiming; expiry; kuzuia notification iliyopitwa na hali ya oda.
- Custom API: lookup/reconciliation, signed callback yenye body limit,
  event deduplication na ulinzi dhidi ya stale/out-of-order events.
- Migration mpya ni additive. Backup imehifadhiwa kwa siri; database haijafutwa,
  haijareseed na migrations zilizopo hazijabadilishwa.

## Verification ya run hii

| Command / ukaguzi | Matokeo | Ushahidi |
|---|---|---|
| npm test | 56/56 zimepita | unit.log |
| npm run test:sms (runner husika) | 18 domain/DB + 9 HTTP/browser groups zimepita | journeys.log |
| npm run test:review | 27/27 zimepita | commerce-regression.log |
| npm run typecheck | Exit 0 | typecheck.log |
| npm run lint | 141 files, errors 0; custom AST checker | lint.log |
| Prisma validate | Schema valid | schema.log |
| npm run build | Exit 0; optimized Next build imepita kwenye revision hii | build.log |
| npm run preview:build | Exit 0; hii ni static Vite preview | preview.log |
| Prisma migrate deploy/status | Migration mpya imewekwa; migrations 8 up to date | migration-business.log, migration-status.log |
| Business snapshot kabla/baada | Hashes sawa: products 11, variants 0, accounts 2, orders 2 | business-comparison.json |
| Git patch checks | Forward dhidi ya source ya kabla na reverse dhidi ya source mpya: exit 0, --ignore-space-change kwa CRLF | patch-verification.json |
| Local Next dev smoke | 5186: health 200, config closed/payments off; admin SMS bila login 401 | VERIFICATION.json |

SMS tests zilitumia chapa_tronix_test tu. Mock provider na in-process fetch fixtures
zilihakikisha hakuna maombi halisi kwa kampuni ya SMS. Browser ilipima kuandika ujumbe,
kuonekana kwenye historia, cancellation, ruhusa na viewport 360/1440 bila horizontal
page overflow au JavaScript runtime errors. Hivi si vipimo vya simu halisi, ngrok,
throughput, accessibility kamili au production runtime.

Log ya integration ya jaribio la awali linaweza kuonyesha finding iliyorekebishwa;
`journeys.log` ndiyo matokeo ya mwisho ya run iliyopita. Database ilihitaji kuwashwa
kwanza. Tests ziligundua pia data ya segment counter iliyokuwa haipaswi kuingia Prisma
na fixture ya reconciliation iliyokuwa haijaweka muda wa lookup kuwa due; vyote vilirekebishwa
kabla ya run ya mwisho. UI fixture ilitumia namba tofauti ili kutogonga throttle ya recipient
iliyotumiwa kwenye HTTP assertions; throttle haikulegezwa.

## Namna ya kuona kazi

Application halisi ya local imewashwa kwenye http://localhost:5186 . Ingia kwa akaunti
yako ya ADMIN, fungua `/admin`, chagua **SMS**. Hakuna akaunti ya biashara ya majaribio
iliyoongezwa. Bila provider aliyesanidiwa, historia na mipangilio vinaonekana, lakini
kitufe cha kutuma kinabaki kimezimwa. Kwenye kompyuta nyingine endesha `npm run local`
baada ya environment, PostgreSQL na migrations kutayarishwa; usitumie seed/reset kwa data iliyopo.

## Kinachobaki kabla ya SMS halisi

1. Akaunti, sender ID, quotation, credits na nyaraka za merchant; mwenye biashara achague
   provider na aidhinishe controlled live test kwa namba zake mwenyewe.
2. Kwa Beem, automatic native delivery tracking bado haijaunganishwa: nyaraka za callback
   authentication/lookup za akaunti halisi zinahitajika. Accepted si delivered. Unicode
   imezuiwa kwa adapter hii hadi encoding yake ithibitishwe.
3. Kwa mfumo wa SMS wa mmiliki wa baadaye, tekeleza mkataba wa `docs/SMS.md` au ongeza
   adapter inayotafsiri API yake. Mock iliyopita haithibitishi carrier delivery au billing.
4. Managed worker, monitoring/alerts na sera ya retention ya history viwekwe kwa hosting
   itakayochaguliwa. Dashboard ina heartbeat indicator; huduma ya nje ya alert haijaunganishwa.
5. Per-customer language, scheduled campaigns, two-way replies, marketing consent/list
   management, cost/balance sync na OTP login si sehemu ya release hii.
6. Build ya revision hii imepita, lakini production runtime na provider sandbox/live delivery
   bado hazijajaribiwa; matatizo mengine yaliyobaki kwenye audit ya awali hayajafungwa kwa build pekee.

## Migration na recovery

Migration: `prisma/migrations/202610160001_sms_outbox/migration.sql`.
Inaongeza SmsJob, SmsEvent, unique keys/indexes na foreign key inayohifadhi historia ya SMS
oda ikifutwa. Hakuna field ya biashara iliyobadilishwa kwenye data iliyopo.
Kwa deployment: backup, migrations kwa migration credentials, regenerate client, deploy
na restart web/worker. Hakiki CRUD grants za runtime role kwenye mazingira ya hosting.

Recovery ya code: zima SMS kwa env na restart huduma, rudisha code ya awali ikiwa lazima,
lakini hifadhi majedwali na history. Usifanye DROP/reset kama rollback ya kawaida.
Backup ya sasa imeundwa; restore ya backup hiyo haikuendeshwa katika kazi hii.

## Code na mkataba wa kuunganisha mfumo wa baadaye

Mafaili kamili yamo kwenye source ZIP iliyosasishwa. `CHANGES.json` ina mafaili 25
yaliyoongezwa/kubadilishwa dhidi ya archive ya kabla ya feature hii; `SMS.patch` ni diff yake.
`docs/SMS.md` ina request/response, HMAC, status lookup, idempotency na mwongozo wa kusanidi.
Secrets na backup hazipo kwenye ZIP au patch.
