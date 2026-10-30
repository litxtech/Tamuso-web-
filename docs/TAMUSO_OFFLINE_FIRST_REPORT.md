# TAMUSO OFFLINE-FIRST IMPLEMENTATION REPORT

Tarih: 2026-10-08  
Kapsam: Tamuso mobil uygulaması (Expo / React Native). Web sitesi, landing ve SEO bu işte değiştirilmedi.

## Mevcut mobil teknoloji

- Çatı: Expo SDK 57, React Native 0.86, expo-router, TypeScript.
- Android ve iOS aynı kod tabanından EAS ile derlenir. Canlı ses/video LiveKit ve Agora üzerindedir; bu bağlantılar çevrimdışı çalıştırılmaz.
- Durum: ekran bazlı React state. Ayrı bir Redux/MobX katmanı yok.
- API ve veritabanı: Supabase (Postgres RPC, Auth, Storage, Realtime).
- Kimlik: Supabase Auth. Oturum belirteci SecureStore / Supabase oturum deposunda kalır. Offline önbelleğe parola, gizli anahtar veya access token yazılmaz.
- Bildirim: expo-notifications. Yeni sahte bildirim üretilmez; son liste önbelleğe alınır.
- Medya: expo-image-picker, expo-video, mevcut `DepoyaMedyaYukle` (video 1080p sıkıştırma).
- Hikaye, direkt mesaj, profil, keşfet, durum akışı ve ses odaları mevcut modüllerine bağlandı. Mesaj outbox (`MesajOutboxDepolama`) duruyor; flush üstüne yerel dosya yükleme ve deneme tavanı eklendi.

Yeni paket eklenmedi. Depo: AsyncStorage (metadata) + `expo-file-system` (medya dosyası) + `expo-network` (tek ağ dinleyicisi).

## Cache mimarisi

Modül: `src/moduller/cevrimdisi/`.

- Her kayıt `tamuso.of.v1:{userId}:{alan}` anahtarında, şema sarmalayıcısı `{ schema: 1, data }` ile durur.
- Bozuk JSON okununca ekran düşmez; o alan boş kabul edilir.
- Şemasız eski dizi/nesne v1 veri olarak okunur.
- Alanlar: feed (son 80), durum akışı, hikaye tepsi+grup, profil (son 40), keşfet, bildirim, oda, kuyruk, taslak, medya indeksi, ayar, meta.
- Ağ durumları tek merkezde: `ONLINE`, `OFFLINE`, `RECONNECTING`, `SYNCING`, `SYNC_ERROR`. Ekranlar ikinci bir NetInfo dinleyicisi açmaz; mevcut `AgBaglantisiIzleyici` kullanılır.
- Üstte ince şerit ve kısa toast. Tam ekran “sunucuya bağlanılamadı” duvarı yok. Web’de şerit çizilmez.

## Media cache

- Sıradaki tek hikaye medyası indirilir. Tüm tepsi çekilmez.
- Fotoğraf: görüntülenen `thumbnail_url` veya `media_url`. Ayrı 10–20 MB orijinal indirilmez.
- Video: varsayılan yalnız Wi-Fi. Ayar: Wi-Fi veya Wi-Fi + mobil veri.
- Mobil veride medya önbelleği varsayılan kapalı; kullanıcı açabilir.
- Yükleme anında mevcut sıkıştırma yolu (`DepoyaMedyaYukle` / 1080p) kullanılır.
- Byte-range resumable upload bu depoda yok. Başarısız video, yerel dosyadan yeniden denenir (idempotent `client_id`).
- Çevrimdışı video kuyruğu 80 MB üstünü almaz; daha büyük dosya taslakta kalır.

## Story cache

- Grup, `expires_at` ile saklanır.
- Süresi dolmuş öğe, dosyası duruyor olsa bile tepside ve oynatıcıda gösterilmez.
- Expiry bilinmiyorsa öğe gösterilmez.
- Hikaye izlerken sonraki kare, veri politikası izin verirse tek seferde ön yüklenir.

## DM queue

- Metin: mevcut outbox + `client_id` (sunucu idempotency).
- UI: kuyrukta “Gönderilecek”.
- Fotoğraf çevrimdışıyken yerel URI ile kuyruğa girer; bağlantı gelince `dm-media` yüklenir, sonra mesaj gider.
- Video aynı yolu kullanır; Wi-Fi ayarı ve boyut tavanı vardır.
- Deneme tavanı 6. Çökmede `SENDING` kayıt açılışta `QUEUED` olur.
- Kullanıcıya bağlı olmayan sohbet sayfa önbelleği çıkışta silinir.

## Post queue

- Çevrimdışı paylaşım taslak olur. Metin “Taslak olarak kaydedildi”.
- Otomatik yayın varsayılan kapalı.
- Açılırsa yalnızca https medyası olan metin taslakları senkron sırasında gider. Yerel dosya kendiliğinden yayınlanmaz.

## Sync engine

Öncelik: mesaj outbox, sonra yorum, beğeni, takip, gönderi, fotoğraf, video.  
Aynı anda tüm kuyruk basılmaz; kayıtlar sırayla gider.  
Backoff: 1s, 2s, 4s, 8s, 16s, 30s. Altıncı başarısızlıktan sonra `FAILED`.  
Tetik: yeniden bağlanma ve uygulama öne gelince. Sürekli zamanlayıcı veya arka plan wake-up yok.

## Conflict resolution

Sunucu mesajı `server_deleted`, `user_blocked`, `post_deleted`, `conversation_deleted`, `account_disabled`, `content_expired` olarak sınıflanır.  
Kayıt `FAILED` kalır; yerel satır sessizce silinmez.  
Beğeni ve takip, RPC’den önce sunucu durumu okunur; istenen durum zaten varsa ikinci olay gitmez. Like/unlike zincirinin yalnız son hali kuyrukta durur.

## Cache limitleri ve storage policy

- Otomatik tavan: 700 MB (500 MB–1 GB bandı).
- Manuel kayıt hedefi 2 GB’dir ama boş alanın %20’sini geçmez.
- 700 MB boş diskte 2 GB önbellek açılmaz.
- 200 MB altı boş alanda medya büyütülmez ve yeni indirme yapılmaz.
- LRU sırası (önce silinen): eski medya, keşfet, feed, profil, hikaye, son görüntülenen.
- Taslak ve `pin` (manuel) otomatik silinmez.
- Ayarlarda ayrı temizlik: feed, story, keşfet, fotoğraf, video. Taslaklar bu düğmelerle silinmez.

## Security ve privacy

- Önbellekte parola, secret, API key, access token yok.
- Anahtarlar kullanıcı kimliğine bağlı. A çıkış yapıp B girince B, A’nın anahtarını okumaz.
- Profil anlık görüntüsü telefon, doğum tarihi ve özel alan içermez; ad, kullanıcı adı, bio, avatar, kapak ve temel seviye kalır.
- Takip çevrimdışıyken kesinleşmiş sayılmaz: düğme geri alınır, istek kuyrukta bekler.
- Çıkış, kullanıcı öneksiz DM sayfa önbelleğini ve bellek outbox’ını temizler. Aynı hesabın taslakları diskte kendi anahtarında durur.

## Battery ve mobil veri

- Senkron döngüsü yok. Yalnız reconnect ve foreground.
- Android/iOS arka plan kısıtını delen bir task eklenmedi.
- Düşük pil API’si projede yok (`expo-battery` eklenmedi). Video senkronu varsayılan Wi-Fi; mobil veri kapalıyken agresif medya senkronu yapılmaz.

## Test sonuçları

`npm run test:cevrimdisi` — geçti.

Kapsananlar: backoff, kota (700 MB boşta 2 GB yok), story expiry, like birleştirme (son durum tek LIKE), yorum idempotency, çökmede PROCESSING→PENDING, LRU’nun taslak/manuel kaydı silmemesi, bozuk JSON, hesap izolasyonu, video’nun Wi-Fi yokken beklenmesi, silinmiş içeriğin FAILED kalması.

Kabul senaryosunun mantık provası aynı testte: feed, süresi dolmamış story, profil ve mesaj anlık görüntüsü yeniden okunur; “Tamam.” yorumu ve like zinciri tek gönderimle kuyruğu boşaltır.

Bu oturumda fiziksel cihazda uçak modu, zayıf ağ veya mağaza derlemesi çalıştırılmadı.

## Build sonucu

Yeni native binary alınmadı. `tsc --noEmit` projede bu değişiklikten önce de duran i18n / feed ızgara hataları veriyor. Yeni offline modül dosyalarında bu turda ayrı bir tip hatası görünmedi.

## Kalan sorunlar

- Yorum `client_id` için 5 argümanlı `durum_yorum_ekle` eklendi. Sunucu bu argümanı henüz tanımazsa istemci 4 argümanlı çağrıya döner; o durumda zaman aşımı kuyruğa yazılmaz.
- Ana sayfa kaydı “son görülen” gösterir, dinleyici sayısını canlı gibi basmaz.
- Taslak listesinde “Şimdi paylaş” vardır; otomatik paylaşım kapalı kalır. Yorum taslağı bekler.
- Hikaye ve gönderi menüsünden çevrimdışı kayıt pinlenir; boş disk 200 MB altındayken medya büyümez.
- Mesaj konu listesi kullanıcıya özel diske yazılır.
- Kuyruktaki yorumun gövdesine “Bekliyor” yazılmaz; durum ayrı satırdadır.
- Video yüklemesi byte-range resume değil; tüm dosya yeniden gider.
- Hikaye, expiry’si bilinen grup önbelleğindeyse çevrimdışı açılır. Hiç açılmamış hikayenin süresi bilinmediği için gösterilmez.
- Canlı oda sesi/videosu çevrimdışı bağlanmaz; “Bu oda için bağlantı gerekiyor” yazılır.
- Düşük pil ölçümü için ayrı native modül yok.
