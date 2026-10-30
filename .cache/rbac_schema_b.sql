-- ---------------------------------------------------------------------------
-- 7) Seed permission catalog (stable keys)
-- ---------------------------------------------------------------------------
insert into public.admin_permission_catalog
  (permission_key, label, description, category, risk, module_href, sort_order)
values
  -- ADMIN MANAGEMENT
  ('admin.management.view', 'Admin yonetimini gor', 'Admin listesi ve detay', 'ADMIN_MANAGEMENT', 'HIGH', '/admin/yonetim', 10),
  ('admin.admins.view', 'Adminleri gor', 'Admin kullanici listesi', 'ADMIN_MANAGEMENT', 'HIGH', '/admin/yonetim', 20),
  ('admin.admins.create', 'Admin olustur', 'Yeni admin hesabi', 'ADMIN_MANAGEMENT', 'CRITICAL', '/admin/yonetim', 30),
  ('admin.admins.edit', 'Admin duzenle', 'Admin profil/rol', 'ADMIN_MANAGEMENT', 'CRITICAL', '/admin/yonetim', 40),
  ('admin.admins.disable', 'Admin pasiflestir', 'Suspend/disable', 'ADMIN_MANAGEMENT', 'CRITICAL', '/admin/yonetim', 50),
  ('admin.admins.delete', 'Admin sil', 'Admin yetkisini kaldir', 'ADMIN_MANAGEMENT', 'CRITICAL', '/admin/yonetim', 60),
  ('admin.permissions.view', 'Izinleri gor', 'Permission detayi', 'ADMIN_MANAGEMENT', 'HIGH', '/admin/yonetim', 70),
  ('admin.permissions.edit', 'Izinleri duzenle', 'Override ve rol izinleri', 'ADMIN_MANAGEMENT', 'CRITICAL', '/admin/yonetim', 80),
  ('admin.roles.create', 'Rol olustur', 'Custom rol', 'ADMIN_MANAGEMENT', 'CRITICAL', '/admin/yonetim', 90),
  ('admin.roles.edit', 'Rol duzenle', 'Rol izinlerini degistir', 'ADMIN_MANAGEMENT', 'CRITICAL', '/admin/yonetim', 100),
  ('admin.roles.delete', 'Rol sil', 'Custom rol sil', 'ADMIN_MANAGEMENT', 'CRITICAL', '/admin/yonetim', 110),
  ('admin.audit.view', 'Audit log gor', 'Permission audit', 'ADMIN_MANAGEMENT', 'HIGH', '/admin/yonetim', 120),

  -- DASHBOARD / APP
  ('dashboard.view', 'Dashboard gor', 'Admin hub ozeti', 'DASHBOARD', 'LOW', '/admin', 10),
  ('app.version.view', 'Surum ekrani', 'Surum ve guncelleme', 'APP_SETTINGS', 'LOW', '/admin/surum-guncelleme', 10),
  ('app.version.manage', 'Surum yonet', 'Zorunlu guncelleme ayarla', 'APP_SETTINGS', 'HIGH', '/admin/surum-guncelleme', 20),

  -- USERS
  ('users.view', 'Kullanicilari gor', 'Kullanici listesi', 'USERS', 'LOW', '/admin/kullanicilar', 10),
  ('users.search', 'Kullanici ara', 'Arama', 'USERS', 'LOW', '/admin/kullanicilar', 20),
  ('users.detail.view', 'Kullanici detay', 'Profil dosyasi', 'USERS', 'MEDIUM', '/admin/kullanicilar', 30),
  ('users.edit', 'Kullanici duzenle', 'Profil duzenleme', 'USERS', 'HIGH', '/admin/kullanicilar', 40),
  ('users.ban', 'Kullanici ban', 'Ban islemi', 'USERS', 'CRITICAL', '/admin/kullanicilar', 50),
  ('users.unban', 'Ban kaldir', 'Unban', 'USERS', 'HIGH', '/admin/kullanicilar', 60),
  ('users.suspend', 'Askıya al', 'Suspend', 'USERS', 'HIGH', '/admin/kullanicilar', 70),
  ('users.delete', 'Kullanici sil', 'Hesap silme', 'USERS', 'CRITICAL', '/admin/kullanicilar', 80),
  ('users.export', 'Kullanici export', 'CSV/export', 'USERS', 'HIGH', '/admin/kullanicilar', 90),
  ('users.finance.view', 'Kullanici finans', 'Bakiye/harcama', 'USERS', 'HIGH', '/admin/kullanicilar', 100),
  ('users.private.view', 'Ozel veri gor', 'Telefon/email vb', 'USERS', 'CRITICAL', '/admin/rehber', 110),
  ('users.admin_grant', 'Admin yetkisi ver', 'is_admin toggle', 'USERS', 'CRITICAL', '/admin/kullanicilar', 120),

  -- DIRECTORY
  ('directory.view', 'Rehber gor', 'Iletisim rehberi', 'DIRECTORY', 'HIGH', '/admin/rehber', 10),

  -- FINANCE
  ('finance.view', 'Finans gor', 'Finans dashboard', 'FINANCE', 'MEDIUM', '/admin/finans', 10),
  ('finance.revenue.view', 'Gelir gor', 'Ciro/revenue', 'FINANCE', 'MEDIUM', '/admin/ciro', 20),
  ('finance.expenses.view', 'Gider gor', 'Expenses', 'FINANCE', 'MEDIUM', '/admin/finans', 30),
  ('finance.expense.create', 'Gider olustur', 'Create expense', 'FINANCE', 'HIGH', '/admin/finans', 40),
  ('finance.expense.edit', 'Gider duzenle', 'Edit expense', 'FINANCE', 'HIGH', '/admin/finans', 50),
  ('finance.expense.delete', 'Gider sil', 'Delete expense', 'FINANCE', 'CRITICAL', '/admin/finans', 60),
  ('finance.liabilities.view', 'Yukumluluk gor', 'Liabilities', 'FINANCE', 'MEDIUM', '/admin/finans', 70),
  ('finance.pnl.view', 'P&L gor', 'Profit and loss', 'FINANCE', 'MEDIUM', '/admin/finans', 80),
  ('finance.forecast.view', 'Tahmin gor', 'Forecast', 'FINANCE', 'LOW', '/admin/finans', 90),
  ('finance.reconciliation.view', 'Mutabakat gor', 'Reconciliation', 'FINANCE', 'HIGH', '/admin/finans', 100),
  ('finance.reconciliation.run', 'Mutabakat calistir', 'Run reconciliation', 'FINANCE', 'CRITICAL', '/admin/finans', 110),
  ('finance.export', 'Finans export', 'CSV/XLSX', 'FINANCE', 'CRITICAL', '/admin/finans', 120),
  ('finance.pdf.generate', 'Finans PDF', 'PDF rapor', 'FINANCE', 'HIGH', '/admin/ciro', 130),
  ('finance.volume.view', 'Islem hacmi gor', 'Volume', 'FINANCE', 'MEDIUM', '/admin/islem-hacmi', 140),
  ('finance.league.view', 'Ulke ligi gor', 'Country league', 'FINANCE', 'LOW', '/admin/ulke-ligi', 150),
  ('finance.settings.edit', 'Finans ayar', 'Finance settings', 'FINANCE', 'CRITICAL', '/admin/ekonomi', 160),
  ('finance.commission.edit', 'Komisyon duzenle', 'Commission rates', 'FINANCE', 'CRITICAL', '/admin/komisyonlar', 170),

  -- PAYOUTS
  ('payout.view', 'Cekim gor', 'Withdrawal list', 'PAYOUTS', 'HIGH', '/admin/finans', 10),
  ('payout.approve', 'Cekim onayla', 'Approve payout', 'PAYOUTS', 'CRITICAL', '/admin/finans', 20),
  ('payout.reject', 'Cekim reddet', 'Reject payout', 'PAYOUTS', 'CRITICAL', '/admin/finans', 30),

  -- COINS / WALLET
  ('coins.view', 'Coin ekonomi gor', 'Coin economy', 'COINS', 'MEDIUM', '/admin/coin', 10),
  ('coins.sales.view', 'Coin satis gor', 'Sales', 'COINS', 'MEDIUM', '/admin/coin-paketleri', 20),
  ('coins.balance.view', 'Bakiye gor', 'User balance', 'COINS', 'HIGH', '/admin/coin', 30),
  ('coins.transactions.view', 'Coin islemleri', 'Ledger', 'COINS', 'HIGH', '/admin/coin', 40),
  ('coins.adjust', 'Coin ayarla', 'Manual adjust', 'COINS', 'CRITICAL', '/admin/coin', 50),
  ('coins.package.create', 'Paket olustur', 'Create package', 'COINS', 'HIGH', '/admin/coin-paketleri', 60),
  ('coins.package.edit', 'Paket duzenle', 'Edit package', 'COINS', 'CRITICAL', '/admin/coin-paketleri', 70),
  ('coins.package.disable', 'Paket kapat', 'Disable package', 'COINS', 'HIGH', '/admin/coin-paketleri', 80),
  ('coins.ledger.view', 'Coin ledger', 'Ledger view', 'COINS', 'HIGH', '/admin/coin', 90),
  ('wallet.ui.manage', 'Cuzdan UI yonet', 'Wallet UI CMS', 'WALLET', 'MEDIUM', '/admin/cuzdan-yonetimi', 10),
  ('wallet.exchange.view', 'Takas gor', 'Coin exchange', 'WALLET', 'MEDIUM', '/admin/takas', 20),
  ('wallet.exchange.manage', 'Takas yonet', 'Approve exchange', 'WALLET', 'HIGH', '/admin/takas', 30),
  ('wallet.iap.disputes.view', 'IAP itiraz gor', 'Purchase disputes', 'IAP', 'HIGH', '/admin/satin-alma-itirazlar', 10),
  ('wallet.iap.disputes.manage', 'IAP itiraz yonet', 'Approve/reject dispute', 'IAP', 'CRITICAL', '/admin/satin-alma-itirazlar', 20),
  ('diamonds.adjust', 'Elmas ayarla', 'Diamond adjust', 'COINS', 'CRITICAL', '/admin/coin', 100),

  -- AGENCIES
  ('agencies.view', 'Ajanslari gor', 'Agency list', 'AGENCIES', 'LOW', '/admin/ajanslar', 10),
  ('agencies.create', 'Ajans olustur', 'Create agency', 'AGENCIES', 'HIGH', '/admin/ajanslar', 20),
  ('agencies.edit', 'Ajans duzenle', 'Edit agency', 'AGENCIES', 'HIGH', '/admin/ajanslar', 30),
  ('agencies.suspend', 'Ajans askıya al', 'Suspend', 'AGENCIES', 'CRITICAL', '/admin/ajanslar', 40),
  ('agencies.delete', 'Ajans sil', 'Delete', 'AGENCIES', 'CRITICAL', '/admin/ajanslar', 50),
  ('agencies.finance.view', 'Ajans finans', 'Agency finance', 'AGENCIES', 'HIGH', '/admin/ajanslar', 60),
  ('agencies.creators.view', 'Ajans creator', 'Agency creators', 'AGENCIES', 'MEDIUM', '/admin/ajanslar', 70),
  ('agencies.users.view', 'Ajans uyeler', 'Agency users', 'AGENCIES', 'MEDIUM', '/admin/ajanslar', 80),
  ('agencies.export', 'Ajans export', 'Export', 'AGENCIES', 'HIGH', '/admin/ajanslar', 90),
  ('agencies.packages.view', 'Ajans paketleri', 'Agency packages', 'AGENCIES', 'MEDIUM', '/admin/ajans-paketleri', 100),
  ('agencies.packages.manage', 'Ajans paket yonet', 'Manage packages', 'AGENCIES', 'HIGH', '/admin/ajans-paketleri', 110),

  -- VERIFICATION / KYC (preserve existing keys)
  ('agency.application.read', 'Ajans basvuru oku', 'Legacy', 'VERIFICATION', 'MEDIUM', '/admin/dogrulama', 10),
  ('agency.application.review', 'Ajans basvuru incele', 'Legacy', 'VERIFICATION', 'HIGH', '/admin/dogrulama', 20),
  ('verification.metadata.read', 'Dogrulama metadata', 'Legacy', 'VERIFICATION', 'MEDIUM', '/admin/dogrulama', 30),
  ('verification.document.read', 'Dogrulama belge', 'Legacy', 'VERIFICATION', 'HIGH', '/admin/dogrulama', 40),
  ('verification.approve', 'Dogrulama onay', 'Legacy', 'VERIFICATION', 'CRITICAL', '/admin/dogrulama', 50),
  ('verification.reject', 'Dogrulama red', 'Legacy', 'VERIFICATION', 'CRITICAL', '/admin/dogrulama', 60),
  ('verification.request_resubmission', 'Yeniden belge iste', 'Legacy', 'VERIFICATION', 'HIGH', '/admin/dogrulama', 70),
  ('verification.override', 'Dogrulama override', 'Legacy', 'VERIFICATION', 'CRITICAL', '/admin/dogrulama', 80),
  ('verification.settings.manage', 'Dogrulama ayar', 'Legacy', 'VERIFICATION', 'CRITICAL', '/admin/dogrulama', 90),
  ('kyc.read', 'KYC oku', 'Legacy', 'VERIFICATION', 'MEDIUM', '/admin/kyc', 100),
  ('kyc.review', 'KYC incele', 'Legacy', 'VERIFICATION', 'HIGH', '/admin/kyc', 110),
  ('kyc.delete', 'KYC sil', 'Legacy', 'VERIFICATION', 'CRITICAL', '/admin/kyc', 120),
  ('kyb.read', 'KYB oku', 'Legacy', 'VERIFICATION', 'MEDIUM', '/admin/dogrulama', 130),
  ('kyb.review', 'KYB incele', 'Legacy', 'VERIFICATION', 'HIGH', '/admin/dogrulama', 140),
  ('kyc.view', 'KYC ekrani', 'KYC module view', 'VERIFICATION', 'MEDIUM', '/admin/kyc', 150),
  ('verification.view', 'Dogrulama merkezi', 'Verification hub', 'VERIFICATION', 'MEDIUM', '/admin/dogrulama', 160),

  -- MODERATION / SECURITY
  ('moderation.view', 'Moderasyon gor', 'Reports queue', 'MODERATION', 'MEDIUM', '/admin/moderasyon', 10),
  ('moderation.manage', 'Moderasyon yonet', 'Resolve reports', 'MODERATION', 'HIGH', '/admin/moderasyon', 20),
  ('live.view', 'Canli gor', 'Live rooms', 'LIVE', 'MEDIUM', '/admin/odalar', 10),
  ('live.rooms.view', 'Odalar gor', 'Room list', 'LIVE', 'MEDIUM', '/admin/odalar', 20),
  ('live.moderate', 'Canli moderate', 'Moderate live', 'LIVE', 'HIGH', '/admin/odalar', 30),
  ('live.end', 'Yayin bitir', 'End live', 'LIVE', 'HIGH', '/admin/odalar', 40),
  ('live.ban', 'Canli ban', 'Ban from live', 'LIVE', 'CRITICAL', '/admin/odalar', 50),
  ('live.analytics.view', 'Canli analitik', 'Live analytics', 'LIVE', 'LOW', '/admin/odalar', 60),
  ('security.call.view', 'Gorusme guvenlik', 'Call safety', 'SECURITY', 'HIGH', '/admin/gorusme-guvenlik', 10),
  ('security.rtc.view', 'RTC altyapi', 'RTC settings', 'SECURITY', 'HIGH', '/admin/rtc-altyapi', 20),
  ('security.rtc.manage', 'RTC yonet', 'Switch provider', 'SECURITY', 'CRITICAL', '/admin/rtc-altyapi', 30),
  ('security.platform.view', 'Platform guvenlik', 'Device/security', 'SECURITY', 'HIGH', '/admin/platform-guvenlik', 10),
  ('security.child.view', 'Cocuk koruma', 'Child protection', 'SECURITY', 'HIGH', '/admin/cocuk-koruma', 20),
  ('support.view', 'Destek gor', 'Live support', 'SUPPORT', 'LOW', '/admin/destek', 10),
  ('support.manage', 'Destek yonet', 'Assign/resolve', 'SUPPORT', 'MEDIUM', '/admin/destek', 20),

  -- STORIES / CONTENT
  ('stories.view', 'Hikaye gor', 'Stories admin', 'STORIES', 'MEDIUM', null, 10),
  ('stories.delete', 'Hikaye sil', 'Delete story', 'STORIES', 'HIGH', null, 20),
  ('stories.moderate', 'Hikaye moderate', 'Moderate story', 'STORIES', 'HIGH', null, 30),
  ('stories.reports.view', 'Hikaye rapor', 'Story reports', 'STORIES', 'MEDIUM', null, 40),
  ('stories.settings.manage', 'Hikaye ayar', 'Story settings', 'STORIES', 'HIGH', null, 50),
  ('stories.feature.toggle', 'Hikaye feature', 'Toggle story feature', 'STORIES', 'CRITICAL', null, 60),
  ('content.feedback.view', 'Fikir merkezi', 'Feedback', 'CONTENT', 'LOW', '/admin/fikirler', 10),
  ('content.feedback.manage', 'Fikir yonet', 'Manage feedback', 'CONTENT', 'MEDIUM', '/admin/fikirler', 20),
  ('content.titles.view', 'Unvanlar', 'Titles', 'CONTENT', 'LOW', '/admin/unvanlar', 30),
  ('content.titles.manage', 'Unvan yonet', 'Manage titles', 'CONTENT', 'MEDIUM', '/admin/unvanlar', 40),
  ('content.music.view', 'Muzik merkezi', 'Music', 'CONTENT', 'LOW', '/admin/muzik', 50),
  ('content.music.manage', 'Muzik yonet', 'Manage music', 'CONTENT', 'MEDIUM', '/admin/muzik', 60),
  ('content.ai_music.view', 'AI muzik', 'AI music', 'CONTENT', 'LOW', '/admin/ai-muzik', 70),
  ('content.ai_music.manage', 'AI muzik yonet', 'Manage AI music', 'CONTENT', 'MEDIUM', '/admin/ai-muzik', 80),
  ('content.banners.view', 'Bannerlar', 'Banners', 'CONTENT', 'LOW', '/admin/bannerlar', 90),
  ('content.banners.manage', 'Banner yonet', 'Manage banners', 'CONTENT', 'MEDIUM', '/admin/bannerlar', 100),
  ('content.lobby.view', 'Giris lobisi', 'Login lobby', 'CONTENT', 'LOW', '/admin/giris-lobisi', 110),
  ('content.lobby.manage', 'Lobi yonet', 'Manage lobby', 'CONTENT', 'MEDIUM', '/admin/giris-lobisi', 120),
  ('content.policies.view', 'Politikalar', 'Policies', 'CONTENT', 'LOW', '/admin/politikalar', 130),
  ('content.policies.manage', 'Politika yonet', 'Manage policies', 'CONTENT', 'HIGH', '/admin/politikalar', 140),
  ('content.menu.view', 'Hamburger menu', 'Menu CMS', 'CONTENT', 'LOW', '/admin/hamburger-menu', 150),
  ('content.menu.manage', 'Menu yonet', 'Manage menu', 'CONTENT', 'MEDIUM', '/admin/hamburger-menu', 160),
  ('content.register.view', 'Kayit alanlari', 'Register fields', 'CONTENT', 'LOW', '/admin/kayit-alanlari', 170),
  ('content.register.manage', 'Kayit alan yonet', 'Manage fields', 'CONTENT', 'MEDIUM', '/admin/kayit-alanlari', 180),
  ('content.contact.view', 'Kurumsal iletisim', 'Contact', 'CONTENT', 'LOW', '/admin/iletisim', 190),
  ('content.contact.manage', 'Iletisim yonet', 'Manage contact', 'CONTENT', 'MEDIUM', '/admin/iletisim', 200),
  ('content.share.view', 'Paylasim linkleri', 'Share links', 'CONTENT', 'LOW', '/admin/paylasim-linkleri', 210),
  ('content.share.manage', 'Link yonet', 'Manage links', 'CONTENT', 'MEDIUM', '/admin/paylasim-linkleri', 220),
  ('content.discovery.view', 'Kisiler aramalar', 'Discovery', 'CONTENT', 'LOW', '/admin/kisiler-aramalar', 230),
  ('content.discovery.manage', 'Kesif yonet', 'Manage discovery', 'CONTENT', 'HIGH', '/admin/kisiler-aramalar', 240),
  ('content.city.view', 'Sehir secimleri', 'City votes', 'CONTENT', 'LOW', '/admin/sehir-secim', 250),
  ('content.city.manage', 'Sehir yonet', 'Manage city votes', 'CONTENT', 'MEDIUM', '/admin/sehir-secim', 260),

  -- GAMES / STUDIO
  ('games.view', 'Oyunlari gor', 'Games list', 'GAMES', 'LOW', '/admin/oyunlar', 10),
  ('games.create', 'Oyun olustur', 'Create game', 'GAMES', 'HIGH', '/admin/oyunlar', 20),
  ('games.edit', 'Oyun duzenle', 'Edit game', 'GAMES', 'HIGH', '/admin/oyunlar', 30),
  ('games.approve', 'Oyun onayla', 'Approve', 'GAMES', 'HIGH', '/admin/oyunlar', 40),
  ('games.reject', 'Oyun reddet', 'Reject', 'GAMES', 'HIGH', '/admin/oyunlar', 50),
  ('games.publish', 'Oyun yayinla', 'Publish', 'GAMES', 'CRITICAL', '/admin/oyunlar', 60),
  ('games.unpublish', 'Yayindan kaldir', 'Unpublish', 'GAMES', 'HIGH', '/admin/oyunlar', 70),
  ('games.finance.view', 'Oyun finans', 'Game finance', 'GAMES', 'HIGH', '/admin/oyunlar', 80),
  ('games.analytics.view', 'Oyun analitik', 'Game analytics', 'GAMES', 'LOW', '/admin/oyunlar', 90),
  ('games.disable', 'Oyun kapat', 'Disable game', 'GAMES', 'CRITICAL', '/admin/oyunlar', 100),
  ('games.feature.toggle', 'Oyun feature', 'Toggle game feature', 'GAMES', 'CRITICAL', '/admin/oyunlar', 110),
  ('games.test.view', 'Oyun test', 'Game test', 'GAMES', 'MEDIUM', '/admin/oyun-test', 120),
  ('games.algorithm.view', 'Oyun algoritma', 'Algorithm', 'GAMES', 'HIGH', '/admin/oyun-algoritma', 130),
  ('games.algorithm.manage', 'Algoritma yonet', 'Manage algorithm', 'GAMES', 'CRITICAL', '/admin/oyun-algoritma', 140),
  ('games.kaskad.view', 'Kaskad yonetim', 'Kaskad', 'GAMES', 'MEDIUM', '/admin/kaskad-yonetim', 150),
  ('games.kaskad.manage', 'Kaskad yonet', 'Manage kaskad', 'GAMES', 'HIGH', '/admin/kaskad-yonetim', 160),
  ('games.fruit_wheel.view', 'Fruit Wheel', 'Fruit wheel', 'GAMES', 'MEDIUM', '/admin/fruit-wheel', 170),
  ('games.fruit_wheel.manage', 'Fruit Wheel yonet', 'Manage fruit wheel', 'GAMES', 'HIGH', '/admin/fruit-wheel', 180),
  ('studio.view', 'Tamuso Studio', 'Creator studio', 'CREATOR_STUDIO', 'LOW', '/admin/studio', 10),
  ('studio.manage', 'Studio yonet', 'Publish studio games', 'CREATOR_STUDIO', 'HIGH', '/admin/studio', 20),

  -- ECONOMY / FEATURE FLAGS
  ('economy.view', 'Ekonomi merkezi', 'Economy', 'ECONOMY', 'MEDIUM', '/admin/ekonomi', 10),
  ('economy.manage', 'Ekonomi yonet', 'Manage economy', 'ECONOMY', 'CRITICAL', '/admin/ekonomi', 20),
  ('features.view', 'Ozellik bayraklari', 'Feature flags', 'FEATURE_FLAGS', 'MEDIUM', '/admin/ozellikler', 10),
  ('features.toggle', 'Bayrak degistir', 'Toggle feature flag', 'FEATURE_FLAGS', 'CRITICAL', '/admin/ozellikler', 20),

  -- ANNOUNCEMENTS (preserve)
  ('announcement.create', 'Duyuru olustur', 'Legacy', 'NOTIFICATIONS', 'MEDIUM', '/admin/duyurular', 10),
  ('announcement.edit', 'Duyuru duzenle', 'Legacy', 'NOTIFICATIONS', 'MEDIUM', '/admin/duyurular', 20),
  ('announcement.delete', 'Duyuru sil', 'Legacy', 'NOTIFICATIONS', 'HIGH', '/admin/duyurular', 30),
  ('announcement.publish', 'Duyuru yayinla', 'Legacy', 'NOTIFICATIONS', 'HIGH', '/admin/duyurular', 40),
  ('announcement.analytics', 'Duyuru analitik', 'Legacy', 'NOTIFICATIONS', 'LOW', '/admin/duyurular', 50),
  ('announcement.export', 'Duyuru export', 'Legacy', 'NOTIFICATIONS', 'MEDIUM', '/admin/duyurular', 60),
  ('announcement.view_users', 'Duyuru izleyiciler', 'Legacy', 'NOTIFICATIONS', 'MEDIUM', '/admin/duyurular', 70),
  ('notifications.view', 'Bildirimler', 'Push queue', 'NOTIFICATIONS', 'LOW', '/bildirimler', 80),
  ('notifications.manage', 'Bildirim yonet', 'Manage push', 'NOTIFICATIONS', 'MEDIUM', '/bildirimler', 90),

  -- ANALYTICS / OPS
  ('analytics.view', 'Analitik gor', 'Analytics', 'ANALYTICS', 'LOW', '/admin', 10),
  ('ops.platform.view', 'Platform ops', 'Platform hub', 'SYSTEM_SETTINGS', 'LOW', '/platform', 10),
  ('ops.security.view', 'Guvenlik merkezi', 'Security center', 'SYSTEM_SETTINGS', 'MEDIUM', '/guvenlik', 20),
  ('ops.cert.view', 'Sertifikasyon', 'Certification', 'SYSTEM_SETTINGS', 'LOW', '/sertifikasyon', 30)
on conflict (permission_key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  risk = excluded.risk,
  module_href = excluded.module_href,
  sort_order = excluded.sort_order,
  is_active = true;

-- Ensure every existing role_permission code is in catalog
insert into public.admin_permission_catalog (permission_key, label, category, risk, sort_order)
select distinct p.permission_code, p.permission_code, 'LEGACY', 'MEDIUM', 900
from public.admin_role_permissions p
where not exists (
  select 1 from public.admin_permission_catalog c where c.permission_key = p.permission_code
)
on conflict do nothing;
