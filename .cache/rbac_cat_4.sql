insert into public.admin_permission_catalog (permission_key, label, description, category, risk, module_href, sort_order) values
('features.toggle', 'Bayrak degistir', 'Toggle feature flag', 'FEATURE_FLAGS', 'CRITICAL', '/admin/ozellikler', 20),
('announcement.create', 'Duyuru olustur', 'Legacy', 'NOTIFICATIONS', 'MEDIUM', '/admin/duyurular', 10),
('announcement.edit', 'Duyuru duzenle', 'Legacy', 'NOTIFICATIONS', 'MEDIUM', '/admin/duyurular', 20),
('announcement.delete', 'Duyuru sil', 'Legacy', 'NOTIFICATIONS', 'HIGH', '/admin/duyurular', 30),
('announcement.publish', 'Duyuru yayinla', 'Legacy', 'NOTIFICATIONS', 'HIGH', '/admin/duyurular', 40),
('announcement.analytics', 'Duyuru analitik', 'Legacy', 'NOTIFICATIONS', 'LOW', '/admin/duyurular', 50),
('announcement.export', 'Duyuru export', 'Legacy', 'NOTIFICATIONS', 'MEDIUM', '/admin/duyurular', 60),
('announcement.view_users', 'Duyuru izleyiciler', 'Legacy', 'NOTIFICATIONS', 'MEDIUM', '/admin/duyurular', 70),
('notifications.view', 'Bildirimler', 'Push queue', 'NOTIFICATIONS', 'LOW', '/bildirimler', 80),
('notifications.manage', 'Bildirim yonet', 'Manage push', 'NOTIFICATIONS', 'MEDIUM', '/bildirimler', 90),
('analytics.view', 'Analitik gor', 'Analytics', 'ANALYTICS', 'LOW', '/admin', 10),
('ops.platform.view', 'Platform ops', 'Platform hub', 'SYSTEM_SETTINGS', 'LOW', '/platform', 10),
('ops.security.view', 'Guvenlik merkezi', 'Security center', 'SYSTEM_SETTINGS', 'MEDIUM', '/guvenlik', 20),
('ops.cert.view', 'Sertifikasyon', 'Certification', 'SYSTEM_SETTINGS', 'LOW', '/sertifikasyon', 30)
on conflict (permission_key) do update set label=excluded.label, description=excluded.description, category=excluded.category, risk=excluded.risk, module_href=excluded.module_href, sort_order=excluded.sort_order, is_active=true;