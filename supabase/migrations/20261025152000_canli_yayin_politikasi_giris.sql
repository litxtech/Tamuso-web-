-- Canlı Yayın Politikası giriş lobisi politika bağlantılarında da gösterilir.
update public.policies
set show_on_login = true,
    updated_at = now()
where code = 'live_stream';
