# Cursor aktarımı — Astral Falls

**Oyun:** Astral Falls (özgün, hızlı düşen sembollü slot demosu)  
**Kaynak:** `artifacts/astral-falls/`  
**Teknoloji:** React + Vite + TypeScript  
**Hedef branch:** `replit/astral-falls` (`match` deposunda ayrı branch)

## Cursor'a doğrudan verilecek talimat

> `bavul9761-gif/match` deposundaki `replit/astral-falls` branch'inin
> `imports/astral-falls-reference/` klasörünü kaynak al. Bu, Astral Falls
> oyununun **onaylanmış görünüm ve davranış referansıdır**. Oyunu mevcut
> uygulamaya entegre et; **kendin yeniden tasarlama veya yeniden üretme**.
>
> Özellikle `artifacts/astral-falls/src/components/RelicSymbol.tsx` içindeki
> **tüm SVG sembol çizimlerini ve renklerini birebir koru**. Sembollerin
> silüetini, kristal yüzeylerini, ışıklarını, renklerini, boyutlarını ve
> sembol kimliklerini değiştirme. Kendi sembollerini üretme; harici slot
> görselleri veya Pragmatic Play varlıklarıyla değiştirme. En güncel kozmik
> kristal sembollerini kullan; önceki GitHub commit'inden ya da eski ZIP'ten
> sembol alma.
>
> `src/App.tsx`, `src/index.css`, `src/components/`, `src/game/audio.ts`
> kaynaklarındaki ekran düzenini, mobil görünümü, animasyonları, sesleri,
> metinleri, bahis kontrolünü, 6×5 alanı, bonus/çarpan sunumunu ve
> 10/20/30/50/∞ otomatik oynatma kontrollerini **görsel ve etkileşimsel
> olarak aynı tut**. Tema, tipografi, ikonlar, arka plan ve efektleri
> yeniden yorumlama; genel bir slot şablonuna dönüştürme. Görünüm
> değişikliği gerekirse önce sahibine sor; kendi başına karar verme.
>
> **Yalnızca entegrasyon katmanını uyarla:** oturum, sunucu kaynaklı tur
> sonucu, sunucu bakiyesi ve hata işleme. Tarayıcıdaki demo RNG/kredi
> mantığını gerçek para/coin için taşıma. Diğer oyunları değiştirme,
> branch'i ana uygulamaya bütün hâliyle merge etme. Her turdan sonra
> sunucu sonucunu mevcut animasyonda oynat. Entegrasyon sonunda hem
> masaüstü hem mobil ekranı bu branch'teki referansla karşılaştır:
> semboller, yerleşim, renkler, animasyonlar, metinler ve kontroller
> aynı kalmalı; sadece veri kaynağı sunucu olmalı.

## Sınır

Bu Replit projesi **yalnızca demo oyun arayüzüdür**. Buradaki
`src/game/engine.ts` rastgele sonucu tarayıcıda üretir; `use-slot-game.ts`
tarayıcıdaki **demo kredileri** yönetir. Bu iki davranış canlı uygulamada
asla gerçek para/coin bahsi, cüzdan veya sonuç kaynağı olmamalıdır.
Pragmatic Play'in Gates of Olympus oyununa ait görsel/ses/isimler
kullanılmamıştır; özgün tasarımı ve varlıkları koruyun.

## Taşınacaklar

- `src/App.tsx`, `src/index.css`, `src/components/`: arayüz ve animasyonlar
- `src/game/audio.ts`: orijinal, tarayıcıda üretilen ses efektleri
- `src/game/engine.ts`: **yalnızca oyun akışı ve veri biçimi için demo referansı**
- `src/game/use-slot-game.ts`: **yalnızca animasyon sıralaması için demo referansı**

Replit'e özgü Vite eklentileri, örnek API, tarayıcıdaki kredi bakiyesi ve
istemci RNG'sini ana uygulamanın üretim koduna taşımayın. Mevcut oyunları
değiştirmeyin.

## Entegrasyon sözleşmesi

1. Mevcut uygulamanın oturumu, bahis sınırları ve cüzdanı üzerinden sunucuya
   spin isteği gönderin. Sunucu bahsi yalnızca bir kez işlemeli; çift tıklama ve
   tekrar gelen istekler için işlem kimliği/idempotency kullanın.
2. Sunucu, **sonuç ve ödeme hesaplamasını kendisi yapmalı** ve gösterilecek
   6×5 başlangıç ızgarasını, her zincirde kaybolan hücreleri ve sonraki
   ızgarayı, çarpanları, bonus dönüşlerini, nihai kazancı ve güncel bakiyeyi
   tek sonuç verisinde döndürmelidir. Animasyon yalnızca bu veriyi oynatmalı.
3. `src/game/engine.ts` içindeki örnek ağırlıklar, sembol değerleri ve ödeme
   formülleri gerçek oyunun onaylanmış matematiği ya da RTP'si değildir.
   Gerçek paytable, RNG, bahis/bonus kuralları, adil oyun kanıtı ve kayıt
   düzeni ana uygulamanın yetkili sunucusunda tanımlanmalı ve denetlenmelidir.
   Kullanıcı bazlı gizli kazanma/kaybetme manipülasyonu eklemeyin.
4. Demo kredi göstergesini gerçek sunucu bakiyesiyle değiştirin; yenilemede
   sunucudan tekrar okuyun. `resetDemo` ve tarayıcı bakiyesi üretimde
   bulunmamalı. Başarısız istek için istemcide varsayımsal iade yapmayın;
   sunucudaki işlem sonucuna göre durumu gösterin.
5. Demo arayüzündeki en yüksek bahis 500 kredidir. Otomatik oynatma 10, 20,
   30, 50 veya süresiz tur seçeneği sunar; ücretsiz turlar da sayaçta bir tur
   sayılır. Durdurma isteği yeni tur başlatmamalı, başlamış turu tamamlamalı.
   Bakiye yetersizse otomatik akış durmalı. Canlı uygulamada bu davranışı
   **sunucu sonuçlarını sırayla bekleyen** bir adaptörle uygulayın; istemcide
   önceden çoklu sonuç veya bahsi hesaplamayın.
6. Eşzamanlı spin, geciken yanıt, ağ kopması, sayfa yenileme, bonus dönüşlerinin
   devamı ve animasyonu atlama durumlarını ele alın. Mobil ve reduced-motion
   deneyimini test edin.
7. Yayınlamadan önce ilgili bölgedeki lisans/yaş sınırı ve sorumlu oyun
   gereksinimlerini uygulamanın sahibi değerlendirmelidir.

Bu branch'i ana uygulamaya bütün hâliyle merge etmeyin; oyunu ayrı modül
olarak alın ve üretim entegrasyonunu ayrı bir incelemeden geçirin.