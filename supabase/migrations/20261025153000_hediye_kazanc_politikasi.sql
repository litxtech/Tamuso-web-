-- Hediye Gönderme, Alma ve Yayıncı Kazanç Politikası — kayıtta zorunlu onay + giriş lobisi bağlantısı.
insert into public.policies (
  code, title, description, is_required, is_active, link_label, consent_label,
  show_on_register, show_on_login, sort_order, locale, audience, updated_at
) values (
  'gift_earnings',
  'Hediye Gönderme, Alma ve Yayıncı Kazanç Politikası',
  'Sanal hediye, Coin, gelir paylaşımı ve ödeme güvenliği kuralları',
  true, true,
  'Hediye ve Kazanç Politikası',
  'Hediye Gönderme, Alma ve Yayıncı Kazanç Politikası’nı okudum ve kabul ediyorum',
  true, true, 27, 'tr', 'all', now()
)
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  is_required = excluded.is_required,
  is_active = excluded.is_active,
  link_label = excluded.link_label,
  consent_label = excluded.consent_label,
  show_on_register = excluded.show_on_register,
  show_on_login = excluded.show_on_login,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.policy_versions (policy_code, version, body_md)
select
  'gift_earnings',
  coalesce((select max(version) from public.policy_versions where policy_code = 'gift_earnings'), 0) + 1,
  $tamuso$TAMUSO
HEDİYE GÖNDERME, ALMA VE YAYINCI KAZANÇ POLİTİKASI

Platform: Tamuso
İşletmeci: LITXTECH LLC
Belge Türü: Sanal Hediye, Dijital Varlık, Gelir Paylaşımı ve Ödeme Güvenliği Politikası
Son Güncelleme: 25 Ekim 2026

MADDE 1 — AMAÇ VE KAPSAM
1.1. İşbu Hediye Gönderme, Alma ve Yayıncı Kazanç Politikası (“Politika”), LITXTECH LLC tarafından işletilen Tamuso platformunda gerçekleştirilen sanal hediye işlemlerini, Coin kullanımını, hediye alıcılarının kazanç haklarını, ödeme süreçlerini ve ilgili güvenlik kurallarını düzenler.
1.2. Bu politika; Tamuso üzerinden sanal hediye gönderen, alan, kazanç elde eden veya hediye işlemlerine aracılık eden tüm kullanıcıları, içerik üreticilerini, yayıncıları, ajansları ve diğer yetkili hesapları kapsar.
1.3. Tamuso, kullanıcıların canlı yayınlar, sesli sohbet odaları, özel mesajlaşmalar ve sosyal paylaşımlar aracılığıyla etkileşimde bulunmasını sağlayan dijital sosyal platformdur.
1.4. Sanal hediyeler, platform içerisindeki dijital etkileşim ve destek mekanizmasının bir parçasıdır.
1.5. Sanal hediye gönderimi, kullanıcılar arasında doğrudan banka transferi veya nakit para aktarımı anlamına gelmez.
1.6. Platformun sunduğu Coin sistemi ile içerik üreticilerine sağlanan kazanç sistemi birbirinden ayrı hukuki ve teknik mekanizmalardır.
1.7. İşbu politika, Tamuso Kullanım Koşulları, Gizlilik Politikası, Topluluk Kuralları, Canlı Yayın Politikası ve ilgili ödeme koşullarıyla birlikte uygulanır.
1.8. Kullanıcılar bu politikaya tabi özellikleri kullanmadan önce ilgili koşullar hakkında bilgilendirilir. Hukuken gerekli olduğu durumlarda kullanıcıların ayrıca onayı alınır.

MADDE 2 — TANIMLAR
2.1. Tamuso: LITXTECH LLC tarafından işletilen sosyal iletişim ve içerik paylaşım platformudur.
2.2. Coin: Tamuso içerisinde desteklenen dijital hizmetlerden yararlanmak veya sanal hediye göndermek amacıyla kullanılan sanal birimdir.
2.3. Satın Alınan Coin: Kullanıcının desteklenen ödeme yöntemleriyle satın aldığı sanal bakiyedir.
2.4. Oyun Coin’i: Tamuso’nun desteklenen oyunlarında kazanılan, doğrudan nakit olarak çekilemeyen sanal ödül bakiyesidir.
2.5. Sanal Hediye: Tamuso içerisindeki desteklenen etkileşim alanlarında gönderilen dijital görsel, animasyon veya diğer sanal destek unsurudur.
2.6. Hediye Gönderen: Kendi Coin bakiyesini kullanarak başka bir kullanıcıya sanal hediye gönderen kişidir.
2.7. Hediye Alıcısı: Platform üzerinde kendisine sanal hediye gönderilen kayıtlı kullanıcıdır.
2.8. İçerik Üreticisi: Tamuso’nun belirlediği uygunluk şartlarını karşılayan ve desteklenen işlemlerden kazanç elde edebilen kullanıcıdır.
2.9. Yayıncı Kazancı: Tamuso tarafından uygun işlem kayıtları üzerinden hesaplanan, ödeme şartlarına tabi parasal alacaktır.
2.10. Paylaşılabilir Gelir: İlgili işlem için geçerli gelir paylaşım sözleşmesinde ve işlem açıklamasında belirtilen hesaplama esasına göre bulunan tutardır.
2.11. Bekleyen Kazanç: Doğrulama, güvenlik kontrolü veya hak ediş süreci henüz tamamlanmamış kazançtır.
2.12. Çekilebilir Kazanç: Doğrulama ve uygunluk şartlarını tamamlayan, ödeme talebine konu olabilecek kazançtır.
2.13. Ters İbraz: Kart sahibinin veya ödeme kuruluşunun bir işlemin iptalini ya da geri alınmasını talep etmesi sonucunda başlatılan ödeme itirazı sürecidir.
2.14. Şüpheli İşlem: Yetkisiz ödeme, dolandırıcılık, sahte etkileşim, yapay hediye dolaşımı veya başka bir güvenlik ihlali ihtimali taşıyan işlemdir.

MADDE 3 — COIN’LERİN HUKUKİ VE EKONOMİK NİTELİĞİ
3.1. Coin’ler, Tamuso içerisinde kullanılmak üzere sunulan dijital birimlerdir.
3.2. Coin’ler resmî para birimi, banka mevduatı, elektronik para hesabı veya yatırım aracı değildir.
3.3. Coin sahibi olmak, kullanıcıya LITXTECH LLC’nin sermayesi, mal varlığı veya ticari gelirleri üzerinde mülkiyet veya ortaklık hakkı kazandırmaz.
3.4. Coin’ler doğrudan ABD doları, Türk lirası veya başka bir resmî para birimine çevrilemez.
3.5. Kullanıcılar Coin bakiyelerini doğrudan banka hesaplarına çekemez.
3.6. Coin’lerin satın alma fiyatı bulunması, bunların kullanıcı tarafından nakde dönüştürülebilen parasal alacak niteliği kazandığı anlamına gelmez.
3.7. Coin’ler yalnızca Tamuso’nun desteklediği özelliklerde kullanılabilir.
3.8. Satın alınan Coin’ler ve oyunlardan kazanılan Coin’ler ayrı muhasebe kayıtlarında tutulur.
3.9. Satın alınan Coin’ler, geçerli mağaza kuralları gereğince süre sonuna tabi tutulmaz.
3.10. Kullanıcıların, Tamuso tarafından açıkça yetkilendirilmemiş yöntemlerle Coin satması, takas etmesi veya Coin karşılığında para talep etmesi yasaktır.
3.11. Kullanıcıların mağaza ödeme sistemlerini, platform kurallarını veya güvenlik kontrollerini aşmaya yönelik işlemler gerçekleştirmesi yasaktır.

MADDE 4 — COIN SATIN ALMA VE İŞLEM GÜVENLİĞİ
4.1. Coin satın alma işlemleri, ilgili platformda sunulan yetkili ödeme yöntemleri üzerinden gerçekleştirilir.
4.2. iOS uygulamasındaki dijital Coin satın alma işlemleri, geçerli istisnalar dışında Apple In-App Purchase sistemi üzerinden gerçekleştirilir.
4.3. Android uygulamasındaki satın alma işlemleri, Google Play’in ilgili ödeme politikaları ve geçerli istisnaları çerçevesinde yürütülür.
4.4. Coin fiyatları, satın alma işlemi onaylanmadan önce kullanıcıya gösterilir.
4.5. Satın alınan Coin miktarı, ödeme işlemi doğrulanmasının ardından kullanıcı hesabına aktarılır.
4.6. Başarısız, iptal edilmiş veya doğrulanamamış ödeme işlemleri için Coin yükleme işlemi tamamlanmayabilir.
4.7. Tamuso, aynı ödeme işleminin birden fazla kez Coin yüklemek amacıyla kullanılmasını engellemeye yönelik güvenlik kontrolleri uygular.
4.8. Kullanıcılar kendilerine ait olmayan ödeme yöntemlerini izinsiz kullanamaz.
4.9. Çalıntı veya sahte ödeme bilgilerinin kullanılması yasaktır.
4.10. Yetkisiz ödeme şüphesi bulunan işlemler incelenebilir ve ilgili bakiyeler geçici olarak sınırlandırılabilir.
4.11. Kullanıcılar ödeme sorunlarını Tamuso destek birimine veya ilgili ödeme sağlayıcısına bildirebilir.

MADDE 5 — SANAL HEDİYE GÖNDERME ALANLARI
5.1. Tamuso, sanal hediyelerin aşağıdaki desteklenen alanlarda gönderilmesine olanak sağlayabilir:
a) Canlı yayınlar
b) Sesli sohbet odaları
c) Özel mesajlaşmalar
d) Kullanıcı gönderileri ve durum paylaşımları
e) Platform tarafından açıkça desteklenen diğer sosyal etkileşim alanları
5.2. Her hediyenin gönderim için gereken Coin miktarı işlem öncesinde gösterilir.
5.3. Kullanıcılar hediye gönderme işlemini onayladıklarında ilgili Coin tutarı bakiyelerinden düşülür.
5.4. Başarılı hediye gönderimi, işlem kayıtlarında gösterilir.
5.5. Hediye gönderme işlemi, alıcının gönderen kullanıcıya kişisel veya özel bir hizmet sunacağını garanti etmez.
5.6. Hediye gönderilmesi, alıcıyla özel görüşme, arkadaşlık, romantik ilişki, takip edilme veya başka bir ayrıcalık elde etme hakkı doğurmaz.
5.7. Yayıncının hediye gönderilmesi karşılığında belirli bir hizmet sunacağına ilişkin bağımsız bir vaadi, Tamuso tarafından açıkça onaylanmadıkça platform adına verilmiş bir taahhüt sayılmaz.
5.8. Hediye gönderen kişiler işlemlerini kendi iradeleriyle gerçekleştirmekle yükümlüdür.
5.9. Tamuso, teknik sorunlar veya güvenlik riskleri nedeniyle belirli hediye türlerinin kullanımını geçici olarak durdurabilir.

MADDE 6 — HEDİYE GÖNDERİMİNDE KULLANICI SORUMLULUĞU
6.1. Kullanıcılar hediye gönderirken ilgili hediyenin Coin bedelini kontrol etmelidir.
6.2. Hediye gönderme işleminin gerçekleştirilmesi için gerekli bakiye kullanıcı hesabında bulunmalıdır.
6.3. Kullanıcıların yanlış kişiye hediye göndermemek için alıcının profilini kontrol etmeleri önerilir.
6.4. Kullanıcılar, başka bir kişiyi hediye göndermeye zorlayamaz.
6.5. Hediye gönderimi karşılığında tehdit, şantaj veya aldatıcı vaatlerde bulunulamaz.
6.6. Kullanıcıların, hediye alma amacıyla sahte kimlik veya yanıltıcı profil kullanması yasaktır.
6.7. Kullanıcıların sahte yardım kampanyaları, gerçek dışı acil durum hikâyeleri veya aldatıcı kazanç vaatleriyle hediye toplaması yasaktır.
6.8. Hediye gönderilmesi, alıcının kimliğinin, dürüstlüğünün veya platform dışındaki beyanlarının Tamuso tarafından garanti edildiği anlamına gelmez.
6.9. Tamuso, kullanıcıların platform dışındaki özel anlaşmalarının tarafı değildir. Bununla birlikte platformun kendi kusurundan veya kanunen doğan yükümlülüklerinden kaynaklanan sorumlulukları saklıdır.

MADDE 7 — HEDİYE ALMA VE KAZANÇ OLUŞUMU
7.1. Bir kullanıcının sanal hediye alması, her durumda çekilebilir parasal kazanç oluşacağı anlamına gelmez.
7.2. Çekilebilir kazanç yalnızca uygunluk şartlarını karşılayan hediye işlemlerinden doğar.
7.3. Hediye alıcısının içerik üreticisi programına uygunluğu, kimlik doğrulaması ve diğer geçerli şartları tamamlaması gerekebilir.
7.4. Kazanç hesaplamaları, işlem kayıtlarının doğrulanmasının ardından yapılır.
7.5. Hediye işleminde kullanılan Coin’in kaynağı kazanç hesabında dikkate alınır.
7.6. Satın alınan Coin’lerle gönderilen uygun hediyeler yayıncı kazancı oluşturabilir.
7.7. Oyun Coin’leriyle gönderilen hediyeler çekilebilir kazanç oluşturmaz.
7.8. İptal edilmiş, iade edilmiş, yetkisiz veya sahte işlemlerden kaynaklanan tutarlar uygun yayıncı kazancı kabul edilmez.
7.9. Kullanıcıya gösterilen tahmini kazançlar, doğrulama tamamlanıncaya kadar kesinleşmiş ödeme taahhüdü oluşturmaz.
7.10. Kesinleşmiş kazançlar ve mevcut hak edişler, geçerli sözleşme ve yürürlükteki hukuka aykırı şekilde geri alınamaz.

MADDE 8 — GELİR PAYLAŞIMI
8.1. Tamuso’nun uygun hediye işlemlerindeki standart gelir paylaşım modeli şöyledir:
İçerik üreticisi payı: %40
Tamuso platform payı: %60
8.2. Bu oranlar, ilgili işlem için hesaplanan paylaşılabilir gelir üzerinden uygulanır.
8.3. Paylaşılabilir gelirin hesaplanmasında hangi tutarın esas alındığı, ilgili kazanç sözleşmesinde ve kullanıcıya sunulan kazanç açıklamalarında belirtilir.
8.4. Varsa mağaza komisyonları, vergiler, iadeler ve ödeme sağlayıcısı kesintileri ilgili hesaplama koşullarında gösterilir.
8.5. Tamuso, ilan edilen paylaşım oranından farklı bir oran uygulayacaksa ilgili kullanıcının haklarını ve yürürlükteki hukuku dikkate alarak önceden bilgilendirme yapar; gerekli durumlarda onayını alır.
8.6. Kazanç payı değişiklikleri geriye dönük olarak kesinleşmiş ve hak edilmiş kazançlara uygulanmaz.
8.7. Ajanslara ödenen komisyonlar, ayrı sözleşmede aksi hukuka uygun biçimde kararlaştırılmadıkça platform payından karşılanır.
8.8. Aynı işlem üzerinden hesaplanan toplam paylar, dağıtılabilir tutarın tamamını aşamaz.
8.9. Kullanıcılar uygun kazançlarının işlem bazında hesaplama ayrıntılarını Cüzdanım üzerinden inceleyebilir.

MADDE 9 — OYUN COIN’LERİ VE HEDİYELER
9.1. Oyunlardan kazanılan Coin’ler, satın alınan Coin’lerden ayrı bir bakiye olarak takip edilir.
9.2. Oyun Coin’leri doğrudan nakit olarak çekilemez.
9.3. Oyun Coin’leri desteklenen sanal hediyelerin gönderilmesinde kullanılabilir.
9.4. Oyun Coin’leriyle gönderilen hediyeler, alıcı hesabında çekilebilir parasal kazanç oluşturmaz.
9.5. Bu kural gönderim yapılan hesabın yayıncı, arkadaş, ajans üyesi veya başka bir kullanıcı olmasına bakılmaksızın uygulanır.
9.6. Kullanıcılar Oyun Coin’lerini başka bir hesaba göndererek veya hediye üzerinden dolaştırarak nakde dönüştüremez.
9.7. Oyun Coin’leriyle gönderilen hediyeler, uygun arayüzlerde sanal destek olarak gösterilebilir.
9.8. Oyun Coin’leriyle gönderilen hediyelerin çekilebilir kazanç oluşturmadığı kullanıcıya açıklanır.
9.9. Oyun Coin’leri ve Satın Alınan Coin’ler aynı hediye işleminde kullanılıyorsa, hangi kısmın kazanç oluşturabileceği işlem kayıtlarında ayrı hesaplanır.
9.10. Kullanıcılar bu ayrımı gizlemek veya değiştirmek amacıyla yetkisiz yazılım ya da işlem yöntemleri kullanamaz.

MADDE 10 — YASAKLI HEDİYE VE KAZANÇ İŞLEMLERİ
Aşağıdaki faaliyetler kesinlikle yasaktır:
10.1. Kişinin kendi hesapları arasında yapay hediye trafiği oluşturarak kazanç elde etmesi.
10.2. Aynı kişi tarafından kontrol edilen hesaplarla sahte etkileşim veya gelir oluşturulması.
10.3. Arkadaşlar, ajans üyeleri veya başka kullanıcılarla anlaşarak yapay hediye işlemleri gerçekleştirilmesi.
10.4. Çalıntı banka veya kredi kartlarıyla Coin satın alınması.
10.5. Başka kişilerin ödeme hesaplarının izinsiz kullanılması.
10.6. Sahte ödeme belgesi veya makbuz oluşturulması.
10.7. Gerçekleşmemiş ödemeler için Coin yüklenmesini sağlamak amacıyla hile yapılması.
10.8. Tamuso’nun işlem doğrulama veya güvenlik sistemlerinin aşılmaya çalışılması.
10.9. Coin, hediye veya kazançların kara para aklama, dolandırıcılık veya diğer hukuka aykırı faaliyetlerde kullanılması.
10.10. Üçüncü kişiler aracılığıyla sahte yayıncı geliri oluşturulması.
10.11. Kullanıcıların hediye gönderme veya alma işlemlerinde yanıltıcı vaatlerde bulunması.
10.12. Tamuso çalışanı, temsilcisi veya yetkili ajansı olduğu yönünde sahte beyanda bulunulması.
10.13. Başka kullanıcıların Coin’lerini, hediyelerini veya kazançlarını yetkisiz olarak ele geçirmeye çalışılması.
10.14. Platformun ödül, iade veya ödeme sistemlerindeki hatalardan kötü niyetli şekilde yararlanılması.

MADDE 11 — İLİŞKİLİ HESAPLAR VE YAPAY HEDİYE HAREKETLERİ
11.1. Tamuso, dolandırıcılığı önlemek amacıyla aynı kişi tarafından yönetilen veya aralarında riskli işlem ilişkileri bulunan hesapların hareketlerini inceleyebilir.
11.2. İlişkili hesap değerlendirmesinde yürürlükteki mevzuata ve Gizlilik Politikası’na uygun olarak işlem geçmişi, cihaz güvenliği verileri ve diğer ilgili göstergeler kullanılabilir.
11.3. Ortak cihaz, IP adresi veya bağlantı bilgisi tek başına dolandırıcılık kanıtı sayılmaz.
11.4. Kullanıcılar arasındaki gerçek sosyal ilişkiler veya olağan hediye gönderimleri tek başına ihlal oluşturmaz.
11.5. Ancak yapay kazanç oluşturma, sahte işlem, anlaşmalı para aktarımı veya gelir paylaşım sistemini kötüye kullanma amacı taşıyan işlemler yasaktır.
11.6. Şüpheli bağlantılar, diğer işlem delilleriyle birlikte değerlendirilir.
11.7. Doğrulanmış ciddi ihlallerde bağlantılı hesaplara uygun yaptırımlar uygulanabilir.
11.8. Masum kullanıcıların haklarının korunması için hesaplar ve işlemler ayrı ayrı değerlendirilir.

MADDE 12 — İADE VE TERS İBRAZ İŞLEMLERİ
12.1. Coin satın alma işlemlerine ilişkin iade talepleri, geçerli tüketici hakları ve ilgili ödeme kuruluşunun kuralları çerçevesinde değerlendirilir.
12.2. Apple veya Google üzerinden gerçekleştirilen satın almalarda ilgili mağazanın iade süreçleri uygulanabilir.
12.3. Kullanıcıların kanundan doğan iade, cayma veya itiraz hakları saklıdır.
12.4. Daha önce hediye olarak kullanılmış Coin’lere ilişkin bir ödemenin sonradan iade edilmesi veya ters ibraza konu olması durumunda Tamuso, ilgili işlemi ve bağlantılı kazanç kayıtlarını inceleyebilir.
12.5. Henüz kesinleşmemiş veya ödenmemiş kazançlar, geçersiz ödeme tutarını yansıtacak şekilde düzeltilebilir.
12.6. Kesinleşmiş ve ödenmiş kazançlara ilişkin talepler, geçerli sözleşme ve uygulanabilir hukuk çerçevesinde ayrıca değerlendirilir.
12.7. Tamuso, geçerli iade veya ödeme itirazı hakkının kullanılmasını tek başına dolandırıcılık kabul etmez.
12.8. Ancak bilerek sahte ters ibraz oluşturulması, mükerrer tahsilat girişimleri veya hileli iade talepleri ciddi ihlal olarak değerlendirilebilir.
12.9. Tamuso, kullanıcıya ait olmayan bir borcu keyfî olarak başka kullanıcıların hesaplarından tahsil etmez.

MADDE 13 — ÖDEME KOŞULLARI
13.1. Yayıncı kazançları, uygunluk ve doğrulama şartları tamamlandıktan sonra ödeme sürecine alınır.
13.2. Minimum ödeme tutarı 25,00 ABD dolarıdır (USD).
13.3. Ödemeler, 15 günlük dönemler hâlinde işleme alınır.
13.4. Ödeme dönemleri her ayın 1–15’i ve 16’sından ayın son gününe kadar olan süreleri kapsar.
13.5. Minimum tutara ulaşmayan uygun kazançlar bir sonraki döneme devredilir.
13.6. Ödeme yapılabilmesi için gerekli kimlik, banka hesabı ve mevzuata uygunluk kontrollerinin tamamlanmış olması gerekir.
13.7. Banka havalesi süreleri banka, ülke, aracı finans kuruluşu, resmî tatil ve güvenlik incelemesi koşullarına göre değişebilir.
13.8. Bir ödeme talebinin onaylanması, tutarın aynı gün banka hesabına geçeceği anlamına gelmez.
13.9. Kullanıcılara ödeme durumları mümkün olduğunca açık ve güncel şekilde gösterilir.
13.10. Şüpheli kazançlar veya doğrulanmamış işlemler güvenlik incelemesine alınabilir.
13.11. Para çekme işlemi teknik veya operasyonel sebeplerle kullanılamadığında bu durum kullanıcıya açıkça bildirilir.
13.12. Tamuso, ödeme gecikmelerine neden olan durumlar hakkında makul ölçüde bilgilendirme yapar.

MADDE 14 — KAZANÇLARIN DURDURULMASI VE İNCELENMESİ
14.1. Tamuso, şüpheli işlemler nedeniyle ilgili kazancın ödenmesini geçici olarak durdurabilir.
14.2. Bu tedbir yalnızca gerekli görülen işlemler ve makul inceleme kapsamıyla sınırlı tutulur.
14.3. Kullanıcının bütün hesabını sınırsız süreyle ve gerekçesiz olarak bloke etmek yerine, mümkün olduğunda ilgili işlem veya kazanç üzerinde sınırlama uygulanır.
14.4. Güvenlik incelemesinin nedeni, hukuken veya soruşturmanın güvenliği bakımından sakınca bulunmadıkça kullanıcıya bildirilir.
14.5. İnceleme sonucunda ihlal bulunmazsa ilgili kazanç üzerindeki kısıtlama kaldırılır.
14.6. Doğrulanmış dolandırıcılık veya ağır politika ihlallerinde ilgili kazançlar, sözleşme ve hukuk çerçevesinde iptal edilebilir veya düzeltilebilir.
14.7. Tamuso, hukuka uygun şekilde kazanılmış ve kesinleşmiş kullanıcı alacaklarını keyfî olarak ortadan kaldıramaz.

MADDE 15 — HESAP ASKIYA ALMA VE KALICI KAPATMA
15.1. Tamuso, hediye veya kazanç sistemlerinin kötüye kullanılması durumunda hesap erişimini kısıtlayabilir.
15.2. Şu ihlaller ağır ihlal olarak değerlendirilebilir:
a) Çalıntı kart kullanımı
b) Sahte ödeme işlemleri
c) Kara para aklama faaliyetleri
d) Yapay hediye işlemleriyle haksız kazanç sağlanması
e) Tekrarlanan dolandırıcılık faaliyetleri
f) Başka kullanıcıların hesaplarına yetkisiz erişim
g) Platformun ödeme güvenliği sistemlerinin kasıtlı olarak aşılması
15.3. Doğrulanan ağır veya tekrarlanan ihlallerde kullanıcı hesabı kalıcı olarak kapatılabilir.
15.4. Hesap kapatma kararları, ihlalin ağırlığına ve eldeki delillere göre değerlendirilir.
15.5. Hesap kapatılması, uygulanabilir hukuk uyarınca doğmuş parasal yükümlülüklerin kendiliğinden ortadan kalkması anlamına gelmez.
15.6. Hileli veya hukuka aykırı kazançlar hakkında gerekli hukuki işlemler başlatılabilir.
15.7. Kullanıcılar hesap yaptırımlarına karşı destek kanallarından itirazda bulunabilir.

MADDE 16 — YETKİLİ MERCİLERLE İŞ BİRLİĞİ
16.1. Tamuso, yürürlükteki hukuk çerçevesinde yetkili kamu kurumları ve adli mercilerle iş birliği yapabilir.
16.2. Çalıntı kart kullanımı, dolandırıcılık, kara para aklama veya diğer ciddi suç şüphelerinde kanuni bildirim yükümlülükleri yerine getirilir.
16.3. Gerekli durumlarda ilgili işlem kayıtları hukuka uygun biçimde korunabilir.
16.4. Kişisel bilgiler yalnızca geçerli bir hukuki dayanak bulunduğunda ve gerekli kapsamla sınırlı olarak paylaşılır.
16.5. Tamuso, özel kullanıcı bilgilerini yalnızca bir şüpheye dayanarak sınırsız biçimde üçüncü kişilerle paylaşmaz.
16.6. Resmî soruşturmalar ve hukuki talepler ilgili mevzuat uyarınca değerlendirilir.

MADDE 17 — TEKNİK HATALAR VE YANLIŞ KAZANÇ KAYITLARI
17.1. Yazılım hatası, mükerrer işlem, yanlış hesaplama veya sistem arızası nedeniyle oluşan kayıtlar incelemeye alınabilir.
17.2. Teknik hata sonucu hesaba yanlışlıkla eklenen Coin veya kazançlar, işlem kayıtları doğrulanarak düzeltilebilir.
17.3. Düzeltme yapılırken kullanıcının meşru hakları ve ilgili mevzuat dikkate alınır.
17.4. Kullanıcılar fark ettikleri sistem hatalarını destek birimine bildirmelidir.
17.5. Sistem hatalarından kasıtlı biçimde yararlanılarak yapay bakiye veya kazanç oluşturulması yasaktır.
17.6. Tamuso, teknik hataları düzeltmek ve kullanıcıların haklarını korumak için uygun önlemleri alır.
17.7. Teknik arıza, yanlışlıkla gerçekleşen işlem veya eksik hizmet nedeniyle ortaya çıkan kullanıcı talepleri somut olayın koşullarına göre değerlendirilir.

MADDE 18 — HEDİYE VE COIN İŞLEM KAYITLARI
18.1. Tamuso, hediye gönderme ve alma işlemlerine ilişkin gerekli işlem kayıtlarını tutabilir.
18.2. Kayıtlar arasında gönderici, alıcı, işlem tarihi, kullanılan Coin türü, hediye türü, miktar ve ilgili kazanç hesabı bulunabilir.
18.3. Kişisel verilerin işlenmesi Gizlilik Politikası ve uygulanabilir veri koruma mevzuatına tabidir.
18.4. İşlem kayıtları güvenlik, muhasebe, uyuşmazlık çözümü ve yasal yükümlülükler amacıyla kullanılabilir.
18.5. Kayıtların saklanma süresi yürürlükteki mevzuata, veri minimizasyonuna ve ilgili saklama politikalarına göre belirlenir.
18.6. Kullanıcılar kendileriyle ilgili işlem geçmişine, uygulamanın sunduğu kapsamda erişebilir.
18.7. Tamuso, işlem kayıtlarının bütünlüğünü ve güvenliğini korumak için uygun teknik ve organizasyonel önlemler uygular.

MADDE 19 — AJANSLARIN HEDİYE VE KAZANÇ SİSTEMİNDEKİ SORUMLULUKLARI
19.1. Tamuso bünyesinde faaliyet gösteren ajanslar, platformun kendilerine tanıdığı yetkiler çerçevesinde işlem yapabilir.
19.2. Ajansların yetkisiz Coin yüklemesi, sahte hediye organizasyonu veya hileli yayıncı kazancı oluşturması yasaktır.
19.3. Ajansların, yayıncılara platform tarafından onaylanmamış kazanç garantileri vermesi yasaktır.
19.4. Ajansların kendi aralarında veya ilişkili hesaplarla anlaşarak yapay hediye trafiği oluşturması yasaktır.
19.5. Ajanslara ilişkin komisyon, yetki ve ödeme koşulları ilgili ajans sözleşmeleri çerçevesinde düzenlenir.
19.6. Ajansların ihlallerinden doğan sonuçlar, kusur, sözleşme hükümleri ve yürürlükteki hukuk çerçevesinde değerlendirilir.
19.7. Tamuso, doğrulanan ciddi ajans ihlallerinde ilgili ajans yetkilerini askıya alabilir veya sonlandırabilir.

MADDE 20 — KULLANICI ŞİKÂYETLERİ VE İTİRAZ HAKKI
20.1. Kullanıcılar hediye, Coin ve kazanç işlemlerine ilişkin sorunları Tamuso destek birimine bildirebilir.
20.2. Şikâyetler işlem kayıtları ve mevcut teknik veriler üzerinden incelenir.
20.3. Kullanıcılardan gerekli görülen durumlarda ek bilgi veya işlem kanıtı talep edilebilir.
20.4. Kullanıcılar kendilerine uygulanan hesap ve kazanç kısıtlamalarına karşı itirazda bulunabilir.
20.5. Tamuso, itirazları makul süre içerisinde değerlendirmeyi hedefler.
20.6. Hileli veya gerçeğe aykırı şikâyetler ayrıca incelenebilir.
20.7. Kullanıcıların kanuni başvuru ve tüketici hakları saklıdır.
20.8. Tamuso, hiçbir sözleşme maddesinin kullanıcıların emredici hukuk kurallarından doğan haklarını ortadan kaldırdığı şeklinde yorumlanamayacağını kabul eder.

MADDE 21 — SORUMLULUĞUN SINIRLARI
21.1. Tamuso, kullanıcıların platformda gerçekleştirdiği tüm kişisel iletişimlerin veya üçüncü kişilerce verilen bütün özel vaatlerin tarafı değildir.
21.2. Platform dışındaki kişisel anlaşmalar, Tamuso tarafından ayrıca ve açıkça kabul edilmedikçe LITXTECH LLC adına bağlayıcı bir taahhüt oluşturmaz.
21.3. Tamuso, platformun kendi kusurundan veya kanundan doğan sorumluluğu saklı kalmak üzere, kullanıcıların birbirlerine yönelik bağımsız ve yetkisiz vaatlerini garanti etmez.
21.4. Kullanıcıların başka kullanıcıları aldatması, tehdit etmesi veya dolandırması yasaktır.
21.5. Tamuso, bu tür ihlallerin önlenmesi, bildirilmesi ve incelenmesi için uygun güvenlik araçları sağlar.
21.6. Kullanıcıların gönderdiği sanal hediyeler, alıcının özel ilişki kuracağına veya başka bir kişisel karşılık sağlayacağına ilişkin garanti oluşturmaz.
21.7. Tamuso, yasal yükümlülükler ve kullanıcı hakları saklı kalmak üzere, kullanıcının kişisel beklentilerinin gerçekleşmemesinden tek başına sorumlu tutulamaz.
21.8. Bu madde, LITXTECH LLC’nin ağır kusurunu, kasıtlı hukuka aykırı davranışlarını veya mevzuat gereği sınırlandırılamayan sorumluluklarını ortadan kaldırmaz.

MADDE 22 — HEDİYE İŞLEMLERİNİN İPTALİ
22.1. Başarıyla tamamlanan sanal hediye işlemleri kural olarak kullanılmış dijital etkileşim olarak değerlendirilir.
22.2. Sadece hediye alıcısının beklenen ilgiyi göstermemesi, gönderen kişinin sonradan fikrini değiştirmesi veya kişisel beklentisinin gerçekleşmemesi, tek başına otomatik işlem iptali hakkı oluşturmaz.
22.3. Bununla birlikte kullanıcıların yürürlükteki hukuk ve ilgili uygulama mağazası kuralları kapsamında sahip oldukları iade ve itiraz hakları saklıdır.
22.4. Teknik hata, mükerrer ücretlendirme, yetkisiz işlem veya hizmetin hiç sunulmaması gibi durumlar ayrıca değerlendirilir.
22.5. Gerekli incelemelerde Tamuso işlem kayıtlarından yararlanabilir.
22.6. Hediye gönderen kişinin itirazı nedeniyle alıcıya ait tüm kazançların otomatik olarak iptal edilmesi yerine, ilgili işlem ve hak edişler ayrı değerlendirilir.

MADDE 23 — POLİTİKA DEĞİŞİKLİKLERİ
23.1. Tamuso, hizmetlerin geliştirilmesi, güvenlik ihtiyaçları, mevzuat değişiklikleri veya yeni özellikler nedeniyle bu politikayı güncelleyebilir.
23.2. Kullanıcıların kazanılmış haklarını veya önemli yükümlülüklerini etkileyen değişiklikler yürürlüğe girmeden önce uygun şekilde duyurulur.
23.3. Hukuken gerekli durumlarda kullanıcının ayrıca onayı alınır.
23.4. Güncellemeler, yayımlanan yürürlük tarihinden itibaren uygulanır.
23.5. Yeni koşullar, geçmişte kesinleşmiş kazançlara hukuka aykırı biçimde geriye dönük uygulanmaz.

MADDE 24 — UYUŞMAZLIKLAR VE UYGULANACAK HUKUK
24.1. İşbu politika, ilgili Kullanım Koşulları ve yürürlükteki emredici hukuk kurallarıyla birlikte değerlendirilir.
24.2. Sözleşmeye uygulanacak hukuk ve uyuşmazlıkların çözüm yöntemi, Tamuso Kullanım Koşulları’nda belirtilen geçerli hükümler çerçevesinde belirlenir.
24.3. Kullanıcıların ikamet ettikleri ülkelerdeki emredici tüketici ve veri koruma hakları saklıdır.
24.4. Bu politika, yürürlükteki hukuk uyarınca vazgeçilemeyen hakları ortadan kaldıracak şekilde yorumlanamaz.

MADDE 25 — İLETİŞİM VE RESMÎ BİLDİRİMLER
25.1. Kullanıcılar sanal hediye, Coin veya yayıncı kazançlarıyla ilgili sorular için Tamuso destek birimine başvurabilir.
25.2. Tamuso, gerekli bildirimleri uygulama içi mesaj, kayıtlı elektronik iletişim kanalları veya diğer uygun yöntemlerle yapabilir.
25.3. Kullanıcılar hesap bilgilerinin güncel ve doğru olmasını sağlamakla yükümlüdür.
25.4. Resmî mercilerden gelen hukuka uygun talepler ilgili prosedürler çerçevesinde değerlendirilir.

İşletmeci: LITXTECH LLC
Platform: Tamuso
Destek: support@litxtech.com

YÜRÜRLÜK VE KABUL
Bu politika, Tamuso tarafından ilan edilen yürürlük tarihinde uygulanmaya başlanır.
Sanal hediye gönderme, alma ve yayıncı kazanç özellikleri, ilgili Kullanım Koşulları ve bu politikada belirtilen şartlara tabidir.
Kullanıcının açık onayının gerekli olduğu işlemlerde ilgili onay ayrıca alınır.
LITXTECH LLC, platform güvenliğini sağlamak, dolandırıcılığı önlemek, hukuka uygun işlemleri korumak ve kullanıcılar arasında adil bir ekonomik sistem yürütmek amacıyla gerekli ve ölçülü güvenlik tedbirlerini uygulama hakkını saklı tutar.

TAMUSO — LITXTECH LLC
Güvenli Hediyeler. Şeffaf Kazançlar. Korunan Kullanıcı Hakları.$tamuso$;
