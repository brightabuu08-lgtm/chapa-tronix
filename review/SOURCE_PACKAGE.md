# Kifurushi cha source code — chapa tronix

ZIP hii ina source code ya sasa ya Next.js na Vite preview, public assets, Prisma schema na migrations zote, tests, configuration, package-lock na nyaraka za ukaguzi. Patch iliyotolewa awali ina tofauti za faili pekee; haikuwa project kamili inayojitegemea.

## Kufungua na kuendesha

1. Extract ZIP kwenye folder mpya kwa ajili ya ukaguzi. Usiitumie kufunika installation yenye data yako bila backup na kulinganisha mabadiliko.
2. Ndani ya `chapa-tronix`, endesha `npm ci` na `npm run db:generate`.
3. Fuata `README.md` na `DEPLOYMENT.md` kuchagua database na kuweka environment. `.env.example` ni mfano; credentials halisi hazimo kwenye ZIP.
4. Kwa installation yako iliyopo, hifadhi `.env`, database na uploads zilizopo. Usifanye reset, reseed au kuendesha migrations zilizokwisha kutekelezwa upya kwa mkono.
5. Application halisi ni Next.js (`npm run dev -- --port 5186` baada ya configuration). Vite (`npm run preview:dev`) ni static preview tofauti.

`node_modules`, generated Prisma client na build output hutengenezwa wakati wa installation/build. Database ya biashara, backups, credentials na picha za binafsi zilizopakiwa kwenye `.uploads` zimeachwa kwenye installation iliyopo; si sehemu ya source code archive. Public assets zinazofuatiliwa na source zimejumuishwa.

## Uthibitisho wa kifurushi

`SOURCE_MANIFEST.json` ina path, byte count na SHA-256 ya kila faili ya source iliyo ndani ya ZIP. ZIP imefunguliwa tena baada ya kuandikwa, ikalinganishwa na manifest na ikapimwa CRC. Hii inathibitisha usafirishaji wa faili, si kwamba application imepita browser au production checks.

## Kazi ambayo bado haijathibitishwa

Nyaraka za awali kwenye mzizi wa `review` ni historia ya ukaguzi wa kwanza. Kwa mabadiliko ya sasa ya kuingia kabla ya kutumia duka, soma `review/access-20261016/HANDOVER.md`, `VERIFICATION.json` na logs zake; build ya Next na customer/admin access journeys zimeendeshwa upya. Nyaraka za SMS na admin layout zipo kwenye folders zake za tarehe 20261016. Matokeo ya task moja hayamaanishi findings zote za ukaguzi wa kwanza zimefungwa. Provider sandbox integration, Docker boot, remote CI na uzinduzi bado zinahitaji uthibitisho tofauti. Dependency audit haijaendeshwa upya katika task ya access. Maamuzi ya biashara na ruhusa za live payments/email bado yanahitajika. Kifurushi hiki hakimaanishi kuwa uzinduzi umeidhinishwa.
