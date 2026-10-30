-- AI müzik haklar beyanı kayıt/giriş lobisinde gösterilmez; onay AI Müzik stüdyosunda alınır.
-- Politika aktif kalır (Politikalar ekranında okunabilir).
update public.policies
set show_on_register = false,
    show_on_login = false,
    updated_at = now()
where code = 'ai_music_rights';
