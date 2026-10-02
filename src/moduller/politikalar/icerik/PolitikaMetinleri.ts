/**
 * Yerel yasal metinler — kayıt / lobi / okuma ekranı.
 * DB policy_versions ile senkron (migration 039 + 072).
 * baslik / kisa / onayEtiketi (kabulMetni) → i18n; uzun gövdeler TR sabit.
 */

import i18n from '../../../i18n';

export type PolitikaKodu = 'tos' | 'privacy' | 'child_safety' | 'community_rules';

export type PolitikaTanimi = {
  kod: PolitikaKodu;
  baslik: string;
  kisa: string;
  /** Kayıt kutucuğunda görünen kısa etiket */
  onayEtiketi: string;
  govde: string;
};

const GOVDE_TOS = `TAMUSO KULLANIM ŞARTLARI

Son güncelleme: 15 Eylül 2026
Sürüm: 3.0

Bu belge, Tamuso mobil uygulaması, web arayüzleri, API’ler, canlı ses odaları, canlı yayınlar, mesajlaşma, hediyeleşme, ajans/host araçları, oyunlar ve bunlara bağlı tüm hizmetler (birlikte “Platform” veya “Hizmet”) için geçerlidir. Platformu indirerek, hesap oluşturarak, giriş yaparak, bir odaya veya lobiye katılarak, içerik üreterek veya herhangi bir özelliği kullanarak bu Kullanım Şartları’nı (“Şartlar”) okuduğunuzu, anladığınızı ve bağlayıcı şekilde kabul ettiğinizi beyan edersiniz.

Şartlar’ı kabul etmiyorsanız Platformu kullanmayın ve hesabınızı silin.

────────────────────────────────
1. TARAFLAR, SÖZLEŞME VE KABUL
────────────────────────────────
1.1. Bu Şartlar, Platformu işleten Tamuso (“biz”, “bize”, “bizim”) ile sizin (“Kullanıcı”, “Siz”) aranızdaki bağlayıcı sözleşmedir.
1.2. Hesap oluşturma, politika onay kutularını işaretleme, lobi/oda girişi veya hizmeti fiilen kullanma kabul anlamına gelir.
1.3. 18 yaşından küçükler adına ebeveyn veya vasi tarafından hesap açılamaz; Platform çocuklara yönelik değildir.
1.4. İşletme, ajans veya temsilci adına kullanıyorsanız, ilgili tüzel kişiyi bağlama yetkiniz olduğunu garanti edersiniz.

────────────────────────────────
2. YAŞ SINIRI VE KİMLİK BEYANI
────────────────────────────────
2.1. Platform yalnızca 18 yaşını doldurmuş kişiler içindir.
2.2. Yaşınızı yanlış beyan etmek, başkasının kimliğini kullanmak veya reşit olmayan bir kişiyi Platforma sokmak ağır ihlaldir.
2.3. Şüphe halinde ek doğrulama (kimlik, yaş teyidi vb.) isteyebiliriz. Doğrulama sağlanmazsa erişim kısıtlanır veya hesap kapatılır.
2.4. Çocuk koruma kuralları için ayrıca Çocuk Koruma Politikası geçerlidir ve bu Şartlar’ın ayrılmaz parçasıdır.

────────────────────────────────
3. HESAP, GÜVENLİK VE SORUMLULUK
────────────────────────────────
3.1. Hesap bilgilerinizin (e-posta, telefon, kullanıcı adı, şifre, profil) doğruluğundan ve güncelliğinden siz sorumlusunuz.
3.2. Şifrenizi, oturum token’larınızı ve cihazınızı korumak sizin yükümlülüğünüzdür. Hesabınız üzerinden yapılan işlemler size aittir sayılır.
3.3. Hesabınızın ele geçirildiğini düşünüyorsanız derhal şifrenizi değiştirin ve Canlı Destek’e bildirin.
3.4. Tek kişi birden fazla hesap açarak ekonomik avantaj, sıralama manipülasyonu, ban kaçırma veya hediye suistimali yapamaz.
3.5. Hesap satışı, kiralanması veya üçüncü kişilere devri yasaktır.

────────────────────────────────
4. HİZMETİN NİTELİĞİ VE DEĞİŞİKLİKLER
────────────────────────────────
4.1. Platform; sesli odalar, lobi, canlı yayın, özel mesaj, görüntülü/sesli arama, hediye, sanal ekonomi, ajans/host, oyunlar, durum paylaşımları ve benzeri sosyal etkileşim özellikleri sunabilir.
4.2. Özellikler ülke, cihaz, hesap türü, moderasyon durumu veya teknik kapasiteye göre değişebilir.
4.3. Hizmeti “olduğu gibi” sunarız. Önceden bildirimle özellik ekleyebilir, değiştirebilir, sınırlayabilir veya kaldırabiliriz.
4.4. Bakım, kesinti, gecikme veya hata olabilir; kesintisiz erişim garantisi verilmez.

────────────────────────────────
5. SANAL VARLIKLAR, ÖDEMELER VE ÇEKİM
────────────────────────────────
5.1. Coin, elmas ve benzeri birimler gerçek para, menkul kıymet veya mülkiyet hakkı değildir; yalnızca Platform içinde sınırlı kullanım lisansıdır.
5.2. Satın alma App Store / Google Play veya diğer ödeme kanallarının kurallarına tabidir. İade talepleri ilgili mağaza politikalarına göre yürütülür.
5.3. Hediye gönderme, alıcıya Platform içi fayda sağlar; nakit iade hakkı doğurmaz (yasal zorunluluklar saklıdır).
5.4. Çekim talepleri kimlik/banka doğrulaması, inceleme ve onay süreçlerine bağlıdır. Onaylanan ödemeler iş günü içinde ilgili hesaba aktarılmaya çalışılır.
5.5. Haksız kazanım, dolandırıcılık, reverse engineering, bot, exploit, collusion veya sistem açığı kullanımı tespitinde bakiyeler dondurulabilir, geri alınabilir ve hesap kapatılabilir.
5.6. Vergi yükümlülükleri kullanıcının sorumluluğundadır (uygulanabilir mevzuata göre).

────────────────────────────────
6. İÇERİK VE DAVRANIŞ KURALLARI
────────────────────────────────
6.1. Kullanıcılar saygılı, yasalara uygun ve topluluk güvenliğini gözeten davranış sergilemelidir.
6.2. Yasaktır (örnek liste, sınırlı değildir):
• Taciz, tehdit, stalking, doxxing, şantaj
• Nefret söylemi, ayrımcılık, şiddet teşviki
• Müstehcen, pornografik veya cinsel sömürü içeren içerik (özellikle reşit olmayanlara yönelik her türlü içerik)
• Sahte kimlik, deepfake ile zarar verme, dolandırıcılık, phishing, spam
• Telif / marka / kişilik hakkı ihlali
• Başkalarının hesaplarına izinsiz erişim
• Platform güvenliğini bozan teknik müdahale, scrapers, malware
• Reşit olmayanların Platforma daveti veya yaş yalanına teşvik
• Yasa dışı ürün/hizmet ticareti
6.3. Canlı / sesli ortamlarda ortamın 18+ olduğundan host ve katılımcılar sorumludur.
6.4. Başkalarını kaydetmek, ekran kaydı almak veya yayınlamak, ilgili kişinin ve Platform kurallarının izin verdiği ölçüde yapılabilir; gizli kayıt ve kötüye kullanım yasaktır.

────────────────────────────────
7. MODERASYON, YAPTIRIM VE BİLDİRİM
────────────────────────────────
7.1. İçerikleri, odaları, mesajları ve hesapları otomatik ve/veya insan incelemesiyle denetleyebiliriz.
7.2. İhlalde uygulanabilecek yaptırımlar: uyarı, içerik silme, özellik kısıtlama, geçici askıya alma, kalıcı ban, bakiye dondurma/iptal, yasal mercilere bildirim.
7.3. Ciddi ihlallerde (özellikle çocuk güvenliği, şiddet, dolandırıcılık) hesap derhal ve kalıcı olarak kapatılabilir; af veya “ikinci şans” taahhüdü yoktur.
7.4. Kullanıcılar “Bildir / Engelle” ve Canlı Destek kanallarını kullanmalıdır. Kötü niyetli / asılsız toplu raporlama da yaptırıma yol açabilir.
7.5. Kararlarımızın gerekçesini güvenlik ve gizlilik sınırları içinde özetleyebiliriz; her kararda ayrıntılı delil paylaşımı zorunlu değildir.

────────────────────────────────
8. FİKRİ MÜLKİYET
────────────────────────────────
8.1. Platform yazılımı, markası, tasarımı, logoları ve içerik kütüphanesi Tamuso’ya veya lisans verenlere aittir.
8.2. Kullanıcı, kendi ürettiği yasal içeriğin Platformda gösterilmesi için bize dünya çapında, münhasır olmayan, telifsiz, alt lisanslanabilir bir lisans verir (hizmet sunumu, güvenlik, tanıtım amaçlı kısa klipler dahil).
8.3. Başkasının içeriğini izinsiz yüklemek yasaktır.

────────────────────────────────
9. ÜÇÜNCÜ TARAFLAR
────────────────────────────────
9.1. Ödeme sağlayıcıları, bulut, bildirim, analitik ve medya altyapısı üçüncü taraf hizmetleri kullanabilir.
9.2. Üçüncü taraf hizmetlerin kendi şartları geçerlidir; bu hizmetlerden doğan kesintilerden mümkün olduğunca sorumlu tutulmamayı talep ederiz (kanunen izin verilen ölçüde).

────────────────────────────────
10. SORUMLULUK SINIRI VE TAZMİNAT
────────────────────────────────
10.1. Kanunen izin verilen azami ölçüde Platform “olduğu gibi” ve “mevcut haliyle” sunulur.
10.2. Dolaylı, arızi, özel, sonuçsal zararlar, kâr kaybı, veri kaybı veya itibar kaybından sorumluluk sınırlıdır.
10.3. Kullanıcının Şartlar’ı ihlali nedeniyle doğan talep, zarar ve masraflardan kullanıcı sorumludur ve bizi tazmin eder.

────────────────────────────────
11. FESİH VE HESAP SİLME
────────────────────────────────
11.1. İstediğiniz zaman hesabınızı uygulama içi hesap silme veya destek üzerinden kapatabilirsiniz.
11.2. Şartlar veya yasalara aykırılıkta hesabınızı askıya alabilir veya kalıcı kapatabiliriz.
11.3. Hesap kapanınca bazı veriler yasal saklama süreleri ve meşru menfaatler nedeniyle tutulabilir (Gizlilik Politikası’na bakın).

────────────────────────────────
12. DEĞİŞİKLİKLER
────────────────────────────────
12.1. Şartlar güncellenebilir. Önemli değişikliklerde uygulama içi bildirim, lobi uyarısı veya yeniden onay istenebilir.
12.2. Güncellemeden sonra kullanımı sürdürmeniz yeni metni kabul sayılır (zorunlu yeniden onay istenen haller saklıdır).

────────────────────────────────
13. UYGULANACAK HUKUK VE İLETİŞİM
────────────────────────────────
13.1. Zorunlu tüketici hakları saklı kalmak kaydıyla, uygulanabilir hukuk ve yetkili merciler ilgili yasal çerçeveye göre belirlenir.
13.2. Destek: uygulama içi Canlı Destek ve Politikalar ekranı.
13.3. Bu Şartlar, Gizlilik Politikası ve Çocuk Koruma Politikası birlikte okunmalıdır.

Platformu kullanarak yukarıdaki tüm maddeleri kabul etmiş sayılırsınız.
`;

const GOVDE_PRIVACY = `TAMUSO GİZLİLİK POLİTİKASI

Son güncelleme: 15 Eylül 2026
Sürüm: 3.0

Bu Gizlilik Politikası, Tamuso’nun (“biz”) kişisel verilerinizi nasıl topladığını, işlediğini, sakladığını, paylaştığını ve koruduğunu açıklar. Platformu kullanarak, hesap oluşturarak veya lobi/oda girerek bu politikayı okuduğunuzu ve kabul ettiğinizi beyan edersiniz.

Kişisel verileriniz, uygulanabilir veri koruma mevzuatı (ör. KVKK ve ilgili uluslararası düzenlemeler) çerçevesinde işlenir.

────────────────────────────────
1. VERİ SORUMLUSU VE KAPSAM
────────────────────────────────
1.1. Bu politika; mobil uygulama, ilgili web yüzeyleri, müşteri destek kanalları ve Platform özelliklerinde işlenen kişisel verileri kapsar.
1.2. 18 yaş altındaki kişilere yönelik hizmet sunmayız; bilerek çocuk verisi toplamayız (ayrıntı: Çocuk Koruma Politikası).

────────────────────────────────
2. TOPLANAN VERİ KATEGORİLERİ
────────────────────────────────
2.1. Kimlik / hesap verileri
• E-posta, telefon (kayıt yöntemine göre), kullanıcı adı, görünen ad
• Profil fotoğrafı, biyografi, isteğe bağlı cinsiyet, doğum tarihi/yaş beyanı, konum/şehir
• Genel kullanıcı kimliği (public_user_id), seviye ve profil ayarları

2.2. Kullanım ve etkileşim verileri
• Oda / lobi / canlı katılım kayıtları, koltuk ve rol bilgileri
• Mesaj meta verileri ve (moderasyon gerektiğinde) içerik örnekleri
• Hediye, cüzdan, coin/elmas işlem kayıtları, sıralama etkileşimleri
• Oyun oturumları, skorlar, davetler
• Durum / hikâye paylaşımları ve etkileşimler
• Bildirim tercihleri ve okuma durumları

2.3. Cihaz ve teknik veriler
• Cihaz kimliği / kurulum kimliği, işletim sistemi, uygulama sürümü
• Push bildirim token’ı, ağ türü (kaba), çökme / hata günlükleri
• Performans ve güvenlik sinyalleri (kötüye kullanım tespiti için)

2.4. Ödeme ve finansal veriler
• Mağaza işlem referansları, satın alma durumu, çekim talepleri
• IBAN / hesap sahibi (çekim için, isteğe bağlı ve gerekli ölçüde)
• Kart numarası gibi hassas ödeme verileri mağaza / ödeme sağlayıcısında kalır; bizde tutulmaz

2.5. Destek ve güvenlik
• Canlı destek yazışmaları, raporlar, engelleme kayıtları
• Moderasyon kararları, yaptırım geçmişi, şüpheli aktivite işaretleri

2.6. İsteğe bağlı medya
• Profil / durum fotoğraf veya video yüklemeleri
• Canlı / arama oturumlarında geçici medya akışları (sürekli kayıt varsayılan değildir; güvenlik incelemeleri saklıdır)

────────────────────────────────
3. İŞLEME AMAÇLARI
────────────────────────────────
Verilerinizi şu amaçlarla işleriz:
• Hesap oluşturma, kimlik doğrulama, oturum yönetimi
• Hizmet sunumu (oda, lobi, canlı, mesaj, hediye, oyun, destek)
• Güvenlik, dolandırıcılık önleme, spam ve kötüye kullanım tespiti
• Moderasyon ve çocuk koruma yükümlülükleri
• Ödeme, faturalama referansları, çekim ve muhasebe
• Yasal yükümlülüklerin yerine getirilmesi ve uyuşmazlık yönetimi
• Bildirimler (tercihlerinize ve yasal dayanağa bağlı)
• Ürün iyileştirme, hata ayıklama, anonimleştirilmiş analitik
• Topluluk güvenliği ve acil durum müdahalesi

────────────────────────────────
4. HUKUKİ SEBEPLER
────────────────────────────────
• Sözleşmenin kurulması ve ifası (Şartlar kapsamında hizmet)
• Meşru menfaat (güvenlik, moderasyon, hizmet sürekliliği — haklarınızla dengelenerek)
• Açık rıza (ör. belirli bildirimler, isteğe bağlı alanlar)
• Yasal yükümlülük (saklama, yetkili mercilere bildirim, mali kayıtlar)

────────────────────────────────
5. PAYLAŞIM VE AKTARIM
────────────────────────────────
5.1. Verilerinizi satmayız.
5.2. Hizmet için gerekli ölçüde şu kategorilerle paylaşılabilir:
• Bulut barındırma, CDN, medya (ör. gerçek zamanlı ses/video altyapısı)
• Analitik / çökme raporlama (mümkün olduğunca minimize)
• Push bildirim sağlayıcıları
• Ödeme / mağaza altyapıları
• Destek araçları
5.3. Yasal zorunluluk, mahkeme kararı, çocuk istismarı şüphesi veya hakların korunması halinde yetkili mercilerle paylaşılabilir.
5.4. Uluslararası aktarımda uygun koruma önlemleri hedeflenir (sözleşmesel güvenceler, teknik tedbirler).

────────────────────────────────
6. SAKLAMA SÜRELERİ
────────────────────────────────
6.1. Hesabınız aktifken hizmet için gerekli süre boyunca saklanır.
6.2. Hesap silme talebinden sonra makul süre içinde silinir veya anonimleştirilir.
6.3. Muhasebe, çekim, uyuşmazlık, güvenlik ve yasal zorunluluk kayıtları ilgili süreyle tutulabilir.
6.4. Ciddi güvenlik / çocuk koruma olaylarında delil niteliğindeki kayıtlar yasal süreç boyunca muhafaza edilebilir.

────────────────────────────────
7. GÜVENLİK ÖNLEMLERİ
────────────────────────────────
7.1. Erişim kontrolü, şifreleme (aktarımda TLS), günlükleme ve izleme uygulanır.
7.2. Hiçbir sistem %100 güvenli değildir. Şüpheli erişimde şifrenizi değiştirin ve destek ile iletişime geçin.
7.3. Çalışan ve yüklenici erişimleri ihtiyaç esasına göre sınırlandırılır.

────────────────────────────────
8. HAKLARINIZ
────────────────────────────────
Uygulanabilir hukuka göre:
• Erişim ve bilgilendirme
• Düzeltme
• Silme / unutulma (yasal istisnalar saklı)
• İşlemenin kısıtlanması
• İtiraz (meşru menfaat temelli işlemlere)
• Taşınabilirlik (uygulanabilir olduğunda)
• Rızayı geri çekme (rızaya dayanan işlemler için; geçmiş hukuka uygun işlemler saklı)

Taleplerinizi uygulama içi hesap ayarları, hesap silme ve Canlı Destek üzerinden iletebilirsiniz. Kimlik doğrulaması istenebilir.

────────────────────────────────
9. ÇOCUKLAR VE HASSAS DURUMLAR
────────────────────────────────
9.1. Platform 18+ içindir. Bilerek 18 yaş altından veri toplamayız.
9.2. Reşit olmayan kullanıcı tespitinde hesap kapatılır; ilgili veriler silinir veya anonimleştirilir (yasal saklama istisnaları saklı).
9.3. Çocuk cinsel istismarı materyali (CSAM) şüphesinde sıfır tolerans uygulanır; hesaplar kapatılır ve mercilere bildirim yapılabilir. Ayrıntı: Çocuk Koruma Politikası.

────────────────────────────────
10. ÇEREZLER / BENZER TEKNOLOJİLER
────────────────────────────────
Mobil uygulamada çerez yerine benzer tanımlayıcılar (cihaz / kurulum kimliği, SDK’lar) kullanılabilir. Bunlar oturum, güvenlik ve tercihlerin hatırlanması içindir.

────────────────────────────────
11. POLİTİKA DEĞİŞİKLİKLERİ
────────────────────────────────
Bu politika güncellenebilir. Önemli değişikliklerde uygulama içi bildirim veya yeni onay istenebilir. Güncel metin Politikalar ekranında ve lobide erişilebilirdir.

────────────────────────────────
12. İLETİŞİM
────────────────────────────────
Gizlilik talepleri: uygulama içi Canlı Destek / Politikalar bölümü.
Acil güvenlik ve çocuk koruma: Çocuk Koruma Politikası’ndaki kanallar.

Platformu kullanarak bu Gizlilik Politikası’nı kabul etmiş sayılırsınız.
`;

const GOVDE_CHILD_SAFETY = `TAMUSO ÇOCUK KORUMA POLİTİKASI / CHILD PROTECTION POLICY

Son güncelleme / Last updated: 22 Eylül 2026
Sürüm / Version: 4.0

════════════════════════════════
TÜRKÇE
════════════════════════════════

KESİN UYARI — AF YOKTUR
Tamuso’da çocukların cinsel istismarı, sömürüsü, cinselleştirilmesi veya reşit olmayanların Platforma katılımına ilişkin her türlü ihlalde AF YOKTUR, “ikinci şans” YOKTUR, pazarlık YOKTUR.
Tespit edilen hesaplar DERHAL ve KALICI olarak KAPATILIR; ilgili içerikler kaldırılır; gerekli hallerde yasal mercilere ve çocuk koruma kanallarına BİLDİRİM yapılır.
Ban kaçırmak için yeni hesap açmak da aynı kapsamdadır; yeni hesaplar da kapatılır.

Bu politika, Kullanım Şartları ve Gizlilik Politikası’nın ayrılmaz parçasıdır. Lobide, kayıtta, Politikalar ekranında ve tek seferlik Çocuk Koruma onay kartında her zaman erişilebilir.

────────────────────────────────
1. TEMEL İLKE VE KAPSAM
────────────────────────────────
1.1. Çocukların (18 yaş altı) güvenliği en yüksek önceliğimizdir.
1.2. Platform yalnızca 18 yaşını doldurmuş kullanıcılar içindir. Reşit olmayanların kayıt olması, odaya/lobiye girmesi, yayın yapması veya izlemesi yasaktır.
1.3. “Çocuk” ifadesi, yürürlükteki hukuka göre 18 yaşını doldurmamış herkesi kapsar.
1.4. Bu politika; sesli odalar, canlı yayın, mesajlaşma, aramalar, durum paylaşımları, profil medyası, hediyeler, oyunlar ve tüm diğer özellikler için geçerlidir.

────────────────────────────────
2. TEK SEFERLİK ONAY KARTI (18+)
────────────────────────────────
2.1. Yeni ve mevcut tüm hesaplar, uygulamaya girişte bir kez Çocuk Koruma onay kartını görür.
2.2. Kart Türkçe ve İngilizce sunulur; metinde karakter sınırı uygulanmaz.
2.3. “18 yaşından büyüğüm” seçeneği, kullanıcının 18+ olduğunu beyan eder; onay sonrası kart bir daha gösterilmez.
2.4. “18 yaşından değilim” seçeneğinde ek onay istenir. Onay verildiği anda hesap kapatılır ve kullanıcı giriş lobisine yönlendirilir.
2.5. Her hesap için karar tek seferliktir. Onaylayanlar ve onay vermeyenler (hesabı kapananlar) admin panelinde listelenir.

────────────────────────────────
3. SIFIR TOLERANS — YASAK DAVRANIŞLAR
────────────────────────────────
Aşağıdakilerin tamamına sıfır tolerans uygulanır:
• Çocuk cinsel istismarı materyali (CSAM) üretmek, paylaşmak, istemek, muhafaza etmek, linklemek veya tartışmak
• Çocuk cinsel sömürüsü / istismarı (CSE) teşvikı, planlaması veya kolaylaştırılması
• Çocukların cinselleştirilmesi, “yaş rolü”, “loli/shota” vb. temsiller, çocuksu avatar/isim ile cinsel içerik
• Reşit olmayanlarla flört, cinsel amaçlı iletişim, grooming
• Reşit olmayanları Platforma davet etmek, yaş yalanı söylemeye teşvik, ebeveyn onayı uydurmak
• Çocukların canlı / sesli ortamda bulunması, gösterilmesi veya sesinin kullanılması
• Çocuk istismarı içeriklerinin “şaka”, “kurgu”, “AI üretimi” veya “rol yapma” bahanesiyle dolaşımı

Bu listeler örnek niteliğindedir; ruhu itibarıyla benzer davranışlar da kapsamdadır.

────────────────────────────────
4. AF YOK · HESAPLAR KAPATILIR · KALICI YASAK
────────────────────────────────
4.1. Yukarıdaki ihlallerden herhangi birinde:
• Hesap DERHAL askıya alınır ve ardından KALICI olarak KAPATILIR.
• AF, indirim, “ilk seferde uyarı”, “özür kabulü” veya “hesap iadesi” UYGULANMAZ.
• Coin, elmas, VIP, ajans bakiyesi ve benzeri avantajlar güvenlik incelemesi kapsamında dondurulabilir / iptal edilebilir.
• Aynı kişiye ait veya bağlantılı olduğu tespit edilen diğer hesaplar da kapatılabilir.
4.2. “Bilmiyordum”, “yanlışlıkla”, “başkası kullandı”, “sadece izledim” savunmaları bu kategoride af sebebi oluşturmaz.
4.3. Moderasyon ekibinin çocuk koruma kararları nihaidir; lobi veya destek üzerinden af talebi kabul edilmez.
4.4. Yasal mercilere bildirim sonrası süreç mercilerin yetkisindedir; Platform affedici ara karar veremez.

────────────────────────────────
5. YAŞ DOĞRULAMA VE HESAP
────────────────────────────────
5.1. Kayıtta ve tek seferlik onay kartında 18+ olduğunuzu beyan edersiniz. Bu beyan sözleşmesel taahhüttür.
5.2. Şüphe halinde ek doğrulama istenebilir. Doğrulama reddi veya yetersizliği erişimin kısıtlanması / hesabın silinmesi sonucunu doğurur.
5.3. Reşit olmadığı anlaşılan veya kartta “18 yaşından değilim” diyen hesaplar kapatılır; ilgili veriler Gizlilik Politikası çerçevesinde silinir veya anonimleştirilir (yasal saklama istisnaları saklı).

────────────────────────────────
6. RAPORLAMA YÜKÜMLÜLÜĞÜ
────────────────────────────────
6.1. Kullanıcılar şüpheli içerik veya davranışı derhal bildirmelidir:
• Uygulama içi “Bildir / Engelle”
• Canlı Destek
• Politikalar ekranı üzerinden yönlendirmeler
6.2. Raporlar çocuk koruma kuyruğunda öncelikli incelenir.
6.3. İyi niyetli raporlar korunur. Kötü niyetli / asılsız raporlama ayrı yaptırıma tabidir; ancak çocuk koruma bildirimlerini engellemez.
6.4. Acil tehlike varsa yerel kolluk ve çocuk koruma hatlarını da arayın; yalnızca uygulama içi rapor yeterli olmayabilir.

────────────────────────────────
7. MODERASYON VE TEKNİK TEDBİRLER
────────────────────────────────
7.1. Otomatik filtreler, kullanıcı raporları ve insan incelemesi birlikte kullanılır.
7.2. İçerik kaldırma, hesap kapatma, IP / cihaz sinyali incelemesi ve delil saklama uygulanabilir.
7.3. Ciddi olaylarda yetkili makamlara, mağaza politikalarına ve sektör çocuk koruma kanallarına bildirim yapılabilir.
7.4. Güvenlik incelemeleri sırasında ilgili içeriklere erişim sınırlı personel ile ihtiyaç esasına göre yapılır.

────────────────────────────────
8. CANLI YAYIN, ODALAR VE LOBİ
────────────────────────────────
8.1. Canlı / sesli ortamlarda çocukların bulunması veya gösterilmesi yasaktır.
8.2. Host, yayıncı ve oda sahipleri ortamın 18+ olduğundan sorumludur.
8.3. Lobide politika linkleri görünür tutulur; katılım, çocuk koruma kurallarını kabul anlamına gelir.
8.4. İhlal şüphesinde oda/yayın anında sonlandırılabilir; hesaplar kapatılır.

────────────────────────────────
9. MESAJLAŞMA, ARAMA VE ÖZEL İLETİŞİM
────────────────────────────────
9.1. Özel mesaj, grup sohbeti ve aramalarda çocuk koruma ihlali yasaktır.
9.2. Bildirim veya şüphe halinde ilgili içerikler incelenebilir; ihlalde hesap kapatılır (af yok).

────────────────────────────────
10. ÜÇÜNCÜ TARAFLAR VE MAĞAZA KURALLARI
────────────────────────────────
10.1. App Store / Google Play ve altyapı sağlayıcılarının çocuk güvenliği kurallarına uyum gözetilir.
10.2. Mağaza veya yasal mercilerin ek bildirim / kaldırma talepleri derhal işleme alınır.

────────────────────────────────
11. EĞİTİM VE FARKINDALIK
────────────────────────────────
11.1. Kullanıcıları güvenli kullanım, raporlama yolları ve 18+ kuralı hakkında bilgilendiririz.
11.2. Lobide, ayarlarda ve onay kartında bu politikanın tam metnine erişim sağlanır.

────────────────────────────────
12. İLETİŞİM VE ACİL DURUM
────────────────────────────────
Şüpheli çocuk istismarı / CSAM için:
• Uygulama içi Bildir / Engelle ve Canlı Destek (öncelikli inceleme)
• Yerel kolluk kuvvetleri
• Ülkenizdeki çocuk koruma ihbar hatları

Hayati tehlike veya devam eden istismar şüphesinde önce yerel acil servisleri arayın.

────────────────────────────────
13. POLİTİKA GÜNCELLEMESİ
────────────────────────────────
Bu politika güncellenebilir. Kayıt, lobi girişi, onay kartı ve Platform kullanımı güncel metni kabul anlamına gelir.
Güncel sürüm: 4.0 — 22 Eylül 2026.

ÖZET (BAĞLAYICI)
• Platform 18+’tır.
• Tek seferlik onay kartı zorunludur.
• 18 değilim + onay = hesap kapanır.
• Çocuk istismarı / CSAM / grooming / yaş yalanı = SIFIR TOLERANS.
• AF YOKTUR.
• HESAPLAR KAPATILIR; kaçış hesapları da kapatılır.
• Gerekirse yasal mercilere bildirilir.

════════════════════════════════
ENGLISH
════════════════════════════════

ABSOLUTE WARNING — NO AMNESTY
Tamuso has ZERO TOLERANCE and NO AMNESTY for any violation involving child sexual abuse, exploitation, sexualization of minors, or participation of minors on the Platform.
Violating accounts are closed IMMEDIATELY and PERMANENTLY; related content is removed; where required, reports are made to authorities and child-protection channels.
Opening a new account to evade a ban is covered the same way; new accounts are also closed.

This policy is an integral part of the Terms of Use and Privacy Policy. It is available in the lobby, at registration, on the Policies screen, and on the one-time Child Protection confirmation card.

────────────────────────────────
1. PRINCIPLE AND SCOPE
────────────────────────────────
1.1. The safety of children (under 18) is our highest priority.
1.2. The Platform is only for users who are 18 or older. Minors may not register, join rooms/lobbies, stream, or watch.
1.3. “Child” means anyone under 18 under applicable law.
1.4. This policy applies to voice rooms, live streams, messaging, calls, status posts, profile media, gifts, games, and all other features.

────────────────────────────────
2. ONE-TIME CONFIRMATION CARD (18+)
────────────────────────────────
2.1. All new and existing accounts see a Child Protection confirmation card once after sign-in.
2.2. The card is shown in Turkish and English; there is no character limit on the text.
2.3. “I am 18 or older” records the user’s age attestation; after approval the card is not shown again.
2.4. Choosing “I am under 18” requires a second confirmation. Upon confirm, the account is closed and the user is sent to the login lobby.
2.5. The decision is one-time per account. Approvers and decliners (closed accounts) are listed in the admin panel.

────────────────────────────────
3. ZERO TOLERANCE — PROHIBITED CONDUCT
────────────────────────────────
Zero tolerance applies to all of the following:
• Creating, sharing, soliciting, storing, linking, or discussing child sexual abuse material (CSAM)
• Promoting, planning, or facilitating child sexual exploitation / abuse (CSE)
• Sexualization of children, “age play”, “loli/shota” depictions, sexual content with childlike avatars/names
• Flirting with minors, sexual communication, grooming
• Inviting minors to the Platform, encouraging age lies, fabricating parental consent
• Presence, display, or use of a child’s voice in live / voice environments
• Circulating child-abuse content under “joke”, “fiction”, “AI-generated”, or “roleplay” pretenses

These lists are illustrative; similar conduct in spirit is also covered.

────────────────────────────────
4. NO AMNESTY · ACCOUNTS CLOSED · PERMANENT BAN
────────────────────────────────
4.1. For any of the above violations:
• The account is IMMEDIATELY suspended and then PERMANENTLY CLOSED.
• No amnesty, warning-first, apology acceptance, or account restoration.
• Coins, diamonds, VIP, agency balances and similar benefits may be frozen / voided under security review.
• Other accounts belonging to or linked to the same person may also be closed.
4.2. Defenses such as “I didn’t know”, “by mistake”, “someone else used it”, or “I only watched” do not create amnesty in this category.
4.3. Child-protection decisions by moderation are final; lobby or support amnesty requests are not accepted.
4.4. After referral to authorities, the process is under their authority; the Platform cannot issue forgiving interim decisions.

────────────────────────────────
5. AGE ATTESTATION AND ACCOUNT
────────────────────────────────
5.1. At registration and on the one-time card you attest you are 18+. This is a contractual commitment.
5.2. Additional verification may be required if there is doubt. Refusal or inadequacy may restrict access or delete the account.
5.3. Accounts found to be underage, or that select “I am under 18” on the card, are closed; related data is deleted or anonymized under the Privacy Policy (legal retention exceptions reserved).

────────────────────────────────
6. REPORTING DUTY
────────────────────────────────
6.1. Users must promptly report suspicious content or behavior via in-app Report / Block, Live Support, and Policy screen guidance.
6.2. Reports are reviewed with priority in the child-protection queue.
6.3. Good-faith reports are protected. Malicious / false reporting is separately sanctionable but does not block child-protection reports.
6.4. In urgent danger also contact local law enforcement and child-protection hotlines; in-app reporting alone may not be enough.

────────────────────────────────
7. MODERATION AND TECHNICAL MEASURES
────────────────────────────────
7.1. Automated filters, user reports, and human review are used together.
7.2. Content removal, account closure, IP / device signal review, and evidence retention may apply.
7.3. In serious cases we may notify competent authorities, store policies, and industry child-protection channels.
7.4. During security reviews, access to related content is limited to need-to-know staff.

────────────────────────────────
8. LIVE STREAMS, ROOMS AND LOBBY
────────────────────────────────
8.1. Children must not be present or shown in live / voice environments.
8.2. Hosts, streamers, and room owners are responsible for keeping the environment 18+.
8.3. Policy links remain visible in the lobby; participation means accepting child-protection rules.
8.4. On suspected violation, rooms/streams may be ended immediately; accounts are closed.

────────────────────────────────
9. MESSAGING, CALLS AND PRIVATE COMMUNICATION
────────────────────────────────
9.1. Child-protection violations in DMs, group chat, and calls are prohibited.
9.2. Related content may be reviewed on report or suspicion; violations close the account (no amnesty).

────────────────────────────────
10. THIRD PARTIES AND STORE RULES
────────────────────────────────
10.1. We observe App Store / Google Play and infrastructure providers’ child-safety rules.
10.2. Additional takedown / notice requests from stores or authorities are processed promptly.

────────────────────────────────
11. EDUCATION AND AWARENESS
────────────────────────────────
11.1. We inform users about safe use, reporting paths, and the 18+ rule.
11.2. Full policy text is available in the lobby, settings, and the confirmation card.

────────────────────────────────
12. CONTACT AND EMERGENCY
────────────────────────────────
For suspected child abuse / CSAM:
• In-app Report / Block and Live Support (priority review)
• Local law enforcement
• Child-protection hotlines in your country

If there is immediate danger or ongoing abuse, call local emergency services first.

────────────────────────────────
13. POLICY UPDATES
────────────────────────────────
This policy may be updated. Registration, lobby entry, the confirmation card, and Platform use mean acceptance of the current text.
Current version: 4.0 — 22 September 2026.

SUMMARY (BINDING)
• The Platform is 18+.
• The one-time confirmation card is mandatory.
• Under 18 + confirm = account closed.
• Child abuse / CSAM / grooming / age lies = ZERO TOLERANCE.
• NO AMNESTY.
• ACCOUNTS ARE CLOSED; evasion accounts are closed too.
• Authorities are notified when required.
`;

type PolitikaSabit = {
  kod: PolitikaKodu;
  baslikKey: string;
  kisaKey: string;
  kabulKey: string;
  govdeKey?: string;
  govde?: string;
};

const POLITIKA_SABITLERI: Record<PolitikaKodu, PolitikaSabit> = {
  tos: {
    kod: 'tos',
    baslikKey: 'politikalar.tosBaslik',
    kisaKey: 'politikalar.tosKisa',
    kabulKey: 'politikalar.tosKabulMetni',
    govde: GOVDE_TOS,
  },
  privacy: {
    kod: 'privacy',
    baslikKey: 'politikalar.privacyBaslik',
    kisaKey: 'politikalar.privacyKisa',
    kabulKey: 'politikalar.privacyKabulMetni',
    govde: GOVDE_PRIVACY,
  },
  child_safety: {
    kod: 'child_safety',
    baslikKey: 'politikalar.childSafetyBaslik',
    kisaKey: 'politikalar.childSafetyKisa',
    kabulKey: 'politikalar.childSafetyKabulMetni',
    govde: GOVDE_CHILD_SAFETY,
  },
  community_rules: {
    kod: 'community_rules',
    baslikKey: 'politikalar.communityBaslik',
    kisaKey: 'politikalar.communityKisa',
    kabulKey: 'politikalar.communityKabulMetni',
    govdeKey: 'politikalar.communityGovde',
  },
};

function politikaCevir(s: PolitikaSabit): PolitikaTanimi {
  return {
    kod: s.kod,
    baslik: i18n.t(s.baslikKey) as string,
    kisa: i18n.t(s.kisaKey) as string,
    onayEtiketi: i18n.t(s.kabulKey) as string,
    govde: s.govdeKey
      ? (i18n.t(s.govdeKey) as string)
      : (s.govde ?? ''),
  };
}

/** Canlı dilde politika metinleri */
export function PolitikaMetinleriAl(): Record<PolitikaKodu, PolitikaTanimi> {
  return {
    tos: politikaCevir(POLITIKA_SABITLERI.tos),
    privacy: politikaCevir(POLITIKA_SABITLERI.privacy),
    child_safety: politikaCevir(POLITIKA_SABITLERI.child_safety),
    community_rules: politikaCevir(POLITIKA_SABITLERI.community_rules),
  };
}

/** Geriye dönük — her okumada canlı dil */
export const POLITIKA_METINLERI: Record<PolitikaKodu, PolitikaTanimi> = new Proxy(
  {} as Record<PolitikaKodu, PolitikaTanimi>,
  {
    get(_t, prop, receiver) {
      if (prop === Symbol.toStringTag) return 'Object';
      if (prop === 'then') return undefined;
      const live = PolitikaMetinleriAl();
      const v = Reflect.get(live, prop, receiver);
      return typeof v === 'function' ? v.bind(live) : v;
    },
    ownKeys() {
      return Reflect.ownKeys(PolitikaMetinleriAl());
    },
    getOwnPropertyDescriptor(_t, prop) {
      const live = PolitikaMetinleriAl();
      const desc = Reflect.getOwnPropertyDescriptor(live, prop);
      if (desc) desc.configurable = true;
      return desc;
    },
    has(_t, prop) {
      return prop in PolitikaMetinleriAl();
    },
  },
);

export const POLITIKA_LISTESI: PolitikaTanimi[] = new Proxy(
  [] as PolitikaTanimi[],
  {
    get(_t, prop, receiver) {
      const live = [
        POLITIKA_METINLERI.tos,
        POLITIKA_METINLERI.privacy,
        POLITIKA_METINLERI.community_rules,
        POLITIKA_METINLERI.child_safety,
      ];
      if (prop === 'length') return live.length;
      if (prop === Symbol.iterator) return live[Symbol.iterator].bind(live);
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        return live[Number(prop)];
      }
      const v = Reflect.get(live, prop, receiver);
      return typeof v === 'function' ? v.bind(live) : v;
    },
    ownKeys() {
      const live = [
        POLITIKA_METINLERI.tos,
        POLITIKA_METINLERI.privacy,
        POLITIKA_METINLERI.community_rules,
        POLITIKA_METINLERI.child_safety,
      ];
      return Reflect.ownKeys(live);
    },
    getOwnPropertyDescriptor(_t, prop) {
      const live = [
        POLITIKA_METINLERI.tos,
        POLITIKA_METINLERI.privacy,
        POLITIKA_METINLERI.community_rules,
        POLITIKA_METINLERI.child_safety,
      ];
      const desc = Reflect.getOwnPropertyDescriptor(live, prop);
      if (desc) desc.configurable = true;
      return desc;
    },
  },
);

export function PolitikaKodundanGetir(kod: string): PolitikaTanimi | null {
  if (
    kod === 'tos' ||
    kod === 'privacy' ||
    kod === 'child_safety' ||
    kod === 'community_rules'
  ) {
    return politikaCevir(POLITIKA_SABITLERI[kod]);
  }
  if (kod === 'terms' || kod === 'kullanim') {
    return politikaCevir(POLITIKA_SABITLERI.tos);
  }
  if (kod === 'gizlilik') return politikaCevir(POLITIKA_SABITLERI.privacy);
  if (kod === 'topluluk' || kod === 'community' || kod === 'eula') {
    return politikaCevir(POLITIKA_SABITLERI.community_rules);
  }
  if (kod === 'cocuk' || kod === 'child' || kod === 'child-safety') {
    return politikaCevir(POLITIKA_SABITLERI.child_safety);
  }
  return null;
}
