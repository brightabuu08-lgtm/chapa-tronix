# Stock na discount — marekebisho ya 2026-10-13

## Kilichokaguliwa

Bei ya discount ilihifadhiwa kama `price` ya kuuza na `oldPrice` ya kawaida. Orodha ya admin ilionyesha bei hizo lakini haikuwa na safu ya asilimia ya punguzo. Stock ya bidhaa iliyopo ilikuwa read-only kwa makusudi ili fomu ya zamani isifute stock iliyopunguzwa na mauzo. Inventory adjustment ilikuwa imefichwa kwenye disclosure chini ya product editor, callback yake haikusasisha fomu wala catalog, na refresh yake ilitafuta bidhaa kwenye ukurasa wa kwanza tu wa admin products.

## Marekebisho

- `components/admin/Admin.tsx`: safu ya Punguzo (%) na kitufe cha Ongeza stock kwenye kila bidhaa kwa admin. Kitufe kinafungua fomu ya bidhaa hiyo yenye jina lake; kuhifadhi kunasasisha orodha na catalog.
- `components/admin/InventoryAdjustment.tsx`: fomu inafunguka kwenye stock action na editor, inaeleza kuongeza/punguza idadi, inaonyesha stock ya sasa, inafuta input baada ya success na inapakia bidhaa kwa ID badala ya kutafuta first page. Concurrency/version validation na ledger zinabaki server-side.
- `components/admin/ProductEditor.tsx`: stock read-only inaonyesha idadi mpya baada ya adjustment; catalog inasasishwa. Metadata save bado hairuhusiwi ku-overwrite stock.
- `components/admin/VariantManager.tsx`: adjustment inasasisha variant na catalog; asilimia ya punguzo inaonekana pamoja na regular/selling prices.
- `lib/api/admin-routes.ts`: authenticated staff/admin GET ya bidhaa moja kwa ID, 404 kama haipo. Inventory mutation bado inahitaji admin.

## Verification mpya

- `npm test`: tests 30 zimepita, 0 failures.
- `npm run test:review`: regression checks 26 zimepita kwenye `chapa_tronix_test`; provider na email zimezimwa/mocked. Tests mpya zinathibitisha kuongeza stock kutoka 0 kwenye product na variant zilizopo, kutunza ID, kutunza stock baada ya metadata save na kurudisha bei ya punguzo kwenye admin pagination.
- `npm run lint`: TypeScript AST lint, files 113, errors 0.
- `npm run typecheck`: passed.
- `tests/review-browser.mjs`: assertions zimeongezwa kwa kuonekana kwa 25% discount na direct restock action +5, kisha metadata save kutunza stock 8. Browser run **Haijathibitishwa**; hakuna browser tool katika session hii na hakuna listener ya localhost:3000 iliyoonekana katika environment inayofikiwa. Tests hizo hazijatumiwa kudai UI imepitishwa.

Hakuna migration mpya. Database ya biashara haijaandikwa na tests hizi, wala stock ya biashara kuongezwa kwa majaribio. Previous production/provider/browser limitations kwenye REVIEW_HANDOVER.md bado zinatumika. Source ZIP na patch zimesasishwa kwa source hii; previous verification logs hazibadilishwi kuwa ushahidi wa runs hizi.


## Follow-up: origin error na kufuta bidhaa

Picha ilionyesha `Website origin is not configured. Check APP_URL.` Local trusted origins zimeongezewa localhost/127.0.0.1 kwenye port 3000, bila kuondoa origins zilizokuwepo. `.env.example` imesasishwa. Hakuna wildcard au origin-validation bypass; process irestart kupokea environment mpya.

Admin ina filter Zinazouzwa / Zilizoondolewa / Bidhaa zote, default Zinazouzwa. Futa bidhaa ina confirmation na transactional archiveProduct (active=false + audit). Product inaondoka catalog/active list; stock, images na order links hubaki. Restore ipo. Hakuna hard deletion au migration mpya.

Fresh runs: npm test 31 passed; npm run test:review 27 passed kwenye test DB; npm run typecheck exit 0; npm run lint errors 0. First integration/typecheck attempts failed because new test used catalogPage.items instead of products; corrected test property and reran both successfully. Browser removal/restore test source added, execution Haijathibitishwa. Actual port-3000 HTTP mutation after restart Haijathibitishwa.


## Hydration screenshot follow-up — 2026-10-15

User screenshot showed SSR /contact versus client /track-order in StoreFooter. Current source renders both links in a deterministic order. Fresh Chrome on the running website returned HTTP 200 with zero page/console hydration errors. Added tests/hydration-browser.mjs, then ran `node tests/hydration-browser.mjs`: 4 scenarios passed (desktop/mobile x saved sw/en), covering SSR links, initial hydration, reload, client navigation to tracking and reload there. Visits were read-only; no business records mutated. The reported failure was not reproduced, so no speculative UI/hydration suppression was added. An older open browser document or assets may explain it, but that cause is not established. Refresh the original user tab and check again if it recurs. This run supersedes the previous inability to execute browser checks only for these four scoped scenarios; it does not certify checkout/admin/provider journeys.
