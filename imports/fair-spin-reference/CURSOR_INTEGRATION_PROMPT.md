# Cursor için Fair Spin aktarım ve entegrasyon talimatı

## Amaç

Bu Replit projesindeki **Fair Spin oyununun ön yüzünü** (tasarım, çark animasyonu,
geri sayım, sonuç ekranı, yüksek kazanç efektleri ve sesler) mevcut canlı
uygulamaya ayrı bir oyun modülü olarak taşı. **Canlı uygulamanın kendi oyun
algoritması, RNG'si, bahis/cüzdan sistemi ve yetkilendirmesi tek doğruluk
kaynağıdır.** Replit'teki örnek API ve tarayıcı içi demo bakiyesini üretime
taşıma. Mevcut uygulama dosyalarını silme veya mevcut oyunları bozma.

## Kaynağı nasıl alacaksın?

1. Bu dosyayla birlikte verilen `fair-spin-cursor-transfer.zip` paketini
   indirip aç; içeriği ana uygulamanın deposunda örneğin
   `imports/fair-spin-reference/` altında **referans kaynak** olarak tut.
   Alternatif olarak Replit projesini kendi GitHub deposuna aktarıp Cursor'da
   ikinci klasör olarak açabilirsin. Replit önizleme adresi kaynak kod
   değildir; yalnızca görsel karşılaştırma içindir.
2. Paketteki `artifacts/fair-spin/src/` oyun arayüzünü,
   `artifacts/fair-spin/public/audio/` ses dosyalarını,
   `artifacts/fair-spin/package.json` bağımlılık referansını içerir. Kaynak
   görüntü ve işleyişi bu dosyalardan oku; bütün Replit monoreposunu ana
   uygulamaya kopyalama.
3. Yeni bir branch aç. Önce ana uygulamanın çatı yapısını, mevcut oyun
   algoritmasını, auth, cüzdan ve ödeme sınırlarını incele.

## Entegrasyon kuralları

1. Oyunu ayrı rota veya bileşen olarak ekle. Çarkın 8 ödül yuvası, sunucu
   sonucunda hedefe duruşu, 3-2-1 geri sayımı, ses senkronu, yüksek kazanç
   efekti, mobil düzen ve ses aç/kapat kontrolünü koru. Mevcut tasarımın
   görsel diline gerekli küçük uyarlamaları yap.
2. `src/pages/home.tsx` içindeki `@workspace/api-client-react` kancaları,
   `src/store/use-game-store.ts` içindeki başlangıç bakiyesi ve
   `src/pages/admin.tsx` **demo bağlantılarıdır**. Bunları kopyalayıp canlı
   kullanıcı hesabı, para ya da RTP yöneten kod olarak kullanma.
3. Ön yüzle ana uygulamanın sunucu/oyun motoru arasına bir adaptör kur:
   sunucudan segment kimlikleri, çarpan etiketleri, izin verilen bahisler,
   güncel bakiye ve yakın sonuçları al; dönüş isteğinde uygulamanın mevcut
   oturumunu ve bahis API'sini kullan; başarılı yanıttaki `segmentId`,
   `payout` ve güncel bakiyeyi UI'ya geçir. Sonuç ve bakiye istemcide
   hesaplanmamalı; animasyon yalnızca sunucunun verdiği sonuca durmalı.
4. Mevcut dosyalardaki `selectedSegmentIds` (şu an tüm segmentler seçiliyor),
   örnek ağırlıklar/RTP, `proof` biçimi ve demo admin profil değiştirme
   davranışı ana uygulamanın oyun kuralları **değildir**. Bunları otomatik
   olarak mevcut algoritmaya ekleme veya yayınlama. Bahis akışını ana
   uygulamanın gerçek sözleşmesine göre adapte et; kullanıcıya özel gizli
   kazandırma/kaybettirme mekanizması ekleme.
5. `/admin` sayfasını olduğu gibi herkese açık taşıma. Gerekliyse ana
   uygulamanın mevcut yönetici yetkileriyle yeniden bağla; değilse oyunun
   yanında yayınlama.
6. Sesler `/audio/...` yollarını kullanıyor. Ana uygulamanın base path ve
   statik varlık düzenine uygun yere kopyala, bütün ses URL'lerini buna göre
   düzelt. Çark sesi geri sayımda değil, gerçek dönüş animasyonu başladığında
   çalsın; tur bittiğinde dursun. `prefers-reduced-motion` davranışını koru.
7. `@/` import alias'larını, Tailwind/CSS kurulumunu, gerekli paketleri ve
   yönlendirmeyi ana uygulamanın teknoloji yığınına uyarla. Kaynak React/Vite
   ve Tailwind kullanıyor; farklı bir yığında bileşenleri dönüştürmen gerekir.
   Replit'e özgü Vite eklentilerini ve `@workspace/*` paketlerini taşımak
   zorunda değilsin.
8. Başarısız isteklerde bahis/bakiye durumunu ana uygulamanın sunucu
   işlem kaydına göre göster; istemci tarafında yalnızca varsayımsal iade
   yapma. Çift tıklama, geç gelen yanıt, yeni tur ve sayfa yenileme
   senaryolarını ele al.
9. Kod tipi/derleme kontrolünü ve ana uygulamanın testlerini çalıştır. En az
   iki ardışık dönüşte çarkın gerçekten durduğunu, sesin dönüşle aynı anda
   başladığını, sonucun sunucu yanıtıyla eşleştiğini, bakiyenin yenilemeden
   sonra doğru kaldığını ve yetkisiz kullanıcının admin ayarını
   değiştiremediğini doğrula.
10. Bitince değiştirilen dosyaları, oyun motoru–arayüz adaptörünün sınırlarını,
    test sonuçlarını ve geri alma adımlarını raporla. Canlıya alma kararını
    testlerden sonra proje sahibi versin.

## Kaynak dosyalar

- Oyun akışı: `artifacts/fair-spin/src/pages/home.tsx`
- Çark: `artifacts/fair-spin/src/components/wheel.tsx`
- Görsel stiller: `artifacts/fair-spin/src/index.css`
- Ses yönetimi: `artifacts/fair-spin/src/lib/audio.ts`
- Kazanç efekti: `artifacts/fair-spin/src/components/high-win-overlay.tsx`
- UI yerleşimi: `artifacts/fair-spin/src/components/layout.tsx`
- Ses varlıkları: `artifacts/fair-spin/public/audio/`
- **Yalnızca demo API referansı (üretime taşınmaz):**
  `artifacts/api-server/src/routes/fair-spin.ts`