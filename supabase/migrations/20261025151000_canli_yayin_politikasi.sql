-- Canlı Yayın Politikası ve Yayıncı Kuralları — kayıtta zorunlu onay.
insert into public.policies (
  code,
  title,
  description,
  is_required,
  is_active,
  link_label,
  consent_label,
  show_on_register,
  show_on_login,
  sort_order,
  locale,
  audience,
  updated_at
) values (
  'live_stream',
  'Canlı Yayın Politikası ve Yayıncı Kuralları',
  'Canlı yayın, içerik güvenliği, hediye/kazanç ve yayıncı davranış kuralları',
  true,
  true,
  'Canlı Yayın Politikası',
  'Canlı Yayın Politikası ve Yayıncı Kuralları’nı okudum ve kabul ediyorum',
  true,
  false,
  25,
  'tr',
  'all',
  now()
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
  'live_stream',
  coalesce((select max(version) from public.policy_versions where policy_code = 'live_stream'), 0) + 1,
  $tamuso$TAMUSO

CANLI YAYIN POLİTİKASI VE YAYINCI KURALLARI

Platform: Tamuso
İşletmeci: LITXTECH LLC
Belge türü: Canlı Yayın, İçerik Güvenliği ve Yayıncı Davranış Politikası
Son güncelleme: 25 Ekim 2026

MADDE 1 — AMAÇ VE KAPSAM

1.1. Bu politika, Tamuso platformunda gerçekleştirilen canlı yayınların güvenli, şeffaf, hukuka uygun ve kullanıcı haklarına saygılı şekilde yürütülmesini sağlamak amacıyla hazırlanmıştır.

1.2. Politika; canlı yayın açan kullanıcıları, yayınları izleyen kişileri, sesli sohbet odalarındaki katılımcıları, moderatörleri, ajansları ve platform üzerinden sanal hediye gönderen kullanıcıları kapsar.

1.3. Tamuso, kullanıcıların gerçek zamanlı iletişim kurmasına, içerik üretmesine, topluluk oluşturmasına ve sanal hediyeler aracılığıyla içerik üreticilerini desteklemesine olanak sağlayan sosyal bir platformdur.

1.4. Tamuso üzerinde yayın yapmak veya yayınlara katılmak, bu politikaya, Kullanım Koşulları'na, Gizlilik Politikası'na ve Topluluk Kuralları'na uyulmasını gerektirir.

1.5. Kullanıcılar, yürürlükteki mevzuata ve bulunduğu ülkenin ilgili kurallarına uymakla yükümlüdür.

MADDE 2 — YAŞ SINIRI VE HESAP GÜVENLİĞİ

2.1. Tamuso yalnızca 18 yaşını doldurmuş kişiler tarafından kullanılabilir.

2.2. Kullanıcıların kayıt sırasında yaşlarına ilişkin doğru beyanda bulunmaları zorunludur.

2.3. Tamuso, gerekli gördüğü durumlarda yaş ve kimlik doğrulaması talep edebilir.

2.4. Reşit olmayan kişilerin hesap oluşturması, canlı yayın yapması veya platformun diğer hizmetlerinden yararlanması yasaktır.

2.5. Kullanıcılar hesaplarının güvenliğinden ve giriş bilgilerinin korunmasından sorumludur. Hesap bilgilerinin üçüncü kişilerle paylaşılması yasaktır.

2.6. Başka bir kişinin kimliğini kullanarak hesap oluşturmak, başkasının hesabına yetkisiz erişmek veya sahte kimlik bilgileriyle yayın yapmak yasaktır.

2.7. Yaş doğrulaması konusunda şüphe oluşması hâlinde hesap ve yayın erişimi geçici olarak sınırlandırılabilir.

MADDE 3 — CANLI YAYIN AÇMA KURALLARI

3.1. Uygun kullanıcılar, Tamuso üzerinden canlı yayın başlatabilir ve izleyicilerle gerçek zamanlı etkileşim kurabilir.

3.2. Yayıncı, yayın sırasında paylaştığı görüntü, ses, müzik, açıklama ve diğer içeriklerin yürürlükteki mevzuata ve platform kurallarına uygun olmasını sağlamakla yükümlüdür.

3.3. Yayın başlığı, açıklaması, kapak görseli ve diğer tanıtım unsurları yanıltıcı olmamalıdır.

3.4. Yayıncıların gerçekte sunmadıkları içerikleri vaat ederek izleyicileri yanıltmaları yasaktır.

3.5. Başka kişilerin görüntüsünün veya sesinin yayınlanması, ilgili kişilerin haklarına ve uygulanabilir rıza gerekliliklerine uygun olmalıdır.

3.6. Kullanıcıların canlı yayınlarda kişisel verileri, özel konuşmaları veya başka kişilere ait gizli bilgileri izinsiz paylaşması yasaktır.

3.7. Tamuso, teknik sorunlar, güvenlik riskleri veya politika ihlalleri nedeniyle canlı yayınları geçici olarak durdurabilir ya da sonlandırabilir.

MADDE 4 — YASAKLI CANLI YAYIN İÇERİKLERİ

Tamuso'da aşağıdaki içeriklere izin verilmez:

4.1. Çocukların cinsel istismarı ve çocuk güvenliğini ihlal eden içerikler

Çocukların cinsel istismarını, sömürüsünü veya cinselleştirilmesini içeren ya da teşvik eden her türlü içerik kesinlikle yasaktır.

4.2. Açık cinsel içerikler

Pornografik görüntüler, açık cinsel faaliyetler, cinsel hizmet teklifleri, rızasız cinsel içerikler ve cinsel sömürü yasaktır.

Tamuso'nun 18+ olması, açık cinsel içeriklere sınırsız izin verildiği anlamına gelmez.

4.3. Şiddet ve tehdit

Gerçek kişilere yönelik şiddet tehdidi, ağır yaralanma görüntülerinin istismar amacıyla paylaşılması, işkence, saldırı veya şiddete teşvik yasaktır.

4.4. Nefret söylemi ve ayrımcılık

Kişilere veya gruplara yönelik, korunan özellikleri nedeniyle şiddeti veya ayrımcılığı teşvik eden içerikler yasaktır.

4.5. Taciz ve zorbalık

Sistematik hakaret, tehdit, takip, cinsel taciz, şantaj, küçük düşürme ve hedef gösterme yasaktır.

4.6. Dolandırıcılık ve sahtecilik

Sahte yatırım vaatleri, hileli para kazanma teklifleri, kimlik avı, çalıntı ödeme yöntemleri ve kullanıcıları ekonomik zarara uğratmayı amaçlayan faaliyetler yasaktır.

4.7. Yasa dışı ürün ve hizmetler

Yürürlükteki hukuka aykırı mal ve hizmetlerin satışı, pazarlanması veya bu faaliyetlere aracılık edilmesi yasaktır.

4.8. Tehlikeli davranışlar

Başkalarının güvenliğini tehlikeye atan davranışlara teşvik, tehlikeli meydan okumalar ve ciddi fiziksel zarar riski taşıyan faaliyetler yasaktır.

4.9. Mahremiyet ihlalleri

İzinsiz özel görüntü paylaşımı, kişisel bilgilerin ifşası, gizli kayıtlar ve üçüncü kişilerin mahremiyetini ihlal eden yayınlar yasaktır.

4.10. Telif hakkı ihlalleri

Lisanssız film, dizi, müzik, spor yayını veya hak sahibinin izni bulunmayan diğer korumalı içeriklerin hukuka aykırı şekilde yayımlanması yasaktır.

MADDE 5 — YETİŞKİN KULLANICILAR VE İÇERİK SINIRLARI

5.1. Tamuso, 18 yaş ve üzerindeki kullanıcılar için tasarlanmış bir sosyal iletişim platformudur.

5.2. Kullanıcılar hukuka uygun ve platform kuralları çerçevesindeki sohbet, eğlence, müzik ve sosyal etkileşim içeriklerini paylaşabilir.

5.3. Yaş sınırı; pornografi, cinsel sömürü, cinsel hizmet pazarlaması veya diğer yasaklı faaliyetlere izin verildiği anlamına gelmez.

5.4. Yayın sırasında başka kişilerin rızası ve mahremiyeti korunmalıdır.

5.5. Platform, içeriklerin bağlamını, şiddetini, kullanıcı güvenliğine etkisini ve yürürlükteki kuralları dikkate alarak moderasyon uygulayabilir.

MADDE 6 — İZLEYİCİ DAVRANIŞLARI

6.1. İzleyiciler canlı yayınlarda diğer kullanıcılara saygılı davranmalıdır.

6.2. Yayıncıları veya diğer izleyicileri tehdit etmek, taciz etmek, hedef göstermek veya kişisel bilgilerini paylaşmak yasaktır.

6.3. Sohbet alanlarında spam, otomatik mesaj, dolandırıcılık bağlantısı ve zararlı içerik paylaşılması yasaktır.

6.4. İzleyiciler kendilerinden hediye göndermelerinin zorla talep edildiğini, tehdit edildiklerini veya yanıltıldıklarını düşünürlerse ilgili kullanıcıyı şikâyet edebilir.

6.5. Sanal hediye gönderimi tamamen gönüllülük esasına dayanır.

6.6. Hiçbir yayıncı, hediye göndermeyen kullanıcıya yönelik tehdit, şantaj veya ayrımcı tacizde bulunamaz.

MADDE 7 — SANAL COIN VE HEDİYE SİSTEMİ

7.1. Coin, Tamuso içerisinde desteklenen dijital hizmetler ve sanal hediyeler için kullanılan sanal birimdir.

7.2. Coin bakiyesi doğrudan nakit olarak çekilemez.

7.3. Kullanıcılar desteklenen alanlarda Coin kullanarak sanal hediye gönderebilir.

7.4. Sanal hediyeler canlı yayınlarda, sesli odalarda, özel mesajlaşmalarda ve desteklenen kullanıcı gönderilerinde gönderilebilir.

7.5. Hediye gönderme işlemleri, ilgili Coin bakiyesinden düşülür.

7.6. Kullanıcılar hediye göndermeden önce gerekli Coin miktarını görebilmelidir.

7.7. Satın alınan Coin'ler ve oyunlardan kazanılan Coin'ler ayrı muhasebe kayıtlarında tutulur.

7.8. Oyunlardan kazanılan Coin'ler doğrudan nakit olarak çekilemez.

7.9. Oyun Coin'leri desteklenen sanal hediyelerin gönderilmesinde kullanılabilir.

7.10. Oyun Coin'leri kullanılarak gönderilen hediyeler, hediye alıcısı adına çekilebilir yayıncı kazancı oluşturmaz.

7.11. Tamuso, hediye işlemlerinde sistem hatası, yetkisiz kullanım, sahte işlem veya dolandırıcılık tespit edilmesi durumunda ilgili işlemi inceleyebilir ve uygulanabilir kurallar çerçevesinde düzeltebilir.

MADDE 8 — YAYINCI KAZANÇ SİSTEMİ

8.1. Tamuso, uygun içerik üreticilerinin belirli sanal hediye işlemlerinden kazanç elde etmesine olanak sağlayabilir.

8.2. Kazanç elde edebilmek için yayıncının ilgili uygunluk, kimlik doğrulama ve ödeme koşullarını karşılaması gerekir.

8.3. Uygun işlemlerden elde edilen paylaşılabilir gelirin %40'ı içerik üreticisine, %60'ı Tamuso platformuna aittir.

8.4. Paylaşılabilir gelirin hesaplama esası, uygulanabilir kesintiler ve varsa vergiler ilgili kazanç koşullarında açıklanır.

8.5. Yayıncı kazançları sanal Coin bakiyesinden ayrı olarak hesaplanır.

8.6. Canlı yayın, sesli oda, mesaj ve gönderi hediyelerinden oluşan uygun kazançlar ayrı işlem kayıtlarında gösterilebilir.

8.7. Oyun Coin'leriyle gönderilen hediyeler çekilebilir yayıncı kazancı oluşturmaz.

8.8. Gerçek olmayan işlemler, yapay hediye hareketleri, yetkisiz ödemeler ve dolandırıcılık şüphesi bulunan kazançlar güvenlik incelemesine alınabilir.

8.9. İade edilmiş, iptal edilmiş veya geçersiz sayılmış işlemler, yayıncı kazancı hesabında ilgili koşullara göre düzeltilebilir.

8.10. Tamuso, kullanıcıların kesinleşmiş hak edişlerini keyfî olarak ortadan kaldırmaz. Hukuken gerekli düzeltmeler ve sözleşmeden doğan geçerli istisnalar saklıdır.

MADDE 9 — ÖDEME VE PARA ÇEKME KOŞULLARI

9.1. Yayıncı ödemeleri, desteklenen ödeme yöntemleri üzerinden gerçekleştirilir.

9.2. Minimum ödeme tutarı 25 ABD dolarıdır (USD).

9.3. Uygun yayıncı kazançları 15 günlük ödeme dönemleriyle değerlendirilir.

9.4. Ödeme dönemleri, her ayın 1–15'i ve 16'sından ay sonuna kadar olan süreleri kapsar.

9.5. Minimum ödeme tutarına ulaşmayan uygun kazançlar sonraki ödeme dönemine devredilir.

9.6. Para çekme ve ödeme işlemleri kimlik doğrulaması, işlem güvenliği ve ilgili ödeme sağlayıcısının koşullarına bağlıdır.

9.7. Banka havalelerinde işlem süreleri alıcı ülkeye, bankaya, resmî tatillere ve aracı finans kuruluşlarına göre farklılık gösterebilir.

9.8. Ödeme talebi oluşturulması, tutarın banka hesabına anında geçeceği anlamına gelmez.

9.9. Kullanıcılar desteklenen cüzdan ekranları üzerinden ödeme durumlarını takip edebilir.

9.10. Teknik bakım, ödeme sağlayıcısı kısıtlamaları veya güvenlik incelemesi nedeniyle para çekme işlemleri geçici olarak kullanılamayabilir.

9.11. Para çekme işlemi kullanılamıyorsa Tamuso bu durumu kullanıcıya açıkça bildirir.

9.12. Vergi yükümlülükleri ve yasal kesintiler, ilgili mevzuata ve geçerli ödeme koşullarına göre değerlendirilir.

MADDE 10 — HİLE, KARA PARA AKLAMA VE YAPAY KAZANÇLAR

10.1. Tamuso'da dolandırıcılık, izinsiz ödeme yöntemi kullanımı, sahte işlem ve kara para aklama faaliyetleri yasaktır.

10.2. Kullanıcıların kendilerine ait başka hesaplara veya ilişkili hesaplara yapay hediye göndererek kazanç üretmeleri yasaktır.

10.3. Birden fazla kullanıcının anlaşarak sahte etkileşim, sahte hediye hareketi veya hileli kazanç oluşturması yasaktır.

10.4. Çalıntı kartlarla Coin satın alınması veya yetkisiz ödeme yöntemleri kullanılması yasaktır.

10.5. Oyun Coin'lerinin doğrudan veya dolaylı biçimde nakde dönüştürülmesine yönelik hileli işlemler yasaktır.

10.6. Tamuso, şüpheli işlemleri güvenlik incelemesine alabilir ve gerekli hâllerde ilgili kazançların ödemesini geçici olarak durdurabilir.

10.7. Doğrulanan ciddi ihlallerde kullanıcı hesabı kalıcı olarak kapatılabilir.

10.8. Hukuken gerekli olduğunda, ilgili kayıtlar yetkili mercilerle yürürlükteki mevzuata uygun şekilde paylaşılabilir.

10.9. Kullanıcılar hesaplarına uygulanan yaptırımlara karşı destek kanalları üzerinden itiraz edebilir.

MADDE 11 — MODERASYON VE YAYIN YÖNETİMİ

11.1. Tamuso, topluluk güvenliğini sağlamak için kullanıcı şikâyetleri, içerik incelemeleri ve diğer uygun güvenlik mekanizmalarından yararlanabilir.

11.2. Yayıncılar, yetkileri kapsamında canlı yayın sohbetini yönetebilir.

11.3. Moderatörler, kendilerine verilen yetkiler doğrultusunda kullanıcıları susturabilir veya yayından çıkarabilir.

11.4. Kullanıcılara yönelik yaptırımlar ihlalin niteliği, ağırlığı, tekrar durumu ve güvenlik riskine göre belirlenir.

11.5. Tamuso, ciddi güvenlik risklerinde veya hukuken gerekli hâllerde önceden bildirim yapmadan yayını durdurabilir.

11.6. Platform, ihlal tespit edilmesi durumunda içerik kaldırma, uyarı, geçici kısıtlama, yayın yasağı veya hesap kapatma gibi önlemler uygulayabilir.

MADDE 12 — ŞİKÂYET VE ENGELLEME

12.1. Kullanıcılar uygunsuz veya şüpheli içerikleri uygulamadaki bildirim araçları üzerinden şikâyet edebilir.

12.2. Kullanıcılar canlı yayınları, sesli odaları, profilleri, mesajları ve desteklenen gönderileri şikâyet edebilir.

12.3. Kullanıcılar başka hesapları engelleyebilir.

12.4. Engelleme özelliği, kullanıcının ilgili hesapla etkileşimini sınırlamak amacıyla sunulur.

12.5. Bildirimler, moderasyon sürecine aktarılır.

12.6. Tamuso, şikâyetleri en geç 24 saat içerisinde incelemeyi ve gerekli durumlarda uygun müdahalede bulunmayı hedefler.

12.7. Çocuk güvenliği, ciddi tehdit, cinsel istismar ve benzeri yüksek riskli bildirimler öncelikli değerlendirilir.

12.8. Şikâyet eden kişilerin kimlik bilgileri, uygulanabilir hukuk ve güvenlik gereklilikleri çerçevesinde korunur.

MADDE 13 — YAYIN KAYITLARI VE GİZLİLİK

13.1. Canlı yayınlar ve sesli sohbet odaları, ilgili özelliklerin teknik koşullarına göre çalışır.

13.2. Yayın kaydı alınabilen özelliklerde kullanıcılar uygun şekilde bilgilendirilir.

13.3. Başka kişilerin ses veya görüntülerinin izinsiz kaydedilmesi ve hukuka aykırı biçimde paylaşılması yasaktır.

13.4. Yayıncılar, kaydedilen içeriklerin üçüncü kişilerin haklarını ihlal etmemesini sağlamakla yükümlüdür.

13.5. Tamuso, güvenlik ve hukuki yükümlülükler kapsamında gerekli kayıtları yürürlükteki mevzuata ve Gizlilik Politikası'na uygun biçimde işleyebilir.

13.6. Kişisel verilerin işlenmesine ilişkin ayrıntılar Gizlilik Politikası'nda açıklanır.

MADDE 14 — TELİF HAKLARI VE MÜZİK KULLANIMI

14.1. Kullanıcılar canlı yayınlarda kullandıkları müzik, görsel, video ve diğer materyaller için gerekli hak veya izinlere sahip olmalıdır.

14.2. Üçüncü kişilere ait eserlerin izinsiz yayımlanması yasaktır.

14.3. Telif hakkı ihlali bildirimi alınması durumunda Tamuso ilgili içeriği inceleyebilir ve gerekli önlemleri uygulayabilir.

14.4. Tekrarlanan telif hakkı ihlallerinde hesaplara ek yaptırımlar uygulanabilir.

14.5. Kullanıcılar içeriklerinin hukuka uygunluğundan ve gerekli izinlerin alınmasından sorumludur.

MADDE 15 — YAYIN KALİTESİ VE TEKNİK KESİNTİLER

15.1. Tamuso, canlı yayınların istikrarlı ve erişilebilir şekilde sunulmasını hedefler.

15.2. Yayın kalitesi kullanıcının internet bağlantısına, cihazına, sunucu kapasitesine ve diğer teknik koşullara göre değişebilir.

15.3. Platform, bakım, güvenlik güncellemesi veya teknik arıza nedeniyle bazı hizmetleri geçici olarak durdurabilir.

15.4. Geçici teknik kesintilerde kullanıcılar uygun arayüz mesajlarıyla bilgilendirilebilir.

15.5. Tamuso, kesintisiz veya hatasız yayın hizmetini mutlak olarak garanti etmez.

15.6. Teknik kesintiler sırasında başarısız olan ödeme veya hediye işlemleri, işlem kayıtları üzerinden incelenir.

MADDE 16 — AJANSLAR VE YAYINCI PROGRAMLARI

16.1. Tamuso, uygun kullanıcıların yayıncı programlarına veya ajans topluluklarına katılmasına olanak sağlayabilir.

16.2. Ajanslar, platformun verdiği yetkiler çerçevesinde içerik üreticilerine destek sunabilir.

16.3. Ajansların yayıncılara yanlış kazanç garantileri vermesi, yanıltıcı vaatlerde bulunması veya baskı uygulaması yasaktır.

16.4. Ajanslar, kullanıcıların kişisel bilgilerini ve ödeme bilgilerini yürürlükteki mevzuata uygun biçimde işlemelidir.

16.5. Ajans yetkileri ve varsa komisyon koşulları ilgili program kurallarında açıklanır.

16.6. Ajanslar, Tamuso'nun topluluk güvenliği ve ödeme politikalarına uymakla yükümlüdür.

MADDE 17 — YAPTIRIMLAR

17.1. Politika ihlallerinde Tamuso aşağıdaki önlemleri uygulayabilir:

• İçerik kaldırma veya yayını durdurma
• Uyarı
• Canlı yayın erişimini geçici olarak sınırlandırma
• Hediye ve kazanç işlemlerini güvenlik incelemesine alma
• Geçici hesap askıya alma
• Ağır veya tekrarlanan ihlallerde kalıcı hesap kapatma
• Hukuken gerekli durumlarda yetkili mercilere başvurma

17.2. Yaptırım kararları ihlalin ağırlığına ve mevcut delillere göre değerlendirilir.

17.3. Kullanıcılar kendilerine uygulanan yaptırımlar hakkında destek kanalları üzerinden itirazda bulunabilir.

17.4. Tamuso, hukuka uygun kazanılmış hakların korunmasına ve ilgili uyuşmazlıkların adil şekilde değerlendirilmesine özen gösterir.

MADDE 18 — KULLANICI HAKLARI

18.1. Kullanıcılar uygulanabilir koşullar çerçevesinde hesap ve gizlilik ayarlarını yönetebilir.

18.2. Kullanıcılar uygunsuz içerikleri şikâyet edebilir ve başka hesapları engelleyebilir.

18.3. Kullanıcılar platformun sunduğu hesap silme özelliğinden yararlanabilir.

18.4. Kullanıcılar kendileri hakkında alınan moderasyon kararlarına itiraz edebilir.

18.5. Kullanıcıların kişisel verilerle ilgili talepleri yürürlükteki veri koruma mevzuatına ve Gizlilik Politikası'na göre değerlendirilir.

MADDE 19 — POLİTİKA DEĞİŞİKLİKLERİ

19.1. Tamuso, güvenlik ihtiyaçları, mevzuat değişiklikleri ve platform özelliklerindeki gelişmeler doğrultusunda bu politikayı güncelleyebilir.

19.2. Kullanıcıların haklarını veya yükümlülüklerini önemli ölçüde etkileyen değişiklikler uygun yöntemlerle duyurulur.

19.3. Güncellemeler, yayımlanan yürürlük tarihinden itibaren uygulanır. Kullanıcının açık onayının hukuken gerekli olduğu durumlarda ilgili onay ayrıca alınır.

19.4. Güncel politika uygulama içerisinden erişilebilir olacaktır.

MADDE 20 — İLETİŞİM VE DESTEK

Tamuso canlı yayınları, kullanıcı güvenliği, sanal hediyeler, yayıncı kazançları ve moderasyon işlemleriyle ilgili sorular için aşağıdaki kanaldan iletişime geçilebilir.

Şirket: LITXTECH LLC
Platform: Tamuso
Destek e-postası: support@litxtech.com

Kullanıcılar uygulama içerisindeki Bize Ulaşın veya Canlı Destek bölümlerinden de destek talebi oluşturabilir.

YÜRÜRLÜK

Bu politika, Tamuso tarafından uygulama içerisinde yayımlandığı tarihte yürürlüğe girer.

Tamuso'yu kullanan kişiler, Kullanım Koşulları ve bu politikada açıklanan uygulanabilir kurallara tabidir.

TAMUSO — LITXTECH LLC

Gerçek İnsanlar. Gerçek Sohbetler. Güvenli Topluluklar.$tamuso$;
