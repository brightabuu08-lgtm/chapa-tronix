# Admin na customer: fremu tofauti

16 Oktoba 2026. Marekebisho yapo kwenye website halisi ya local, si picha au mockup.

- `/admin` ina header yake yenye brand, identity/role, kubadili lugha, View store na Sign out.
- Admin haionyeshi StoreHeader, FundingTeaser, Newsletter, StoreFooter/WhatsApp,
  MobileBottomNav au cookie banner ya customer. Storefront/account ya customer haijabadilishwa.
- Admin/staff wanaweza kuingia moja kwa moja kwenye `/admin`. Hakuna self-registration
  ya admin. Customer akiingia hapo anaona ujumbe wa kutokuwa na ruhusa na njia ya kubadili akaunti.
- Admin component inarudishwa upya account identity ikibadilika, ili data/section ya account
  ya zamani isibaki kwa aliyeingia baadaye. API role checks zilizopo hazijalegezwa.
- CSS ya admin ni `app/admin.css`, yenye selectors zilizofungwa kwa admin. Mobile customer
  bottom-nav padding haichukui nafasi kwenye admin. Static preview ina CSS hiyo pia.
- Usimamizi wa maombi ya ideas, chat, bidhaa, oda na features nyingine umehifadhiwa.
  Kuondoa CTA ya kusajili wazo hakumaanishi kuondoa moderation ya maombi ya wateja.

Browser verification: makundi 9 yamepita kwa anonymous/admin/customer/staff; viewport
360/768/1440, hakuna page overflow au JavaScript runtime errors. Login/logout, product
management, View store/back na customer layout zimehakikiwa. Browser ilitumia synthetic
API fixtures; hakuna business database mutations. Huu si ushahidi mpya wa live auth/provider
integration; backend auth haijabadilishwa katika kazi hii.

Typecheck, custom AST lint (143 files, errors 0) na static Vite preview build zimepita.
Next production build ya revision hii imepita (exit 0); ushahidi upo kwenye build.log. Hakuna migration,
secrets, provider activation, production publish au mabadiliko ya bidhaa/stock/oda.

Mafaili: components/admin/AdminShell.tsx, components/admin/AdminAccess.tsx,
components/admin/Admin.tsx, components/Store.tsx, app/admin.css, app/layout.tsx,
preview/main.tsx na README.md. Muonekano wa customer unarender kwa routes zake pekee;
View store huirudisha admin kwenye duka la kawaida kwa hiari.
