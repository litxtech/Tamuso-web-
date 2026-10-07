import type { UygulamaDili } from '../../i18n/diller';

export type TanitimOzellik = {
  baslik: string;
  metin: string;
};

export type TanitimMetin = {
  giris: string;
  kayit: string;
  uygulamayaGec: string;
  menu: string;
  kapat: string;
  dil: string;
  heroRozet: string;
  heroBaslik: string;
  heroAlt: string;
  ornekEkran: string;
  sahneGorusme: string;
  sahneGorusmeAlt: string;
  sahneCanli: string;
  sahneCanliAlt: string;
  sahneMesaj: string;
  sahneMesajAlt: string;
  sahneKesfet: string;
  sahneKesfetAlt: string;
  sohbet: string[];
  kesfetKart: string[];
  ozelliklerBaslik: string;
  ozelliklerAlt: string;
  ozellikler: TanitimOzellik[];
  coinBaslik: string;
  coinAlt: string;
  coinMaddeler: string[];
  coinButon: string;
  meyveBaslik: string;
  meyveAlt: string;
  meyveMaddeler: string[];
  meyveButon: string;
  meyveGiris: string;
  hakkindaBaslik: string;
  hakkindaGovde: string;
  hakkindaMaddeler: string[];
  hakkindaButon: string;
  politikaBaslik: string;
  politikaAlt: string;
  politikaButon: string;
  sartlar: string;
  gizlilik: string;
  cocuk: string;
  destekBaslik: string;
  destekAlt: string;
  destekAc: string;
  destekGiris: string;
  destekYaz: string;
  destekWhatsapp: string;
  footerSirket: string;
  navAnasayfa: string;
  navOzellik: string;
  navCoin: string;
  navMeyve: string;
  navHakkinda: string;
  navPolitika: string;
  navBlog: string;
  navDestek: string;
  navYatirim: string;
  navIsbirligi: string;
  canliSerit: string[];
  vizyonBaslik: string;
  vizyonGovde: string;
  vizyonMaddeler: string[];
  yatirimBaslik: string;
  yatirimGovde: string;
  yatirimMaddeler: string[];
  isbirligiBaslik: string;
  isbirligiGovde: string;
  isbirligiMaddeler: string[];
  mailYaz: string;
};

const OZELLIK_TR: TanitimOzellik[] = [
  { baslik: 'Görüntülü görüşme', metin: 'Birebir kamera bağlantısı. Karşındaki kişiyle canlı görüşürsün.' },
  { baslik: 'Canlı yayın', metin: 'Kameranla yayına çık, izleyiciler aynı anda seni izler.' },
  { baslik: 'PK', metin: 'Yayıncılar arası düello. İzleyici iki tarafı da takip eder.' },
  { baslik: 'Ses odaları', metin: 'Mikrofonlu odalarda birlikte sohbet.' },
  { baslik: 'Mesajlaşma', metin: 'Yazışma, sohbet ve görüşme içi mesaj.' },
  { baslik: 'Hikayeler', metin: 'Kısa süreli görsel paylaşımlar.' },
  { baslik: 'Keşfet', metin: 'Yeni insanları, odaları ve yayınları bul.' },
  { baslik: 'Kişiler', metin: 'Arkadaşların ve bağlantıların bir arada.' },
  { baslik: 'Ülke ve şehir', metin: 'Ülke sayfaları, şehirler ve şehir ligi.' },
  { baslik: 'Sıralamalar', metin: 'Yayın ve katılım sıraları.' },
  { baslik: 'Coin', metin: 'Uygulama içi bakiye. Hediye, görüşme ve oyunlarda kullanılır.' },
  { baslik: 'Meyve çarkı', metin: 'Sekiz meyveli canlı çark. Sonuç sunucuda belirlenir.' },
  { baslik: 'Diğer oyunlar', metin: 'Sis Spin ve stüdyodaki oyunlar.' },
  { baslik: 'AI müzik ve stüdyo', metin: 'Müzik üretimi ve yayın stüdyosu.' },
  { baslik: 'Ajans ve host', metin: 'Ajans yönetimi ve yayıncı başvurusu.' },
  { baslik: 'Duyurular', metin: 'Platform duyuruları tek yerde.' },
  { baslik: 'Canlı destek', metin: 'Uygulama içi destek sohbeti, e-posta ve WhatsApp.' },
  { baslik: 'Güvenlik ve politikalar', metin: 'Topluluk kuralları, gizlilik ve kullanım şartları.' },
];

const TR: TanitimMetin = {
  giris: 'Giriş yap',
  kayit: 'Kayıt ol',
  uygulamayaGec: 'Uygulamaya geç',
  menu: 'Menü',
  kapat: 'Kapat',
  dil: 'Dil',
  heroRozet: 'Canlı',
  heroBaslik: 'Gerçek insanlarla görüntülü sohbet, yayın ve mesaj',
  heroAlt:
    'Görüntülü görüşme, canlı yayın, mesajlaşma ve arkadaş bulma tek uygulamada. Yayınlar, sohbetler ve odalar aynı anda açık.',
  ornekEkran: 'Örnek ekran',
  sahneGorusme: 'Görüntülü görüşme',
  sahneGorusmeAlt: 'Kamerayla birebir bağlan, karşı tarafı canlı gör.',
  sahneCanli: 'Canlı yayın',
  sahneCanliAlt: 'Yayına çık veya bir yayını izle.',
  sahneMesaj: 'Mesajlaşma',
  sahneMesajAlt: 'Sohbet ekranında yazış, görüşme içinde de mesajlaş.',
  sahneKesfet: 'Arkadaş bul',
  sahneKesfetAlt: 'Keşfet ekranında yeni insanları ve odaları gör.',
  sohbet: ['Selam, müsait misin?', 'Evet, görüntülü geçelim.', 'Tamam, seni arıyorum.'],
  kesfetKart: ['Yayında', 'Sohbette', 'Odada', 'Yeni'],
  ozelliklerBaslik: 'Özellikler',
  ozelliklerAlt: 'Uygulamadaki sıra. Hepsi girişten sonra açılır.',
  ozellikler: OZELLIK_TR,
  coinBaslik: 'Coinler',
  coinAlt:
    'Coin, Tamuso içindeki bakiyedir. Görüntülü görüşme, hediye ve oyunlarda harcanır. Yükleme uygulama içinden yapılır.',
  coinMaddeler: [
    'Coin bir ödeme aracı değil, uygulama içi bakiyedir.',
    'Hediye, görüşme ve meyve çarkı gibi alanlarda kullanılır.',
    'Paket tutarları bu sayfada yoktur. Güncel fiyat uygulama içinde görünür.',
    'Ajans paketleri, ajansın kendi satış akışındadır.',
  ],
  coinButon: 'Coinler hakkında',
  meyveBaslik: 'Meyve oyunu',
  meyveAlt:
    'Fruit Wheel, sekiz meyveli canlı bir çarktır. Tur saati, kapanış ve sonuç sunucuya göredir.',
  meyveMaddeler: [
    'Tur açıkken coin bir veya birden fazla meyveye dağıtılabilir.',
    'Tur kapandıktan sonra seçim değişmez.',
    'Kazanan meyve tur açılırken sunucuda belirlenir.',
    'Ödeme yalnız sunucunun kaydettiği hesaba göre yazılır.',
    'Bu oyun bir kazanç garantisi değildir.',
  ],
  meyveButon: 'Meyve oyunu',
  meyveGiris: 'Giriş yapıp oyna',
  hakkindaBaslik: 'Tamuso hakkında',
  hakkindaGovde:
    'Tamuso; görüntülü görüşme, canlı yayın, ses odaları, mesajlaşma, hikâye, keşfet ve oyunları bir arada sunan sosyal uygulamadır. İnsanlar burada tanışır, yayın açar ve aynı sohbetin içinde kalır.',
  hakkindaMaddeler: [
    'Ürün: Tamuso',
    'Destek: support@litxtech.com',
    'Yatırım ve işbirliği yazışmaları aynı adrese gider.',
  ],
  hakkindaButon: 'Şirket ve uygulama',
  politikaBaslik: 'Politikalar',
  politikaAlt: 'Topluluk kuralları, gizlilik, kullanım şartları ve çocuk güvenliği.',
  politikaButon: 'Politikaları aç',
  sartlar: 'Kullanım şartları',
  gizlilik: 'Gizlilik',
  cocuk: 'Çocuk güvenliği',
  destekBaslik: 'Canlı destek',
  destekAlt:
    'Giriş yaptıktan sonra uygulama içi canlı destek sohbeti açılır. E-posta ve WhatsApp her zaman yazılabilir.',
  destekAc: 'Destek sohbetini aç',
  destekGiris: 'Giriş yap ve destek aç',
  destekYaz: 'E-posta yaz',
  destekWhatsapp: 'WhatsApp',
  footerSirket: 'Tamuso, LitxTech LLC iştirakidir.',
  navAnasayfa: 'Anasayfa',
  navOzellik: 'Özellikler',
  navCoin: 'Coinler',
  navMeyve: 'Meyve oyunu',
  navHakkinda: 'Hakkında',
  navPolitika: 'Politikalar',
  navBlog: 'Blog',
  navDestek: 'Canlı destek',
  navYatirim: 'Yatırım',
  navIsbirligi: 'İşbirliği',
  canliSerit: [
    'Yayınlar açık',
    'Görüntülü görüşme hazır',
    'Ses odaları doluyor',
    'Yeni insanlar keşfette',
    'Destek hattı açık',
  ],
  vizyonBaslik: 'Vizyon',
  vizyonGovde:
    'Tamuso’nun uzun vadesi, insanların aynı anda yayın açabildiği, görüntülü konuşabildiği, oyun oynayabildiği ve birbirini ülke ile şehir ölçeğinde bulabildiği tek sosyal katman olmaktır. Kısa sohbetler kalıcı ilişkiye, yayınlar ise kendi ekonomisine dönüşsün istiyoruz. Uygulama bugün görüşme, yayın, mesaj, hikâye, ses odası ve meyve çarkı ile yaşıyor. Önümüzdeki yıllarda aynı hesabın içinde daha derin araçlar açılacak: yayıncının kendi topluluğu, ajansın kendi vitrini, izleyicinin kendi kimliği.',
  vizyonMaddeler: [
    'Daha uzun yayın formatları ve yayın içi mini etkinlikler.',
    'Ülke ve şehir liglerinin sezonluk hale gelmesi, yayıncıların kendi şehirlerini temsil etmesi.',
    'Hediye, coin ve ajans akışının tek cüzdanda toplanması. Fiyatlar uygulama içinde kalır, bu sitede vaat edilmez.',
    'Yapay zekâ ile müzik, klip ve yayın stüdyosu araçlarının yayıncının eline inmesi.',
    'Ses odalarında oyun, yarışma ve birlikte izleme.',
    'Hikâyelerin yayın ve profile bağlanması, izleyicinin kaldığı yerden devam etmesi.',
    'Çok dilli yayın altyazısı ve ülkeye göre keşfet sıralaması.',
    'Ajans paneli, host başvurusu ve yayıncı sözleşmelerinin uygulama içinden yönetilmesi.',
    'Canlı destek, güvenlik ve topluluk kurallarının her yeni özellikte aynı standartta kalması.',
  ],
  yatirimBaslik: 'Yatırım',
  yatirimGovde:
    'Tamuso, görüntülü sosyal yayın ve oyun katmanını büyüten bir üründür. Yatırım görüşmesi, ortaklık teklifi ve kurumsal yazışma için aşağıdaki adrese yazın. Bu sayfa bir teklif, getiri veya satış vaadi değildir.',
  yatirimMaddeler: [
    'E-posta: support@litxtech.com',
    'Konu satırına “Yatırım” yazın.',
    'Kısa olarak kim olduğunuzu, ilgi alanınızı ve dönüş adresinizi belirtin.',
    'Ürün hâlâ yayında büyüyor. Rakam, değerleme veya pay satışı bu sayfada yoktur.',
  ],
  isbirligiBaslik: 'İşbirliği',
  isbirligiGovde:
    'Ajanslar, yayıncılar, etkinlik ekipleri ve markalar Tamuso ile birlikte çalışabilir. Yayın, ses odası, ülke sayfası ve oyun katmanı ortak projelere açıktır.',
  isbirligiMaddeler: [
    'E-posta: support@litxtech.com',
    'Konu satırına “İşbirliği” yazın.',
    'Ajans veya marka adı, ülke ve istediğiniz işi kısaca anlatın.',
    'Yayıncı başvuruları uygulama içindeki ajans ve host akışından da yürür.',
  ],
  mailYaz: 'support@litxtech.com adresine yaz',
};

const EN: TanitimMetin = {
  ...TR,
  giris: 'Log in',
  kayit: 'Sign up',
  uygulamayaGec: 'Open the app',
  menu: 'Menu',
  kapat: 'Close',
  dil: 'Language',
  heroRozet: 'Live',
  heroBaslik: 'Video chat, live streams, and messages with real people',
  heroAlt:
    'Video calls, live streams, messaging, and finding friends in one app. Rooms, streams, and chats stay open together.',
  ornekEkran: 'Sample screen',
  sahneGorusme: 'Video call',
  sahneGorusmeAlt: 'Connect one to one on camera and see the other person live.',
  sahneCanli: 'Live stream',
  sahneCanliAlt: 'Go live or watch a stream.',
  sahneMesaj: 'Messaging',
  sahneMesajAlt: 'Chat on the message screen, including during a call.',
  sahneKesfet: 'Find friends',
  sahneKesfetAlt: 'See new people and rooms on Discover.',
  sohbet: ['Hey, are you free?', 'Yes, let’s switch to video.', 'Okay, calling you.'],
  kesfetKart: ['Live', 'Chatting', 'In a room', 'New'],
  ozelliklerBaslik: 'Features',
  ozelliklerAlt: 'In app order. Each one opens after you log in.',
  ozellikler: [
    { baslik: 'Video calls', metin: 'One-to-one camera connection.' },
    { baslik: 'Live streams', metin: 'Go live on camera. Viewers watch at the same time.' },
    { baslik: 'PK', metin: 'A duel between hosts. Viewers follow both sides.' },
    { baslik: 'Voice rooms', metin: 'Talk together in rooms with a microphone.' },
    { baslik: 'Messaging', metin: 'Chats, threads, and messages inside a call.' },
    { baslik: 'Stories', metin: 'Short-lived visual posts.' },
    { baslik: 'Discover', metin: 'Find new people, rooms, and streams.' },
    { baslik: 'Contacts', metin: 'Friends and connections in one place.' },
    { baslik: 'Country and city', metin: 'Country pages, cities, and the city league.' },
    { baslik: 'Rankings', metin: 'Stream and participation ranks.' },
    { baslik: 'Coins', metin: 'In-app balance used for gifts, calls, and games.' },
    { baslik: 'Fruit wheel', metin: 'A live wheel with eight fruits. The result is set on the server.' },
    { baslik: 'Other games', metin: 'Sis Spin and games in the studio.' },
    { baslik: 'AI music and studio', metin: 'Music creation and the broadcast studio.' },
    { baslik: 'Agency and host', metin: 'Agency tools and host applications.' },
    { baslik: 'Announcements', metin: 'Platform announcements in one place.' },
    { baslik: 'Live support', metin: 'In-app support chat, email, and WhatsApp.' },
    { baslik: 'Safety and policies', metin: 'Community rules, privacy, and terms.' },
  ],
  coinBaslik: 'Coins',
  coinAlt:
    'A coin is the balance inside Tamuso. It is spent on video calls, gifts, and games. Top-ups happen inside the app.',
  coinMaddeler: [
    'A coin is an in-app balance, not a payment instrument.',
    'It is used for gifts, calls, and the fruit wheel.',
    'Prices are not listed here. The current amount is shown in the app.',
    'Agency packages follow that agency’s own sales flow.',
  ],
  coinButon: 'About coins',
  meyveBaslik: 'Fruit game',
  meyveAlt:
    'Fruit Wheel is a live wheel with eight fruits. Round time, close, and result follow the server.',
  meyveMaddeler: [
    'While a round is open, coins can be placed on one or more fruits.',
    'After the round closes, the choice does not change.',
    'The winning fruit is chosen on the server when the round opens.',
    'Payouts follow only the account the server records.',
    'This game is not a guarantee of winnings.',
  ],
  meyveButon: 'Fruit game',
  meyveGiris: 'Log in to play',
  hakkindaBaslik: 'About Tamuso',
  hakkindaGovde:
    'Tamuso is a social app for video calls, live streams, voice rooms, messaging, stories, discover, and games. People meet here, go live, and stay in the same conversation.',
  hakkindaMaddeler: [
    'Product: Tamuso',
    'Support: support@litxtech.com',
    'Investment and partnership notes go to the same address.',
  ],
  hakkindaButon: 'Company and app',
  politikaBaslik: 'Policies',
  politikaAlt: 'Community rules, privacy, terms of use, and child safety.',
  politikaButon: 'Open policies',
  sartlar: 'Terms of use',
  gizlilik: 'Privacy',
  cocuk: 'Child safety',
  destekBaslik: 'Live support',
  destekAlt:
    'After you log in, the in-app live support chat opens. Email and WhatsApp can be used anytime.',
  destekAc: 'Open support chat',
  destekGiris: 'Log in and open support',
  destekYaz: 'Email us',
  destekWhatsapp: 'WhatsApp',
  footerSirket: 'Tamuso is a subsidiary of LitxTech LLC.',
  navAnasayfa: 'Home',
  navOzellik: 'Features',
  navCoin: 'Coins',
  navMeyve: 'Fruit game',
  navHakkinda: 'About',
  navPolitika: 'Policies',
  navBlog: 'Blog',
  navDestek: 'Live support',
  navYatirim: 'Investment',
  navIsbirligi: 'Partnership',
  canliSerit: [
    'Streams are open',
    'Video calls are ready',
    'Voice rooms are filling',
    'New people are on Discover',
    'Support is open',
  ],
  vizyonBaslik: 'Vision',
  vizyonGovde:
    'Over the long run Tamuso is meant to be the social layer where people stream, talk on camera, play, and find each other by country and city. Short chats should be able to become lasting ties, and streams should be able to carry their own community. Today the app already runs video calls, live streams, messages, stories, voice rooms, and the fruit wheel. In the years ahead the same account will open deeper tools: a creator’s own community, an agency’s own storefront, and a viewer’s own identity.',
  vizyonMaddeler: [
    'Longer stream formats and small events inside a live room.',
    'Seasonal country and city leagues, so creators can represent their city.',
    'Gifts, coins, and agency flows in one in-app balance. Prices stay inside the app and are not promised here.',
    'AI music, clips, and studio tools in the creator’s hands.',
    'Games, contests, and watch-together inside voice rooms.',
    'Stories tied to streams and profiles, so a viewer can continue where they left off.',
    'Multilingual stream captions and Discover ranked by country.',
    'Agency tools, host applications, and creator agreements managed in the app.',
    'Live support, safety, and community rules kept to the same standard as each new feature ships.',
  ],
  yatirimBaslik: 'Investment',
  yatirimGovde:
    'Tamuso is a product growing a social live and games layer. Write to the address below for an investment conversation, a partnership offer, or a company note. This page is not an offer, a return, or a sale.',
  yatirimMaddeler: [
    'Email: support@litxtech.com',
    'Put “Investment” in the subject line.',
    'Say briefly who you are, what you are interested in, and how to reply.',
    'The product is still growing in public. There is no figure, valuation, or share sale on this page.',
  ],
  isbirligiBaslik: 'Partnership',
  isbirligiGovde:
    'Agencies, creators, event teams, and brands can work with Tamuso. Live rooms, voice rooms, country pages, and the games layer are open to joint projects.',
  isbirligiMaddeler: [
    'Email: support@litxtech.com',
    'Put “Partnership” in the subject line.',
    'Name the agency or brand, the country, and the work you have in mind.',
    'Creator applications also run through the in-app agency and host flow.',
  ],
  mailYaz: 'Write to support@litxtech.com',
};

const ES: TanitimMetin = {
  ...EN,
  giris: 'Entrar',
  kayit: 'Registrarse',
  uygulamayaGec: 'Abrir la app',
  menu: 'Menú',
  kapat: 'Cerrar',
  dil: 'Idioma',
  heroRozet: 'En vivo',
  heroBaslik: 'Videollamadas, directos y mensajes con personas reales',
  heroAlt:
    'Videollamadas, directos, mensajes y buscar amigos en una sola app. Salas, directos y chats siguen abiertos juntos.',
  ornekEkran: 'Pantalla de ejemplo',
  sahneGorusme: 'Videollamada',
  sahneGorusmeAlt: 'Conéctate cara a cara con la cámara.',
  sahneCanli: 'Directo',
  sahneCanliAlt: 'Emite o mira una transmisión.',
  sahneMesaj: 'Mensajes',
  sahneMesajAlt: 'Escribe en el chat, también durante una llamada.',
  sahneKesfet: 'Buscar amigos',
  sahneKesfetAlt: 'Ve personas y salas nuevas en Descubrir.',
  sohbet: ['Hola, ¿estás libre?', 'Sí, pasemos a video.', 'Vale, te llamo.'],
  kesfetKart: ['En vivo', 'Chateando', 'En una sala', 'Nuevo'],
  ozelliklerBaslik: 'Funciones',
  ozelliklerAlt: 'En el orden de la app. Se abren después de entrar.',
  ozellikler: [
    { baslik: 'Videollamadas', metin: 'Conexión de cámara uno a uno.' },
    { baslik: 'Directos', metin: 'Emite con la cámara. La audiencia mira al mismo tiempo.' },
    { baslik: 'PK', metin: 'Duelo entre presentadores.' },
    { baslik: 'Salas de voz', metin: 'Hablen juntos con micrófono.' },
    { baslik: 'Mensajes', metin: 'Chats y mensajes dentro de la llamada.' },
    { baslik: 'Historias', metin: 'Publicaciones visuales de corta duración.' },
    { baslik: 'Descubrir', metin: 'Encuentra personas, salas y directos.' },
    { baslik: 'Contactos', metin: 'Amigos y conexiones en un solo lugar.' },
    { baslik: 'País y ciudad', metin: 'Páginas de país, ciudades y liga de ciudades.' },
    { baslik: 'Rankings', metin: 'Clasificación de directos y participación.' },
    { baslik: 'Coins', metin: 'Saldo dentro de la app para regalos, llamadas y juegos.' },
    { baslik: 'Ruleta de frutas', metin: 'Ruleta en vivo con ocho frutas. El resultado lo fija el servidor.' },
    { baslik: 'Otros juegos', metin: 'Sis Spin y juegos del estudio.' },
    { baslik: 'Música IA y estudio', metin: 'Creación musical y estudio de emisión.' },
    { baslik: 'Agencia y host', metin: 'Herramientas de agencia y solicitud de host.' },
    { baslik: 'Avisos', metin: 'Avisos de la plataforma.' },
    { baslik: 'Soporte en vivo', metin: 'Chat de soporte, correo y WhatsApp.' },
    { baslik: 'Seguridad y políticas', metin: 'Normas, privacidad y términos.' },
  ],
  coinBaslik: 'Coins',
  coinAlt:
    'El coin es el saldo dentro de Tamuso. Se usa en videollamadas, regalos y juegos. La recarga se hace en la app.',
  coinMaddeler: [
    'El coin es un saldo interno, no un medio de pago.',
    'Se usa en regalos, llamadas y la ruleta de frutas.',
    'Los precios no están en esta página. El importe actual se ve en la app.',
    'Los paquetes de agencia siguen el flujo de venta de esa agencia.',
  ],
  coinButon: 'Sobre los coins',
  meyveBaslik: 'Juego de frutas',
  meyveAlt:
    'Fruit Wheel es una ruleta en vivo de ocho frutas. La hora, el cierre y el resultado dependen del servidor.',
  meyveMaddeler: [
    'Con la ronda abierta, los coins pueden ir a una o varias frutas.',
    'Cuando la ronda cierra, la elección no cambia.',
    'La fruta ganadora se decide en el servidor al abrir la ronda.',
    'El pago sigue solo la cuenta que registra el servidor.',
    'Este juego no garantiza ganancias.',
  ],
  meyveButon: 'Juego de frutas',
  meyveGiris: 'Entra para jugar',
  hakkindaBaslik: 'Sobre Tamuso',
  hakkindaGovde:
    'Tamuso es una app social de videollamadas, directos, salas de voz, mensajes, historias, descubrir y juegos.',
  hakkindaMaddeler: [
    'Producto: Tamuso',
    'Soporte: support@litxtech.com',
    'Inversión y colaboración se escriben a la misma dirección.',
  ],
  hakkindaButon: 'Empresa y app',
  politikaBaslik: 'Políticas',
  politikaAlt: 'Normas de la comunidad, privacidad, términos y seguridad infantil.',
  politikaButon: 'Abrir políticas',
  sartlar: 'Términos de uso',
  gizlilik: 'Privacidad',
  cocuk: 'Seguridad infantil',
  destekBaslik: 'Soporte en vivo',
  destekAlt:
    'Después de entrar se abre el chat de soporte de la app. El correo y WhatsApp están siempre disponibles.',
  destekAc: 'Abrir chat de soporte',
  destekGiris: 'Entrar y abrir soporte',
  destekYaz: 'Escribir por correo',
  destekWhatsapp: 'WhatsApp',
  footerSirket: 'Tamuso es una filial de LitxTech LLC.',
  navAnasayfa: 'Inicio',
  navOzellik: 'Funciones',
  navCoin: 'Coins',
  navMeyve: 'Juego de frutas',
  navHakkinda: 'Acerca de',
  navPolitika: 'Políticas',
  navBlog: 'Blog',
  navDestek: 'Soporte en vivo',
};

const PT: TanitimMetin = {
  ...EN,
  giris: 'Entrar',
  kayit: 'Criar conta',
  uygulamayaGec: 'Abrir o app',
  menu: 'Menu',
  kapat: 'Fechar',
  dil: 'Idioma',
  heroRozet: 'Ao vivo',
  heroBaslik: 'Videochamada, lives e mensagens com pessoas reais',
  heroAlt:
    'Videochamadas, lives, mensagens e encontrar amigos num só app. Salas, lives e chats ficam abertos juntos.',
  ornekEkran: 'Tela de exemplo',
  sahneGorusme: 'Videochamada',
  sahneGorusmeAlt: 'Ligue a câmera e veja a outra pessoa ao vivo.',
  sahneCanli: 'Live',
  sahneCanliAlt: 'Entre ao vivo ou assista uma transmissão.',
  sahneMesaj: 'Mensagens',
  sahneMesajAlt: 'Converse no chat, também durante a chamada.',
  sahneKesfet: 'Encontrar amigos',
  sahneKesfetAlt: 'Veja pessoas e salas novas em Descobrir.',
  sohbet: ['Oi, você está livre?', 'Sim, vamos para o vídeo.', 'Ok, estou te ligando.'],
  kesfetKart: ['Ao vivo', 'Conversando', 'Na sala', 'Novo'],
  ozelliklerBaslik: 'Recursos',
  ozelliklerAlt: 'Na ordem do app. Abrem depois do login.',
  ozellikler: [
    { baslik: 'Videochamadas', metin: 'Ligação de câmera um a um.' },
    { baslik: 'Lives', metin: 'Transmita com a câmera. A audiência assiste ao mesmo tempo.' },
    { baslik: 'PK', metin: 'Duelo entre apresentadores.' },
    { baslik: 'Salas de voz', metin: 'Conversem juntos com microfone.' },
    { baslik: 'Mensagens', metin: 'Chats e mensagens dentro da chamada.' },
    { baslik: 'Stories', metin: 'Publicações visuais de curta duração.' },
    { baslik: 'Descobrir', metin: 'Encontre pessoas, salas e lives.' },
    { baslik: 'Contatos', metin: 'Amigos e conexões num só lugar.' },
    { baslik: 'País e cidade', metin: 'Páginas de país, cidades e liga das cidades.' },
    { baslik: 'Rankings', metin: 'Rankings de lives e participação.' },
    { baslik: 'Coins', metin: 'Saldo no app para presentes, chamadas e jogos.' },
    { baslik: 'Roda de frutas', metin: 'Roda ao vivo com oito frutas. O resultado sai no servidor.' },
    { baslik: 'Outros jogos', metin: 'Sis Spin e jogos do estúdio.' },
    { baslik: 'Música IA e estúdio', metin: 'Criação musical e estúdio de transmissão.' },
    { baslik: 'Agência e host', metin: 'Ferramentas de agência e pedido de host.' },
    { baslik: 'Avisos', metin: 'Avisos da plataforma.' },
    { baslik: 'Suporte ao vivo', metin: 'Chat de suporte, e-mail e WhatsApp.' },
    { baslik: 'Segurança e políticas', metin: 'Regras, privacidade e termos.' },
  ],
  coinBaslik: 'Coins',
  coinAlt:
    'Coin é o saldo dentro da Tamuso. É usado em videochamadas, presentes e jogos. A recarga acontece no app.',
  coinMaddeler: [
    'Coin é um saldo interno, não um meio de pagamento.',
    'Serve para presentes, chamadas e a roda de frutas.',
    'Os preços não estão nesta página. O valor atual aparece no app.',
    'Pacotes de agência seguem o fluxo de venda daquela agência.',
  ],
  coinButon: 'Sobre os coins',
  meyveBaslik: 'Jogo de frutas',
  meyveAlt:
    'Fruit Wheel é uma roda ao vivo com oito frutas. Horário, fechamento e resultado seguem o servidor.',
  meyveMaddeler: [
    'Com a rodada aberta, os coins podem ir para uma ou mais frutas.',
    'Depois que a rodada fecha, a escolha não muda.',
    'A fruta vencedora é definida no servidor ao abrir a rodada.',
    'O pagamento segue só a conta registrada pelo servidor.',
    'Este jogo não garante ganho.',
  ],
  meyveButon: 'Jogo de frutas',
  meyveGiris: 'Entre para jogar',
  hakkindaBaslik: 'Sobre a Tamuso',
  hakkindaGovde:
    'A Tamuso é um app social de videochamadas, lives, salas de voz, mensagens, stories, descobrir e jogos.',
  hakkindaMaddeler: [
    'Produto: Tamuso',
    'Suporte: support@litxtech.com',
    'Investimento e parceria vão para o mesmo endereço.',
  ],
  hakkindaButon: 'Empresa e app',
  politikaBaslik: 'Políticas',
  politikaAlt: 'Regras da comunidade, privacidade, termos e segurança infantil.',
  politikaButon: 'Abrir políticas',
  sartlar: 'Termos de uso',
  gizlilik: 'Privacidade',
  cocuk: 'Segurança infantil',
  destekBaslik: 'Suporte ao vivo',
  destekAlt:
    'Depois do login abre o chat de suporte do app. E-mail e WhatsApp ficam sempre disponíveis.',
  destekAc: 'Abrir chat de suporte',
  destekGiris: 'Entrar e abrir o suporte',
  destekYaz: 'Escrever e-mail',
  destekWhatsapp: 'WhatsApp',
  footerSirket: 'A Tamuso é uma subsidiária da LitxTech LLC.',
  navAnasayfa: 'Início',
  navOzellik: 'Recursos',
  navCoin: 'Coins',
  navMeyve: 'Jogo de frutas',
  navHakkinda: 'Sobre',
  navPolitika: 'Políticas',
  navBlog: 'Blog',
  navDestek: 'Suporte ao vivo',
};

const AR: TanitimMetin = {
  ...EN,
  giris: 'تسجيل الدخول',
  kayit: 'إنشاء حساب',
  uygulamayaGec: 'افتح التطبيق',
  menu: 'القائمة',
  kapat: 'إغلاق',
  dil: 'اللغة',
  heroRozet: 'مباشر',
  heroBaslik: 'مكالمات فيديو وبث مباشر ورسائل مع أشخاص حقيقيين',
  heroAlt:
    'مكالمات فيديو وبث مباشر ورسائل والبحث عن أصدقاء في تطبيق واحد. الغرف والبث والدردشة تبقى مفتوحة معاً.',
  ornekEkran: 'شاشة توضيحية',
  sahneGorusme: 'مكالمة فيديو',
  sahneGorusmeAlt: 'اتصل بالكاميرا وشاهد الطرف الآخر مباشرة.',
  sahneCanli: 'بث مباشر',
  sahneCanliAlt: 'ابدأ بثاً أو شاهد بثاً.',
  sahneMesaj: 'الرسائل',
  sahneMesajAlt: 'راسل في الدردشة، وأيضاً أثناء المكالمة.',
  sahneKesfet: 'ابحث عن أصدقاء',
  sahneKesfetAlt: 'شاهد أشخاصاً وغرفاً جديدة في الاستكشاف.',
  sohbet: ['مرحبا، هل أنت متفرغ؟', 'نعم، لننتقل إلى الفيديو.', 'حسناً، سأتصل بك.'],
  kesfetKart: ['مباشر', 'يدردش', 'في غرفة', 'جديد'],
  ozelliklerBaslik: 'الميزات',
  ozelliklerAlt: 'بترتيب التطبيق. تفتح بعد تسجيل الدخول.',
  ozellikler: [
    { baslik: 'مكالمات الفيديو', metin: 'اتصال كاميرا بين شخصين.' },
    { baslik: 'البث المباشر', metin: 'ابدأ البث بالكاميرا ويتابعك المشاهدون في الوقت نفسه.' },
    { baslik: 'PK', metin: 'مبارزة بين المذيعين.' },
    { baslik: 'غرف الصوت', metin: 'تحدثوا معاً بالميكروفون.' },
    { baslik: 'الرسائل', metin: 'دردشة ورسائل داخل المكالمة.' },
    { baslik: 'القصص', metin: 'منشورات مرئية قصيرة المدة.' },
    { baslik: 'استكشاف', metin: 'اعثر على أشخاص وغرف وبثوث.' },
    { baslik: 'جهات الاتصال', metin: 'الأصدقاء والصلات في مكان واحد.' },
    { baslik: 'الدولة والمدينة', metin: 'صفحات الدول والمدن ودوري المدن.' },
    { baslik: 'الترتيب', metin: 'ترتيب البث والمشاركة.' },
    { baslik: 'العملات', metin: 'رصيد داخل التطبيق للهدايا والمكالمات والألعاب.' },
    { baslik: 'عجلة الفاكهة', metin: 'عجلة مباشرة بثماني فواكه. النتيجة تُحدَّد على الخادم.' },
    { baslik: 'ألعاب أخرى', metin: 'Sis Spin وألعاب الاستوديو.' },
    { baslik: 'موسيقى الذكاء والاستوديو', metin: 'إنتاج الموسيقى واستوديو البث.' },
    { baslik: 'الوكالة والمذيع', metin: 'أدوات الوكالة وطلب الانضمام كمذيع.' },
    { baslik: 'الإعلانات', metin: 'إعلانات المنصة.' },
    { baslik: 'الدعم المباشر', metin: 'دردشة الدعم والبريد وواتساب.' },
    { baslik: 'الأمان والسياسات', metin: 'القواعد والخصوصية والشروط.' },
  ],
  coinBaslik: 'العملات',
  coinAlt:
    'العملة رصيد داخل تاموسو. تُستخدم في مكالمات الفيديو والهدايا والألعاب. الشحن يتم داخل التطبيق.',
  coinMaddeler: [
    'العملة رصيد داخلي وليست وسيلة دفع.',
    'تُستخدم في الهدايا والمكالمات وعجلة الفاكهة.',
    'الأسعار ليست في هذه الصفحة. المبلغ الحالي يظهر في التطبيق.',
    'باقات الوكالة تتبع مسار بيع تلك الوكالة.',
  ],
  coinButon: 'عن العملات',
  meyveBaslik: 'لعبة الفاكهة',
  meyveAlt:
    'Fruit Wheel عجلة مباشرة بثماني فواكه. وقت الجولة والإغلاق والنتيجة حسب الخادم.',
  meyveMaddeler: [
    'عندما تكون الجولة مفتوحة يمكن توزيع العملات على فاكهة أو أكثر.',
    'بعد إغلاق الجولة لا يتغير الاختيار.',
    'الفاكهة الرابحة تُحدَّد على الخادم عند فتح الجولة.',
    'الدفع يتبع فقط الحساب الذي يسجله الخادم.',
    'هذه اللعبة ليست ضماناً للربح.',
  ],
  meyveButon: 'لعبة الفاكهة',
  meyveGiris: 'سجّل الدخول للعب',
  hakkindaBaslik: 'عن تاموسو',
  hakkindaGovde:
    'تاموسو تطبيق اجتماعي لمكالمات الفيديو والبث وغرف الصوت والرسائل والقصص والاستكشاف والألعاب.',
  hakkindaMaddeler: [
    'المنتج: Tamuso',
    'الدعم: support@litxtech.com',
  ],
  hakkindaButon: 'الشركة والتطبيق',
  politikaBaslik: 'السياسات',
  politikaAlt: 'قواعد المجتمع والخصوصية وشروط الاستخدام وسلامة الأطفال.',
  politikaButon: 'افتح السياسات',
  sartlar: 'شروط الاستخدام',
  gizlilik: 'الخصوصية',
  cocuk: 'سلامة الأطفال',
  destekBaslik: 'دعم مباشر',
  destekAlt:
    'بعد تسجيل الدخول تفتح دردشة الدعم داخل التطبيق. البريد وواتساب متاحان دائماً.',
  destekAc: 'افتح دردشة الدعم',
  destekGiris: 'سجّل الدخول وافتح الدعم',
  destekYaz: 'راسلنا بالبريد',
  destekWhatsapp: 'واتساب',
  footerSirket: 'تاموسو شركة تابعة لـ LitxTech LLC.',
  navAnasayfa: 'الرئيسية',
  navOzellik: 'الميزات',
  navCoin: 'العملات',
  navMeyve: 'لعبة الفاكهة',
  navHakkinda: 'حول',
  navPolitika: 'السياسات',
  navBlog: 'المدونة',
  navDestek: 'الدعم المباشر',
};

const FR: TanitimMetin = {
  ...EN,
  giris: 'Connexion',
  kayit: 'Inscription',
  uygulamayaGec: 'Ouvrir l’app',
  menu: 'Menu',
  kapat: 'Fermer',
  dil: 'Langue',
  heroRozet: 'En direct',
  heroBaslik: 'Appels vidéo, directs et messages avec de vraies personnes',
  heroAlt:
    'Appels vidéo, directs, messages et recherche d’amis dans une seule app. Salons, directs et chats restent ouverts ensemble.',
  ornekEkran: 'Écran d’exemple',
  sahneGorusme: 'Appel vidéo',
  sahneGorusmeAlt: 'Connectez-vous en face à face avec la caméra.',
  sahneCanli: 'Direct',
  sahneCanliAlt: 'Passez en direct ou regardez un flux.',
  sahneMesaj: 'Messages',
  sahneMesajAlt: 'Écrivez dans le chat, y compris pendant un appel.',
  sahneKesfet: 'Trouver des amis',
  sahneKesfetAlt: 'Voyez de nouvelles personnes et salles dans Découvrir.',
  sohbet: ['Salut, tu es libre ?', 'Oui, on passe en vidéo.', 'D’accord, je t’appelle.'],
  kesfetKart: ['En direct', 'En discussion', 'Dans une salle', 'Nouveau'],
  ozelliklerBaslik: 'Fonctions',
  ozelliklerAlt: 'Dans l’ordre de l’app. Elles s’ouvrent après la connexion.',
  ozellikler: [
    { baslik: 'Appels vidéo', metin: 'Connexion caméra en tête-à-tête.' },
    { baslik: 'Directs', metin: 'Passez en direct. Les spectateurs regardent en même temps.' },
    { baslik: 'PK', metin: 'Duel entre hôtes.' },
    { baslik: 'Salons vocaux', metin: 'Parlez ensemble au micro.' },
    { baslik: 'Messages', metin: 'Discussions et messages pendant l’appel.' },
    { baslik: 'Stories', metin: 'Publications visuelles de courte durée.' },
    { baslik: 'Découvrir', metin: 'Trouvez des personnes, des salles et des directs.' },
    { baslik: 'Contacts', metin: 'Amis et liens au même endroit.' },
    { baslik: 'Pays et ville', metin: 'Pages pays, villes et ligue des villes.' },
    { baslik: 'Classements', metin: 'Classements des directs et de la participation.' },
    { baslik: 'Coins', metin: 'Solde dans l’app pour cadeaux, appels et jeux.' },
    { baslik: 'Roue des fruits', metin: 'Roue en direct à huit fruits. Le résultat est fixé sur le serveur.' },
    { baslik: 'Autres jeux', metin: 'Sis Spin et jeux du studio.' },
    { baslik: 'Musique IA et studio', metin: 'Création musicale et studio de diffusion.' },
    { baslik: 'Agence et hôte', metin: 'Outils d’agence et candidature hôte.' },
    { baslik: 'Annonces', metin: 'Annonces de la plateforme.' },
    { baslik: 'Support en direct', metin: 'Chat de support, e-mail et WhatsApp.' },
    { baslik: 'Sécurité et politiques', metin: 'Règles, confidentialité et conditions.' },
  ],
  coinBaslik: 'Coins',
  coinAlt:
    'Le coin est le solde dans Tamuso. Il sert aux appels vidéo, aux cadeaux et aux jeux. Le rechargement se fait dans l’app.',
  coinMaddeler: [
    'Le coin est un solde interne, pas un moyen de paiement.',
    'Il sert aux cadeaux, aux appels et à la roue des fruits.',
    'Les prix ne sont pas sur cette page. Le montant actuel est dans l’app.',
    'Les packs d’agence suivent le parcours de vente de cette agence.',
  ],
  coinButon: 'À propos des coins',
  meyveBaslik: 'Jeu de fruits',
  meyveAlt:
    'Fruit Wheel est une roue en direct à huit fruits. L’horaire, la clôture et le résultat suivent le serveur.',
  meyveMaddeler: [
    'Tant que le tour est ouvert, les coins peuvent aller sur un ou plusieurs fruits.',
    'Après la clôture, le choix ne change plus.',
    'Le fruit gagnant est choisi sur le serveur à l’ouverture du tour.',
    'Le paiement suit uniquement le compte enregistré par le serveur.',
    'Ce jeu ne garantit pas de gain.',
  ],
  meyveButon: 'Jeu de fruits',
  meyveGiris: 'Se connecter pour jouer',
  hakkindaBaslik: 'À propos de Tamuso',
  hakkindaGovde:
    'Tamuso est une app sociale d’appels vidéo, de directs, de salons vocaux, de messages, de stories, de découverte et de jeux.',
  hakkindaMaddeler: [
    'Produit : Tamuso',
    'Support : support@litxtech.com',
  ],
  hakkindaButon: 'Société et app',
  politikaBaslik: 'Politiques',
  politikaAlt: 'Règles de la communauté, confidentialité, conditions et sécurité des enfants.',
  politikaButon: 'Ouvrir les politiques',
  sartlar: 'Conditions d’utilisation',
  gizlilik: 'Confidentialité',
  cocuk: 'Sécurité des enfants',
  destekBaslik: 'Support en direct',
  destekAlt:
    'Après la connexion, le chat de support de l’app s’ouvre. L’e-mail et WhatsApp restent disponibles.',
  destekAc: 'Ouvrir le chat de support',
  destekGiris: 'Se connecter et ouvrir le support',
  destekYaz: 'Écrire un e-mail',
  destekWhatsapp: 'WhatsApp',
  footerSirket: 'Tamuso est une filiale de LitxTech LLC.',
  navAnasayfa: 'Accueil',
  navOzellik: 'Fonctions',
  navCoin: 'Coins',
  navMeyve: 'Jeu de fruits',
  navHakkinda: 'À propos',
  navPolitika: 'Politiques',
  navBlog: 'Blog',
  navDestek: 'Support en direct',
};

const FIL: TanitimMetin = {
  ...EN,
  giris: 'Mag-login',
  kayit: 'Magparehistro',
  uygulamayaGec: 'Buksan ang app',
  menu: 'Menu',
  kapat: 'Isara',
  dil: 'Wika',
  heroRozet: 'Live',
  heroBaslik: 'Video call, live, at mensahe kasama ang totoong tao',
  heroAlt:
    'Video call, live stream, mensahe, at paghahanap ng kaibigan sa isang app. Bukas nang sabay ang rooms, live, at chat.',
  ornekEkran: 'Halimbawang screen',
  sahneGorusme: 'Video call',
  sahneGorusmeAlt: 'Kumonekta sa camera at makita ang kabila nang live.',
  sahneCanli: 'Live stream',
  sahneCanliAlt: 'Mag-live o manood ng stream.',
  sahneMesaj: 'Mensahe',
  sahneMesajAlt: 'Mag-chat, pati habang may tawag.',
  sahneKesfet: 'Maghanap ng kaibigan',
  sahneKesfetAlt: 'Tingnan ang mga tao at room sa Discover.',
  sohbet: ['Hi, libre ka ba?', 'Oo, lumipat tayo sa video.', 'Sige, tatawag ako.'],
  kesfetKart: ['Live', 'Nagcha-chat', 'Nasa room', 'Bago'],
  ozelliklerBaslik: 'Mga feature',
  ozelliklerAlt: 'Ayon sa ayos sa app. Bubukas pagkatapos mag-login.',
  ozellikler: [
    { baslik: 'Video call', metin: 'One-to-one na koneksyon sa camera.' },
    { baslik: 'Live stream', metin: 'Mag-live sa camera. Sabay nanonood ang mga viewer.' },
    { baslik: 'PK', metin: 'Duelo ng mga host.' },
    { baslik: 'Voice room', metin: 'Mag-usap gamit ang mikropono.' },
    { baslik: 'Mensahe', metin: 'Chat at mensahe habang may tawag.' },
    { baslik: 'Stories', metin: 'Maikling visual na post.' },
    { baslik: 'Discover', metin: 'Humanap ng tao, room, at stream.' },
    { baslik: 'Mga contact', metin: 'Mga kaibigan at koneksyon sa isang lugar.' },
    { baslik: 'Bansa at lungsod', metin: 'Mga pahina ng bansa, lungsod, at city league.' },
    { baslik: 'Rankings', metin: 'Ranggo ng live at pakikilahok.' },
    { baslik: 'Coins', metin: 'Balanse sa app para sa regalo, tawag, at laro.' },
    { baslik: 'Fruit wheel', metin: 'Live na gulong na may walong prutas. Ang resulta ay sa server.' },
    { baslik: 'Ibang laro', metin: 'Sis Spin at mga laro sa studio.' },
    { baslik: 'AI music at studio', metin: 'Paglikha ng musika at broadcast studio.' },
    { baslik: 'Agency at host', metin: 'Mga tool ng agency at aplikasyon ng host.' },
    { baslik: 'Anunsyo', metin: 'Mga anunsyo ng platform.' },
    { baslik: 'Live na suporta', metin: 'Chat ng suporta, email, at WhatsApp.' },
    { baslik: 'Kaligtasan at patakaran', metin: 'Mga tuntunin, privacy, at terms.' },
  ],
  coinBaslik: 'Mga coin',
  coinAlt:
    'Ang coin ay balanse sa loob ng Tamuso. Ginagamit sa video call, regalo, at laro. Ang top-up ay sa app.',
  coinMaddeler: [
    'Ang coin ay panloob na balanse, hindi paraan ng bayad.',
    'Ginagamit sa regalo, tawag, at fruit wheel.',
    'Walang presyo sa pahinang ito. Ang kasalukuyang halaga ay nasa app.',
    'Ang mga package ng agency ay ayon sa benta ng agency na iyon.',
  ],
  coinButon: 'Tungkol sa coins',
  meyveBaslik: 'Larong prutas',
  meyveAlt:
    'Ang Fruit Wheel ay live na gulong na may walong prutas. Ang oras, pagsara, at resulta ay ayon sa server.',
  meyveMaddeler: [
    'Habang bukas ang round, puwedeng ilagay ang coins sa isa o higit pang prutas.',
    'Pagkasara ng round, hindi na nagbabago ang pili.',
    'Ang panalong prutas ay pinipili sa server pagbukas ng round.',
    'Ang bayad ay ayon lang sa account na itinala ng server.',
    'Hindi garantiya ng panalo ang larong ito.',
  ],
  meyveButon: 'Larong prutas',
  meyveGiris: 'Mag-login para maglaro',
  hakkindaBaslik: 'Tungkol sa Tamuso',
  hakkindaGovde:
    'Social app ito para sa video call, live, voice room, mensahe, stories, discover, at mga laro.',
  hakkindaMaddeler: [
    'Produkto: Tamuso',
    'Suporta: support@litxtech.com',
  ],
  hakkindaButon: 'Kumpanya at app',
  politikaBaslik: 'Mga patakaran',
  politikaAlt: 'Mga tuntunin ng komunidad, privacy, terms, at kaligtasan ng bata.',
  politikaButon: 'Buksan ang mga patakaran',
  sartlar: 'Mga tuntunin ng paggamit',
  gizlilik: 'Privacy',
  cocuk: 'Kaligtasan ng bata',
  destekBaslik: 'Live na suporta',
  destekAlt:
    'Pagkatapos mag-login, bubukas ang support chat sa app. Email at WhatsApp ay laging magagamit.',
  destekAc: 'Buksan ang support chat',
  destekGiris: 'Mag-login at buksan ang suporta',
  destekYaz: 'Sumulat sa email',
  destekWhatsapp: 'WhatsApp',
  footerSirket: 'Ang Tamuso ay subsidiary ng LitxTech LLC.',
  navAnasayfa: 'Home',
  navOzellik: 'Mga feature',
  navCoin: 'Mga coin',
  navMeyve: 'Larong prutas',
  navHakkinda: 'Tungkol',
  navPolitika: 'Mga patakaran',
  navBlog: 'Blog',
  navDestek: 'Live na suporta',
};

const TABLO: Record<UygulamaDili, TanitimMetin> = {
  tr: TR,
  en: EN,
  es: ES,
  pt: PT,
  ar: AR,
  fr: FR,
  fil: FIL,
};

export function tanitimMetin(dil: UygulamaDili): TanitimMetin {
  return TABLO[dil] ?? TR;
}
