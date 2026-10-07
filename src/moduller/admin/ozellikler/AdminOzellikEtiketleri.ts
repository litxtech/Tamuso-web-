/** Admin özellikler ekranı: anahtar → Türkçe başlık + kısa açıklama */

export type AdminOzellikMetni = {
  baslik: string;
  aciklama: string;
};

/** Sekme grupları — admin Özellikler UI */
export type AdminOzellikGrubu = {
  id: string;
  baslik: string;
  /** feature_flags keys; boş = yalnızca kill sekmesi */
  flagKeys: string[];
  /** kill_switches keys — Güvenlik sekmesinde */
  killKeys?: string[];
};

export const ADMIN_OZELLIK_GRUPLARI: AdminOzellikGrubu[] = [
  {
    id: 'ses',
    baslik: 'Ses / Oda',
    flagKeys: [
      'voice_rooms_enabled',
      'voice_room_music_enabled',
      'music_ducking_enabled',
      'music_playlists_enabled',
      'music_favorites_enabled',
    ],
  },
  {
    id: 'canli',
    baslik: 'Canlı / PK',
    flagKeys: [
      'live_enabled',
      'video_enabled',
      'gifts_enabled',
      'pk_enabled',
    ],
  },
  {
    id: 'canli-buton',
    baslik: 'Canlı yayın butonları',
    flagKeys: [
      'live_ui_follow_visible',
      'live_ui_coin_visible',
      'live_ui_viewers_visible',
      'live_ui_report_visible',
      'live_ui_music_visible',
      'live_ui_camera_visible',
      'live_ui_gift_visible',
      'live_ui_clip_visible',
      'live_ui_pk_visible',
      'live_ui_chat_visible',
    ],
  },
  {
    id: 'mesaj',
    baslik: 'Mesaj',
    flagKeys: [
      'messages_enabled',
      'message_reply_enabled',
      'message_edit_enabled',
      'message_pin_enabled',
      'voice_message_enabled',
      'music_message_enabled',
      'conversation_mute_enabled',
      'view_once_enabled',
      'offline_outbox_enabled',
      'link_preview_enabled',
    ],
  },
  {
    id: 'cuzdan',
    baslik: 'Cüzdan / Ödeme',
    flagKeys: [
      'iap_enabled',
      'stripe_enabled',
      'withdrawals_enabled',
      'wallet_exchange_enabled',
      'wallet_sell_enabled',
      'wallet_withdraw_enabled',
      'transaction_volume_enabled',
      'transaction_volume_profile_enabled',
      'transaction_volume_tiers_enabled',
      'transaction_volume_leaderboard_enabled',
      'transaction_volume_effects_enabled',
    ],
  },
  {
    id: 'ajans',
    baslik: 'Ajans',
    flagKeys: [
      'agency_enabled',
      'agency_verification_v2_enabled',
      'agency_verification_financial_locks',
      'agency_verification_sync_wallet_kyc',
    ],
  },
  {
    id: 'sehir',
    baslik: 'Şehir / Ülke',
    flagKeys: [
      'city_league_enabled',
      'city_battles_enabled',
      'city_elections_enabled',
      'country_league_enabled',
      'country_league_weekly_enabled',
      'country_league_all_time_enabled',
      'country_league_contributors_enabled',
      'country_league_city_integration_enabled',
      'country_league_badges_enabled',
      'country_league_rank_notifications_enabled',
    ],
  },
  {
    id: 'oyun',
    baslik: 'Oyunlar',
    flagKeys: [
      'games_enabled',
      'fruit_wheel_enabled',
      'kozmik_kaskad_enabled',
      'zeus_enabled',
      'nox_reels_enabled',
      'studio_enabled',
      'studio_menu_visible',
      'new_game_creation_enabled',
      'game_testing_enabled',
      'game_submission_enabled',
      'game_publishing_enabled',
      'ai_generation_enabled',
      'meshy_enabled',
      'elevenlabs_enabled',
      'playcanvas_enabled',
      'creator_rewards_enabled',
    ],
  },
  {
    id: 'ai',
    baslik: 'AI',
    flagKeys: [
      'ai_music_enabled',
      'ai_music_reference_enabled',
      'ai_music_status_share_enabled',
      'ai_music_voice_room_enabled',
      'ai_music_export_enabled',
      'ai_assistant_enabled',
      'live_chat_translation_enabled',
    ],
  },
  {
    id: 'sosyal',
    baslik: 'Sosyal / Hikaye',
    flagKeys: [
      'stories_enabled',
      'story_creation_enabled',
      'story_video_enabled',
      'story_links_enabled',
      'story_gifts_enabled',
      'story_discovery_enabled',
      'story_official_promotions_enabled',
      'live_clip_story_enabled',
    ],
  },
  {
    id: 'banner',
    baslik: 'Banner / Duyuru',
    flagKeys: [
      'announcements_enabled',
      'auto_promo_banners_enabled',
      'auto_event_banners_enabled',
      'events_enabled',
      'missions_enabled',
    ],
  },
  {
    id: 'kesfet',
    baslik: 'Keşif / Kişiler',
    flagKeys: [
      'people_discovery_enabled',
      'people_personalized_enabled',
      'people_gender_filter_enabled',
      'people_country_filter_enabled',
      'people_online_filter_enabled',
      'people_price_filter_enabled',
      'people_message_enabled',
      'people_voice_call_enabled',
      'people_video_call_enabled',
      'people_paid_calling_enabled',
      'people_show_prices_enabled',
      'people_show_country_flags',
      'people_show_online_indicators',
    ],
  },
  {
    id: 'unvanlar',
    baslik: 'Ünvanlar',
    flagKeys: ['user_titles_enabled', 'title_animations_enabled'],
  },
  {
    id: 'guvenlik',
    baslik: 'Güvenlik / Kill',
    flagKeys: [
      'policies_enabled',
      'moderation_enabled',
      'analytics_enabled',
      'certification_hub_enabled',
      'low_end_mode_enabled',
      'graceful_degradation_enabled',
      'stress_tools_enabled',
    ],
    killKeys: [
      'kill_coin_purchase',
      'kill_gift_send',
      'kill_withdrawal',
      'kill_agency_coin_transfer',
      'kill_live',
      'kill_pk',
      'kill_moderation',
      'kill_heavy_animations',
      'kill_livekit_reconnect',
      'kill_games',
      'kill_game_coin',
      'kill_ai_music_generation',
      'kill_ai_assistant',
      'kill_live_chat_translation',
      'kill_transaction_volume_display',
      'kill_country_league_display',
      'kill_people_discovery',
      'kill_people_paid_calls',
      'kill_offline_outbox',
      'kill_stories',
    ],
  },
];

const OZELLIK_METINLERI: Record<string, AdminOzellikMetni> = {
  voice_rooms_enabled: {
    baslik: 'Ses odaları',
    aciklama: 'Kullanıcıların sesli sohbet odalarına girip çıkmasını açar veya kapatır.',
  },
  live_enabled: {
    baslik: 'Canlı yayın',
    aciklama: 'Canlı yayın başlatma ve izleme özelliklerini kontrol eder.',
  },
  video_enabled: {
    baslik: 'Video',
    aciklama: 'Görüntülü yayın / video özelliklerini açar veya kapatır.',
  },
  gifts_enabled: {
    baslik: 'Hediyeler',
    aciklama: 'Oda ve yayında hediye gönderme özelliğini kontrol eder.',
  },
  live_ui_follow_visible: {
    baslik: 'Takip butonu',
    aciklama: 'Kapalıyken canlı yayın ekranındaki takip butonu gizlenir.',
  },
  live_ui_coin_visible: {
    baslik: 'Coin butonu',
    aciklama: 'Kapalıyken yayındaki coin bakiyesi ve yükleme butonu gizlenir.',
  },
  live_ui_viewers_visible: {
    baslik: 'İzleyici butonu',
    aciklama: 'Kapalıyken izleyici sayısı gizlenir.',
  },
  live_ui_report_visible: {
    baslik: 'Şikayet butonu',
    aciklama: 'Kapalıyken izleyicinin şikayet butonu gizlenir.',
  },
  live_ui_music_visible: {
    baslik: 'Müzik butonu',
    aciklama: 'Kapalıyken yayıncının müzik butonu gizlenir.',
  },
  live_ui_camera_visible: {
    baslik: 'Kamerayı çevir',
    aciklama: 'Kapalıyken yayıncının kamera çevirme butonu gizlenir.',
  },
  live_ui_gift_visible: {
    baslik: 'Hediye butonu',
    aciklama: 'Kapalıyken yayındaki hediye butonu gizlenir.',
  },
  live_ui_clip_visible: {
    baslik: 'Kesit butonu',
    aciklama: 'Kapalıyken yayıncının kesit paylaşma butonu gizlenir.',
  },
  live_ui_pk_visible: {
    baslik: 'PK butonu',
    aciklama: 'Kapalıyken yayıncının PK butonu gizlenir.',
  },
  live_ui_chat_visible: {
    baslik: 'Yorum kutusu',
    aciklama: 'Kapalıyken canlı yayındaki yorum yazma kutusu gizlenir.',
  },
  pk_enabled: {
    baslik: 'PK / düello',
    aciklama: 'Canlı yayın PK (karşılaşma) özelliklerini açar veya kapatır.',
  },
  agency_enabled: {
    baslik: 'Ajanslar',
    aciklama: 'Ajans ve host yönetimi özelliklerini kontrol eder.',
  },
  agency_verification_v2_enabled: {
    baslik: 'Ajans doğrulama V2',
    aciklama:
      'İki aşamalı ajans başvurusu, KYC/KYB doğrulama merkezi ve yeni başvuru state machine. Kapalıyken eski tek adımlı onay korunur.',
  },
  agency_verification_financial_locks: {
    baslik: 'Ajans finansal kilitler',
    aciklama:
      'Doğrulama tamamlanmadan çekim/settlement/dağıtım gibi hassas işlemleri server-side engeller. Varsayılan kapalı (legacy ajanslar kilitlenmez).',
  },
  agency_verification_sync_wallet_kyc: {
    baslik: 'Doğrulama → cüzdan KYC senkronu',
    aciklama:
      'Manuel/ajans kimlik onayı sonrası wallet_accounts.kyc_status ve profil rozetini senkronlar. Varsayılan kapalı.',
  },
  withdrawals_enabled: {
    baslik: 'Para çekimi (eski)',
    aciklama: 'Elmas / kazanç çekim taleplerini açar veya kapatır.',
  },
  wallet_exchange_enabled: {
    baslik: 'Cüzdan takas',
    aciklama:
      'Kullanıcı cüzdanında Takas / anlaşma butonunu ve /cuzdan/takas yolunu açar. Kapalıyken RPC da reddeder.',
  },
  wallet_sell_enabled: {
    baslik: 'Coin sat',
    aciklama: 'Coin satım izlenimi veren kullanıcı aksiyonlarını açar (varsayılan kapalı).',
  },
  wallet_withdraw_enabled: {
    baslik: 'Cüzdan çekim',
    aciklama: 'Kullanıcı cüzdanındaki Çekim sekmesini açar. Store uyumu için varsayılan kapalı.',
  },
  city_league_enabled: {
    baslik: 'Şehir ligi',
    aciklama: 'Şehir ligi ve sıralama özelliklerini kontrol eder.',
  },
  city_battles_enabled: {
    baslik: 'Şehir savaşları',
    aciklama: 'Şehirler arası savaş / skor yarışını açar veya kapatır.',
  },
  city_elections_enabled: {
    baslik: 'Şehir seçimleri',
    aciklama: 'Şehir temsilcisi seçim özelliklerini kontrol eder.',
  },
  country_league_enabled: {
    baslik: 'Ülke ligi',
    aciklama: 'Dünya Ülke Ligi / ülke katkısı özelliklerini açar veya kapatır.',
  },
  country_league_weekly_enabled: {
    baslik: 'Ülke ligi — haftalık',
    aciklama: 'Haftalık ülke sıralamasını gösterir.',
  },
  country_league_all_time_enabled: {
    baslik: 'Ülke ligi — tüm zamanlar',
    aciklama: 'Tüm zamanlar ülke sıralamasını gösterir.',
  },
  country_league_contributors_enabled: {
    baslik: 'Ülke ligi — katkıcılar',
    aciklama: 'Ülke detayında katkıcı listesini açar.',
  },
  country_league_city_integration_enabled: {
    baslik: 'Ülke ligi — şehir entegrasyonu',
    aciklama: 'Ülke detayında şehirler sekmesini açar.',
  },
  country_league_badges_enabled: {
    baslik: 'Ülke ligi — rozetler',
    aciklama: 'Ülke katkı rozetlerini gösterir.',
  },
  country_league_rank_notifications_enabled: {
    baslik: 'Ülke ligi — sıra bildirimleri',
    aciklama: 'Ülke sıra değişimi push bildirimlerini açar.',
  },
  messages_enabled: {
    baslik: 'Mesajlaşma',
    aciklama: 'Özel mesaj gönderme ve sohbet özelliklerini açar veya kapatır.',
  },
  message_reply_enabled: {
    baslik: 'Mesaj yanıtı',
    aciklama: 'DM’de mesaja yanıt vermeyi açar veya kapatır.',
  },
  message_edit_enabled: {
    baslik: 'Mesaj düzenleme',
    aciklama: 'Gönderilen metin mesajlarını düzenlemeyi açar veya kapatır.',
  },
  message_pin_enabled: {
    baslik: 'Mesaj sabitleme',
    aciklama: 'Sohbette mesaj sabitlemeyi açar veya kapatır.',
  },
  voice_message_enabled: {
    baslik: 'Sesli mesaj',
    aciklama: 'DM sesli mesaj kaydı ve gönderimini açar veya kapatır.',
  },
  music_message_enabled: {
    baslik: 'Müzik mesajı',
    aciklama: 'DM’de müzik parçası paylaşımını açar veya kapatır.',
  },
  conversation_mute_enabled: {
    baslik: 'Sohbet sessize alma',
    aciklama: 'Sohbet bildirimlerini sessize almayı açar veya kapatır.',
  },
  view_once_enabled: {
    baslik: 'Tek görüntüleme',
    aciklama: 'Tek görüntülemelik foto/video mesajlarını açar veya kapatır.',
  },
  offline_outbox_enabled: {
    baslik: 'Offline mesaj kuyruğu',
    aciklama: 'Ağ yokken mesajları yerel kuyruğa alıp sonra göndermeyi açar.',
  },
  link_preview_enabled: {
    baslik: 'Bağlantı önizleme',
    aciklama: 'DM metinlerindeki link önizlemelerini açar veya kapatır.',
  },
  events_enabled: {
    baslik: 'Etkinlikler',
    aciklama: 'Platform etkinliklerini kullanıcılara gösterir veya gizler.',
  },
  missions_enabled: {
    baslik: 'Görevler',
    aciklama: 'Günlük / dönemsel görev sistemini açar veya kapatır.',
  },
  announcements_enabled: {
    baslik: 'Duyurular',
    aciklama: 'Uygulama içi duyuru gösterimini kontrol eder.',
  },
  auto_promo_banners_enabled: {
    baslik: 'Otomatik promo bannerlar',
    aciklama:
      'Admin kampanyası yokken feed’de otomatik oda, canlı ve oyun tanıtım şeritlerini gösterir.',
  },
  auto_event_banners_enabled: {
    baslik: 'Olay otomatik bannerlar',
    aciklama:
      'Coin eşiği, koltuk dolu ve oyun harcamasında oluşan bannerlar. Admin panelinden eşikler ve TTL yönetilir.',
  },
  policies_enabled: {
    baslik: 'Politikalar',
    aciklama: 'Kullanım şartları ve onay (consent) ekranlarını kontrol eder.',
  },
  moderation_enabled: {
    baslik: 'Moderasyon',
    aciklama: 'Oda / içerik moderasyon araçlarını açar veya kapatır.',
  },
  analytics_enabled: {
    baslik: 'Analitik',
    aciklama: 'Kullanım istatistiklerinin kaydını açar veya kapatır.',
  },
  certification_hub_enabled: {
    baslik: 'Sertifikasyon merkezi',
    aciklama: 'Mağaza sertifikasyon / sağlık kontrol ekranını gösterir.',
  },
  low_end_mode_enabled: {
    baslik: 'Düşük cihaz modu',
    aciklama: 'Zayıf telefonlarda performans için sadeleştirilmiş modu açar.',
  },
  graceful_degradation_enabled: {
    baslik: 'Yumuşak düşüş',
    aciklama: 'Ağ zayıfken bazı özellikleri otomatik sadeleştirir.',
  },
  stress_tools_enabled: {
    baslik: 'Stres test araçları',
    aciklama: 'Geliştirici / test için canlı ve hediye yük araçlarını açar.',
  },
  iap_enabled: {
    baslik: 'Uygulama içi satın alma',
    aciklama: 'App Store / Play Store üzerinden coin paket satışını kontrol eder.',
  },
  stripe_enabled: {
    baslik: 'Stripe ödemesi',
    aciklama: 'Web / izinli kanallarda Stripe ile ödeme almayı açar veya kapatır.',
  },
  fruit_wheel_enabled: {
    baslik: 'Fruit Wheel',
    aciklama: 'Resmi 8 meyveli çark oyununu açar veya kapatır. Kapalıyken yeni tur açılmaz.',
  },
  games_enabled: {
    baslik: 'Oyunlar',
    aciklama: 'Tüm oyun platformunu (katalog ve giriş) açar veya kapatır.',
  },
  studio_enabled: {
    baslik: 'Tamuso Studio',
    aciklama: 'Oyun oluşturma stüdyosunun tamamını açar veya kapatır.',
  },
  studio_menu_visible: {
    baslik: 'Studio menüsü',
    aciklama: 'Hamburger menüde Tamuso Studio öğesini gösterir.',
  },
  new_game_creation_enabled: {
    baslik: 'Yeni oyun taslağı',
    aciklama: 'Kullanıcının yeni oyun taslağı oluşturmasını açar.',
  },
  game_testing_enabled: {
    baslik: 'Oyun testi',
    aciklama: 'Taslak test oturumu. Bu sürümde oynanabilir önizleme yok.',
  },
  game_submission_enabled: {
    baslik: 'Oyunu incelemeye gönderme',
    aciklama: 'Yayın öncesi gönderim. Bu sürümde inceleme kuyruğu yok.',
  },
  game_publishing_enabled: {
    baslik: 'Oyun yayınlama',
    aciklama: 'Onaylı oyunu yayına alma. Bu sürümde yayın motoru yok.',
  },
  ai_generation_enabled: {
    baslik: 'Studio yapay zekâ',
    aciklama: 'Oyun planı üretimini açar. 3D veya ses üretmez.',
  },
  meshy_enabled: {
    baslik: '3D model üretimi',
    aciklama: 'Meshy bayrağı. Bu sürümde 3D üretim bağlı değil.',
  },
  elevenlabs_enabled: {
    baslik: 'Ses üretimi',
    aciklama: 'ElevenLabs bayrağı. Bu sürümde ses üretimi bağlı değil.',
  },
  playcanvas_enabled: {
    baslik: 'Oyun önizlemesi',
    aciklama: 'PlayCanvas bayrağı. Bu sürümde oynanabilir önizleme yok.',
  },
  creator_rewards_enabled: {
    baslik: 'Creator ödülü',
    aciklama: 'Ödül programı bayrağı. Kazanç garanti edilmez ve bu sürümde ödeme yok.',
  },
  kozmik_kaskad_enabled: {
    baslik: 'Kozmik Kaskad',
    aciklama: 'Kozmik Kaskad cascade oyununu açar veya kapatır.',
  },
  zeus_enabled: {
    baslik: 'ZEUS',
    aciklama: 'ZEUS Olympus cascade oyununu açar veya kapatır.',
  },
  nox_reels_enabled: {
    baslik: 'NOX REELS',
    aciklama: 'NOX REELS slot oyununu açar veya kapatır.',
  },
  stories_enabled: {
    baslik: 'Hikayeler',
    aciklama:
      'Instagram tarzı 24s hikaye tepsi, oluşturma ve izleyiciyi açar. Kapalıyken ana sayfa tepsi gizlenir.',
  },
  story_creation_enabled: {
    baslik: 'Hikaye oluşturma',
    aciklama: 'Yeni hikaye yayınlamayı açar veya kapatır (stories_enabled gerekir).',
  },
  story_video_enabled: {
    baslik: 'Hikaye videosu',
    aciklama: 'Hikayede video medya yüklemeyi açar.',
  },
  story_links_enabled: {
    baslik: 'Hikaye linkleri',
    aciklama: 'Hikaye attachment tipinde link eklemeyi açar.',
  },
  story_gifts_enabled: {
    baslik: 'Hikaye hediyeleri',
    aciklama: 'Hikaye izleyicide mevcut hediye mağazası girişini açar (ayrı cüzdan yok).',
  },
  story_discovery_enabled: {
    baslik: 'Hikaye keşfi',
    aciklama: 'Takip dışı herkese açık keşif hikayelerini tepside gösterir (varsayılan kapalı).',
  },
  story_official_promotions_enabled: {
    baslik: 'Resmi hikaye promosyonu',
    aciklama: 'Admin resmi hikaye tepsi önceliğini açar.',
  },
  live_clip_story_enabled: {
    baslik: 'Canlı kesit hikaye',
    aciklama:
      'Yayın sahibi canlı veya PK sırasında 15–30 sn kesit alıp hikaye olarak paylaşabilir.',
  },
  voice_room_music_enabled: {
    baslik: 'Ses odası müziği',
    aciklama: 'Ses odalarında arka plan müziği kütüphanesi ve mini oynatıcıyı açar.',
  },
  music_ducking_enabled: {
    baslik: 'Müzik ducking',
    aciklama: 'Konuşma varken arka plan müziğini otomatik kısar (ActiveSpeakers).',
  },
  music_playlists_enabled: {
    baslik: 'Müzik çalma listeleri',
    aciklama: 'Kullanıcı çalma listesi oluşturma ve odaya uygulama özelliğini açar.',
  },
  music_favorites_enabled: {
    baslik: 'Müzik favorileri',
    aciklama: 'Müzik kütüphanesinde favori ekleme / filtreleme özelliğini açar.',
  },
  ai_music_enabled: {
    baslik: 'AI Müzik',
    aciklama: 'AI müzik oluşturma ve kütüphane girişini açar veya kapatır.',
  },
  ai_music_reference_enabled: {
    baslik: 'AI Müzik — referans',
    aciklama: 'Referans ses ile AI müzik üretimini açar.',
  },
  ai_music_status_share_enabled: {
    baslik: 'AI Müzik — durum paylaşımı',
    aciklama: 'Üretilen müziği durum olarak paylaşmayı açar.',
  },
  ai_music_voice_room_enabled: {
    baslik: 'AI Müzik — ses odası',
    aciklama: 'AI müziği ses odasında çalmayı açar.',
  },
  ai_music_export_enabled: {
    baslik: 'AI Müzik — dışa aktarma',
    aciklama: 'AI müzik dosyası dışa aktarmayı açar.',
  },
  ai_assistant_enabled: {
    baslik: 'DeepSeek asistan',
    aciklama: 'Tamuso uygulama asistanını (DeepSeek) açar veya kapatır.',
  },
  live_chat_translation_enabled: {
    baslik: 'Sohbet çevirisi (DeepSeek)',
    aciklama:
      'DM, canlı yayın, ses odası ve görüşme mesajlarında otomatik çeviri (üstte hedef dil, altta orijinal).',
  },
  transaction_volume_enabled: {
    baslik: 'İşlem hacmi',
    aciklama: 'İşlem hacmi sistemini (özet, kart, ayarlar) tamamen açar veya kapatır.',
  },
  transaction_volume_profile_enabled: {
    baslik: 'İşlem hacmi profil kartı',
    aciklama: 'Profil ekranlarındaki İşlem Hacmi kartını gösterir veya gizler.',
  },
  transaction_volume_tiers_enabled: {
    baslik: 'İşlem hacmi kademeleri',
    aciklama: 'Kademe (tier) etiketi, rozet ve ilerleme gösterimini açar.',
  },
  transaction_volume_leaderboard_enabled: {
    baslik: 'İşlem hacmi liderliği',
    aciklama: 'İşlem hacmi liderlik tablosunu ve katılım anahtarını açar.',
  },
  transaction_volume_effects_enabled: {
    baslik: 'İşlem hacmi efektleri',
    aciklama: 'Kademe çerçeve ve görsel efektlerinin gösterimini açar.',
  },
  people_discovery_enabled: {
    baslik: 'Kişiler keşfi',
    aciklama: 'Kişiler sayfasını ve tüm keşif girişlerini açar veya kapatır (master).',
  },
  people_personalized_enabled: {
    baslik: 'Sana Özel algoritması',
    aciklama: 'Kişiselleştirilmiş keşif sıralamasını açar.',
  },
  people_gender_filter_enabled: {
    baslik: 'Kadın/Erkek filtresi',
    aciklama: 'Keşifte cinsiyet sekmelerini gösterir.',
  },
  people_country_filter_enabled: {
    baslik: 'Ülke filtresi',
    aciklama: 'Keşifte ülke filtrelemeyi açar.',
  },
  people_online_filter_enabled: {
    baslik: 'Çevrimiçi filtresi',
    aciklama: 'Keşifte çevrimiçi kullanıcı filtresini açar.',
  },
  people_price_filter_enabled: {
    baslik: 'Coin/dk filtresi',
    aciklama: 'Keşifte fiyat aralığı filtresini açar.',
  },
  people_message_enabled: {
    baslik: 'Keşiften mesaj',
    aciklama: 'Kişiler kartından mesaj butonunu açar.',
  },
  people_voice_call_enabled: {
    baslik: 'Keşif sesli arama',
    aciklama: 'Kişiler üzerinden sesli aramayı açar.',
  },
  people_video_call_enabled: {
    baslik: 'Keşif görüntülü arama',
    aciklama: 'Kişiler üzerinden görüntülü aramayı açar.',
  },
  people_paid_calling_enabled: {
    baslik: 'Dakikalık ücretlendirme',
    aciklama: 'Ücretli 1:1 arama billing’ini açar. Kapalıyken yeni ücretli arama başlamaz.',
  },
  people_show_prices_enabled: {
    baslik: 'Kartlarda fiyat',
    aciklama: 'Keşif kartlarında coin/dk fiyatlarını gösterir.',
  },
  people_show_country_flags: {
    baslik: 'Ülke bayrağı',
    aciklama: 'Keşif kartlarında ülke bayrağı gösterimini açar.',
  },
  people_show_online_indicators: {
    baslik: 'Online gösterge',
    aciklama: 'Keşif kartlarında çevrimiçi noktasını gösterir.',
  },
  user_titles_enabled: {
    baslik: 'Ünvan rozetleri',
    aciklama: 'Dinamik kullanıcı ünvan (title badge) gösterimini açar/kapatır.',
  },
  title_animations_enabled: {
    baslik: 'Ünvan animasyonları',
    aciklama: 'Ünvan badge shimmer/glow animasyonları. Performans için kapatılabilir.',
  },
};

const KILL_METINLERI: Record<string, AdminOzellikMetni> = {
  kill_coin_purchase: {
    baslik: 'Coin satın almayı durdur',
    aciklama: 'Acil durumda tüm coin satın alma işlemlerini anında keser.',
  },
  kill_gift_send: {
    baslik: 'Hediye göndermeyi durdur',
    aciklama: 'Acil durumda hediye gönderimini anında keser.',
  },
  kill_withdrawal: {
    baslik: 'Çekim taleplerini durdur',
    aciklama: 'Acil durumda yeni para çekim taleplerini engeller.',
  },
  kill_agency_coin_transfer: {
    baslik: 'Ajans coin transferini durdur',
    aciklama: 'Ajanslar arası / ajans coin aktarımlarını anında keser.',
  },
  kill_live: {
    baslik: 'Canlı yayını durdur',
    aciklama: 'Acil durumda canlı yayınları kapatır / yeni yayını engeller.',
  },
  kill_pk: {
    baslik: 'PK’yi durdur',
    aciklama: 'Acil durumda PK / düello özelliklerini keser.',
  },
  kill_moderation: {
    baslik: 'Moderasyonu durdur',
    aciklama: 'Acil durumda otomatik / oda moderasyon akışını keser.',
  },
  kill_heavy_animations: {
    baslik: 'Ağır animasyonları durdur',
    aciklama: 'Hediye ve ağır görsel efektleri kapatarak cihaz yükünü azaltır.',
  },
  kill_livekit_reconnect: {
    baslik: 'LiveKit yeniden bağlanmayı durdur',
    aciklama: 'Ses / yayın bağlantısının otomatik yeniden denemesini keser.',
  },
  kill_games: {
    baslik: 'Oyunları durdur',
    aciklama: 'Acil durumda tüm oyun girişlerini kapatır.',
  },
  kill_game_coin: {
    baslik: 'Oyun coin harcamasını durdur',
    aciklama: 'Oyunlarda coin giriş / ödül harcamasını anında keser.',
  },
  kill_ai_music_generation: {
    baslik: 'AI müzik üretimini durdur',
    aciklama: 'Acil durumda yeni AI müzik üretimini keser.',
  },
  kill_ai_assistant: {
    baslik: 'AI asistanı durdur',
    aciklama: 'DeepSeek uygulama asistanını acil kapatır.',
  },
  kill_live_chat_translation: {
    baslik: 'Sohbet çevirisini durdur',
    aciklama: 'Canlı/oda/DM/görüşme çevirisini acil kapatır.',
  },
  kill_transaction_volume_display: {
    baslik: 'İşlem hacmi gösterimini durdur',
    aciklama: 'Acil durumda profil ve detaydaki işlem hacmi kartlarını gizler.',
  },
  kill_country_league_display: {
    baslik: 'Ülke ligi gösterimini durdur',
    aciklama: 'Acil durumda ülke ligi ekranlarını ve profil kartını gizler.',
  },
  kill_people_discovery: {
    baslik: 'Kişiler keşfini durdur',
    aciklama: 'Keşif UI ve API’yi acil kapatır; ayarlar/veri silinmez.',
  },
  kill_people_paid_calls: {
    baslik: 'Ücretli aramayı durdur',
    aciklama: 'Yeni ücretli 1:1 arama billing’ini acil keser.',
  },
  kill_offline_outbox: {
    baslik: 'Offline kuyruğu durdur',
    aciklama: 'Acil durumda offline mesaj outbox flush’unu keser.',
  },
  kill_stories: {
    baslik: 'Hikayeler kapat',
    aciklama: 'Hikaye tepsi/oluşturma/izleyiciyi acil kapatır.',
  },
};

const DUYURU_ONCELIK: Record<string, string> = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  urgent: 'Acil',
};

export function OzellikBayragiMetni(
  key: string,
  dbDescription?: string | null,
): AdminOzellikMetni {
  const sabit = OZELLIK_METINLERI[key];
  if (sabit) return sabit;
  return {
    baslik: key.replace(/_enabled$/i, '').replace(/_/g, ' '),
    aciklama: dbDescription?.trim() || 'Bu özelliğin açılıp kapanmasını kontrol eder.',
  };
}

export function KillSwitchMetni(key: string): AdminOzellikMetni {
  const sabit = KILL_METINLERI[key];
  if (sabit) return sabit;
  return {
    baslik: key.replace(/^kill_/i, '').replace(/_/g, ' '),
    aciklama: 'Acil durumda bu işlemi anında durdurur.',
  };
}

export function DuyuruOncelikEtiketi(priority: string): string {
  return DUYURU_ONCELIK[priority] ?? priority;
}
