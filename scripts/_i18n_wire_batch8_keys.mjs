/**
 * Batch-8 leftover keys: odaTema, politikalar titles, cuzdanX UI, bildirimler relative,
 * fikirler media, islemHacmi admin, lobi ambient / form.
 * Run: node scripts/_i18n_wire_batch8_keys.mjs
 */
import fs from 'fs';

const KEYS = {
  tr: {
    odaTema: {
      midnight_plum: 'Gece eriği',
      midnight_plumAlt: 'Mor gece sahnesi',
      neon_aurora: 'Neon aurora',
      neon_auroraAlt: 'Pembe · magenta aurora',
      royal_gold: 'Kraliyet',
      royal_goldAlt: 'Altın VIP atmosfer',
      cosmic_void: 'Kozmik',
      cosmic_voidAlt: 'Derin indigo boşluk',
      arctic_mist: 'Arktik',
      arctic_mistAlt: 'Buz mavisi sis',
      cherry_noir: 'Kiraz noir',
      cherry_noirAlt: 'Koyu kırmızı sahne',
      emerald_haze: 'Zümrüt',
      emerald_hazeAlt: 'Orman yeşili pus',
      sunset_pulse: 'Gün batımı',
      sunset_pulseAlt: 'Turuncu · mercan nabız',
      electric_lilac: 'Elektrik',
      electric_lilacAlt: 'Neon leylak parıltı',
      ocean_depth: 'Okyanus',
      ocean_depthAlt: 'Derin teal dalga',
      velvet_rose: 'Kadife gül',
      velvet_roseAlt: 'Yumuşak rose sahne',
      cyber_mint: 'Siber mint',
      cyber_mintAlt: 'Koyu zemin · mint vurgu',
    },
    politikalar: {
      tosBaslik: 'Kullanım Şartları',
      tosKisa: 'Platform kuralları ve sorumluluklar',
      tosKabulMetni: "Kullanım Şartları'nı okudum ve kabul ediyorum",
      privacyBaslik: 'Gizlilik Politikası',
      privacyKisa: 'Kişisel verilerin işlenmesi',
      privacyKabulMetni: "Gizlilik Politikası'nı okudum ve kabul ediyorum",
      childSafetyBaslik: 'Çocuk Koruma Politikası',
      childSafetyKisa: '18+ · sıfır tolerans · af yok',
      childSafetyKabulMetni: "Çocuk Koruma Politikası'nı okudum ve kabul ediyorum",
      communityBaslik: 'Topluluk Kuralları',
      communityKisa: 'UGC sıfır tolerans · bildir · engelle',
      communityKabulMetni:
        "Topluluk Kuralları'nı okudum ve uygunsuz içerik / tacize sıfır toleransı kabul ediyorum",
      communityGovde: `TAMUSO TOPLULUK KURALLARI

Son güncelleme: 22 Eylül 2026
Sürüm: 1.0

Tamuso, kullanıcıların ürettiği içeriğe (durum, yorum, mesaj, ses odası, canlı yayın) açıktır.
Uygunsuz içerik ve kötüye kullanıma SIFIR TOLERANS uygulanır.

────────────────────────────────
1. YAŞ
────────────────────────────────
Platform yalnızca 18 yaş ve üzeri içindir. Reşit olmayan içerik veya katılım yasaktır.

────────────────────────────────
2. YASAK İÇERİK VE DAVRANIŞ
────────────────────────────────
Kesinlikle yasaktır:
• Taciz, tehdit, stalking, zorbalık
• Nefret söylemi ve ayrımcılık
• Pornografik / cinsel sömürü içeriği
• İzinsiz cinsel içerik
• Çocukların cinsel istismarıyla ilgili her türlü içerik (CSAM) — af yoktur
• Şiddet tehdidi veya gerçek hayata yönelik zarar
• Dolandırıcılık, phishing, spam
• Başkasını taklit (impersonation)
• İzinsiz kişisel bilgi paylaşımı (doxxing)
• Telif hakkı ihlali
• Hukuka aykırı içerik
• Platformu kötüye kullanma, bot, exploit

────────────────────────────────
3. MODERASYON VE 24 SAAT
────────────────────────────────
• Kullanıcılar Bildir / Engelle araçlarını kullanabilir.
• Raporlar moderasyon kuyruğuna düşer; hedefimiz 24 saat içinde incelemektir.
• İhlalde içerik kaldırılır; tekrarlayan veya ağır ihlalde hesap uyarılır, askıya alınır veya kapatılır.

────────────────────────────────
4. İLETİŞİM
────────────────────────────────
Uygulama içi: Güvenlik → Bize Ulaşın
E-posta: support@litxtech.com
Canlı Destek: Ayarlar / Güvenlik

Bu kurallar Kullanım Şartları ve Çocuk Koruma Politikası ile birlikte geçerlidir.
`,
    },
    cuzdanX: {
      uiEyebrow: 'HESABIM',
      uiKartTipi: 'Dijital cüzdan',
      uiBrandTagline:
        'Ses odası, gönderi, mesaj ve canlı yayın aktiviteleri ile platform ödüllerinin özeti.',
      uiKatalogLabel: 'Katalog değeri',
      uiPlatformLabel: 'Platform hizmet payı',
      uiSellerNetLabel: 'Tahmini hesap özeti',
      uiPaymentNote:
        'Hesap hareketleri ayın 01–15 ve 15–31 dönemlerinde işlenir.',
      uiLanguageNote:
        'Gösterilen tutarlar uygulama içi sanal öğe katalog özetidir; gerçek para ödemesi değildir.',
      uiTakasTitle: 'Coin takas',
      uiTakasSubtitle: 'Hesaplar arası transfer',
      uiKycTitle: 'Kimlik onayı',
      uiHesapOzetiTitle: 'Hesap özeti',
      uiHesapOzetiSubtitle: 'PDF / Excel',
      uiCoinInfo:
        'Coinler Tamuso içinde kullanılan sanal öğelerdir; uygulama dışı gerçek para ödemesi değildir.',
      uiPurchaseLocked: 'Satın alma geçici olarak kapalı.',
      uiSummaryTitle: 'Özet',
      uiHeroNote:
        'Cüzdan bakiyen; içerik, hediye ve platform aktivitelerini yönetmek içindir.',
    },
    bildirimler: {
      azOnce: 'Az önce',
      dkOnce: '{{n}} dk önce',
      saOnce: '{{n}} sa önce',
    },
    fikirler: {
      gorselYuklenemedi: 'Görsel yüklenemedi',
    },
    islemHacmi: {
      kademeBulunamadi: 'Kademe bulunamadı',
    },
    lobi: {
      formBaslik: 'Giriş',
      ambientCafeIkili: 'Kafe sohbeti',
      ambientCafeSohbet: 'Arkadaş sohbeti',
      ambientCafeGulme: 'Canlı ortam',
    },
  },
  en: {
    odaTema: {
      midnight_plum: 'Midnight plum',
      midnight_plumAlt: 'Purple night scene',
      neon_aurora: 'Neon aurora',
      neon_auroraAlt: 'Pink · magenta aurora',
      royal_gold: 'Royal',
      royal_goldAlt: 'Gold VIP atmosphere',
      cosmic_void: 'Cosmic',
      cosmic_voidAlt: 'Deep indigo void',
      arctic_mist: 'Arctic',
      arctic_mistAlt: 'Ice-blue mist',
      cherry_noir: 'Cherry noir',
      cherry_noirAlt: 'Dark red scene',
      emerald_haze: 'Emerald',
      emerald_hazeAlt: 'Forest-green haze',
      sunset_pulse: 'Sunset',
      sunset_pulseAlt: 'Orange · coral pulse',
      electric_lilac: 'Electric',
      electric_lilacAlt: 'Neon lilac glow',
      ocean_depth: 'Ocean',
      ocean_depthAlt: 'Deep teal wave',
      velvet_rose: 'Velvet rose',
      velvet_roseAlt: 'Soft rose scene',
      cyber_mint: 'Cyber mint',
      cyber_mintAlt: 'Dark base · mint accent',
    },
    politikalar: {
      tosBaslik: 'Terms of Use',
      tosKisa: 'Platform rules and responsibilities',
      tosKabulMetni: 'I have read and accept the Terms of Use',
      privacyBaslik: 'Privacy Policy',
      privacyKisa: 'How personal data is processed',
      privacyKabulMetni: 'I have read and accept the Privacy Policy',
      childSafetyBaslik: 'Child Safety Policy',
      childSafetyKisa: '18+ · zero tolerance · no amnesty',
      childSafetyKabulMetni: 'I have read and accept the Child Safety Policy',
      communityBaslik: 'Community Guidelines',
      communityKisa: 'UGC zero tolerance · report · block',
      communityKabulMetni:
        'I have read the Community Guidelines and accept zero tolerance for inappropriate content / harassment',
      communityGovde: `TAMUSO COMMUNITY GUIDELINES

Last updated: 22 September 2026
Version: 1.0

Tamuso is open to user-generated content (status, comments, messages, voice rooms, live streams).
ZERO TOLERANCE applies to inappropriate content and abuse.

────────────────────────────────
1. AGE
────────────────────────────────
The Platform is for ages 18 and over only. Underage content or participation is prohibited.

────────────────────────────────
2. PROHIBITED CONTENT AND BEHAVIOR
────────────────────────────────
Strictly prohibited:
• Harassment, threats, stalking, bullying
• Hate speech and discrimination
• Pornographic / sexual exploitation content
• Non-consensual sexual content
• Any content related to child sexual abuse (CSAM) — no amnesty
• Threats of violence or real-world harm
• Fraud, phishing, spam
• Impersonation
• Sharing personal information without consent (doxxing)
• Copyright infringement
• Unlawful content
• Platform abuse, bots, exploits

────────────────────────────────
3. MODERATION AND 24 HOURS
────────────────────────────────
• Users can use Report / Block tools.
• Reports enter the moderation queue; our target is review within 24 hours.
• On violation, content is removed; repeat or severe violations may lead to warning, suspension, or account closure.

────────────────────────────────
4. CONTACT
────────────────────────────────
In-app: Safety → Contact Us
Email: support@litxtech.com
Live Support: Settings / Safety

These guidelines apply together with the Terms of Use and Child Safety Policy.
`,
    },
    cuzdanX: {
      uiEyebrow: 'MY ACCOUNT',
      uiKartTipi: 'Digital wallet',
      uiBrandTagline:
        'Summary of voice room, posts, messages, live activity, and platform rewards.',
      uiKatalogLabel: 'Catalog value',
      uiPlatformLabel: 'Platform service share',
      uiSellerNetLabel: 'Estimated account summary',
      uiPaymentNote:
        'Account activity is processed in the 01–15 and 15–31 periods of each month.',
      uiLanguageNote:
        'Amounts shown are an in-app virtual item catalog summary; not a real-money payout.',
      uiTakasTitle: 'Coin exchange',
      uiTakasSubtitle: 'Transfer between accounts',
      uiKycTitle: 'Identity verification',
      uiHesapOzetiTitle: 'Account statement',
      uiHesapOzetiSubtitle: 'PDF / Excel',
      uiCoinInfo:
        'Coins are virtual items used within Tamuso; they are not a real-money payout outside the app.',
      uiPurchaseLocked: 'Purchases are temporarily unavailable.',
      uiSummaryTitle: 'Summary',
      uiHeroNote:
        'Your wallet balance helps manage content, gifts, and platform activity.',
    },
    bildirimler: {
      azOnce: 'Just now',
      dkOnce: '{{n}} min ago',
      saOnce: '{{n}} h ago',
    },
    fikirler: {
      gorselYuklenemedi: 'Could not upload image',
    },
    islemHacmi: {
      kademeBulunamadi: 'Tier not found',
    },
    lobi: {
      formBaslik: 'Sign in',
      ambientCafeIkili: 'Café chat',
      ambientCafeSohbet: 'Friends chatting',
      ambientCafeGulme: 'Lively scene',
    },
  },
  es: {
    odaTema: {
      midnight_plum: 'Ciruela nocturna',
      midnight_plumAlt: 'Escena nocturna morada',
      neon_aurora: 'Aurora neón',
      neon_auroraAlt: 'Rosa · magenta aurora',
      royal_gold: 'Real',
      royal_goldAlt: 'Ambiente VIP dorado',
      cosmic_void: 'Cósmico',
      cosmic_voidAlt: 'Vacío índigo profundo',
      arctic_mist: 'Ártico',
      arctic_mistAlt: 'Niebla azul hielo',
      cherry_noir: 'Cereza noir',
      cherry_noirAlt: 'Escena rojo oscuro',
      emerald_haze: 'Esmeralda',
      emerald_hazeAlt: 'Bruma verde bosque',
      sunset_pulse: 'Atardecer',
      sunset_pulseAlt: 'Naranja · pulso coral',
      electric_lilac: 'Eléctrico',
      electric_lilacAlt: 'Brillo lila neón',
      ocean_depth: 'Océano',
      ocean_depthAlt: 'Ola teal profunda',
      velvet_rose: 'Rosa terciopelo',
      velvet_roseAlt: 'Escena rosa suave',
      cyber_mint: 'Ciber menta',
      cyber_mintAlt: 'Base oscura · acento menta',
    },
    politikalar: {
      tosBaslik: 'Términos de uso',
      tosKisa: 'Reglas y responsabilidades de la plataforma',
      tosKabulMetni: 'He leído y acepto los Términos de uso',
      privacyBaslik: 'Política de privacidad',
      privacyKisa: 'Tratamiento de datos personales',
      privacyKabulMetni: 'He leído y acepto la Política de privacidad',
      childSafetyBaslik: 'Política de protección infantil',
      childSafetyKisa: '18+ · tolerancia cero · sin amnistía',
      childSafetyKabulMetni:
        'He leído y acepto la Política de protección infantil',
      communityBaslik: 'Normas de la comunidad',
      communityKisa: 'UGC tolerancia cero · denunciar · bloquear',
      communityKabulMetni:
        'He leído las Normas de la comunidad y acepto tolerancia cero ante contenido inapropiado / acoso',
      communityGovde: `NORMAS DE LA COMUNIDAD TAMUSO

Última actualización: 22 de septiembre de 2026
Versión: 1.0

Tamuso está abierto al contenido generado por usuarios (estados, comentarios, mensajes, salas de voz, directos).
Se aplica TOLERANCIA CERO al contenido inapropiado y al abuso.

────────────────────────────────
1. EDAD
────────────────────────────────
La Plataforma es solo para mayores de 18 años. El contenido o la participación de menores está prohibida.

────────────────────────────────
2. CONTENIDO Y CONDUCTA PROHIBIDOS
────────────────────────────────
Está estrictamente prohibido:
• Acoso, amenazas, stalking, intimidación
• Discurso de odio y discriminación
• Contenido pornográfico / de explotación sexual
• Contenido sexual no consentido
• Cualquier contenido relacionado con abuso sexual infantil (CSAM) — sin amnistía
• Amenazas de violencia o daño en la vida real
• Fraude, phishing, spam
• Suplantación de identidad
• Compartir información personal sin consentimiento (doxxing)
• Infracción de derechos de autor
• Contenido ilegal
• Abuso de la plataforma, bots, exploits

────────────────────────────────
3. MODERACIÓN Y 24 HORAS
────────────────────────────────
• Los usuarios pueden usar Denunciar / Bloquear.
• Los reportes entran en la cola de moderación; el objetivo es revisar en 24 horas.
• Ante una infracción se elimina el contenido; las infracciones graves o repetidas pueden llevar a aviso, suspensión o cierre de la cuenta.

────────────────────────────────
4. CONTACTO
────────────────────────────────
En la app: Seguridad → Contáctanos
Correo: support@litxtech.com
Soporte en vivo: Ajustes / Seguridad

Estas normas se aplican junto con los Términos de uso y la Política de protección infantil.
`,
    },
    cuzdanX: {
      uiEyebrow: 'MI CUENTA',
      uiKartTipi: 'Cartera digital',
      uiBrandTagline:
        'Resumen de salas de voz, publicaciones, mensajes, actividad en vivo y recompensas de la plataforma.',
      uiKatalogLabel: 'Valor de catálogo',
      uiPlatformLabel: 'Cuota de servicio de la plataforma',
      uiSellerNetLabel: 'Resumen estimado de la cuenta',
      uiPaymentNote:
        'La actividad de la cuenta se procesa en los periodos 01–15 y 15–31 de cada mes.',
      uiLanguageNote:
        'Los importes mostrados son un resumen de catálogo de objetos virtuales; no es un pago en dinero real.',
      uiTakasTitle: 'Intercambio de coins',
      uiTakasSubtitle: 'Transferencia entre cuentas',
      uiKycTitle: 'Verificación de identidad',
      uiHesapOzetiTitle: 'Extracto de cuenta',
      uiHesapOzetiSubtitle: 'PDF / Excel',
      uiCoinInfo:
        'Las coins son objetos virtuales de Tamuso; no son un pago en dinero real fuera de la app.',
      uiPurchaseLocked: 'Las compras no están disponibles temporalmente.',
      uiSummaryTitle: 'Resumen',
      uiHeroNote:
        'El saldo de tu cartera sirve para gestionar contenido, regalos y actividad de la plataforma.',
    },
    bildirimler: {
      azOnce: 'Justo ahora',
      dkOnce: 'hace {{n}} min',
      saOnce: 'hace {{n}} h',
    },
    fikirler: {
      gorselYuklenemedi: 'No se pudo subir la imagen',
    },
    islemHacmi: {
      kademeBulunamadi: 'Nivel no encontrado',
    },
    lobi: {
      formBaslik: 'Entrar',
      ambientCafeIkili: 'Charla en café',
      ambientCafeSohbet: 'Amigos conversando',
      ambientCafeGulme: 'Ambiente animado',
    },
  },
  ar: {
    odaTema: {
      midnight_plum: 'برقوق منتصف الليل',
      midnight_plumAlt: 'مشهد ليلي بنفسجي',
      neon_aurora: 'شفق نيون',
      neon_auroraAlt: 'وردي · أرجواني شفقي',
      royal_gold: 'ملكي',
      royal_goldAlt: 'أجواء VIP ذهبية',
      cosmic_void: 'كوني',
      cosmic_voidAlt: 'فراغ نيلي عميق',
      arctic_mist: 'قطبي',
      arctic_mistAlt: 'ضباب أزرق جليدي',
      cherry_noir: 'كرز نواري',
      cherry_noirAlt: 'مشهد أحمر داكن',
      emerald_haze: 'زمردي',
      emerald_hazeAlt: 'ضباب أخضر غابة',
      sunset_pulse: 'غروب',
      sunset_pulseAlt: 'برتقالي · نبض مرجاني',
      electric_lilac: 'كهربائي',
      electric_lilacAlt: 'توهج ليلكي نيون',
      ocean_depth: 'محيط',
      ocean_depthAlt: 'موجة تيل عميقة',
      velvet_rose: 'ورد مخملي',
      velvet_roseAlt: 'مشهد وردي ناعم',
      cyber_mint: 'نعناع سيبراني',
      cyber_mintAlt: 'قاعدة داكنة · لمسة نعناع',
    },
    politikalar: {
      tosBaslik: 'شروط الاستخدام',
      tosKisa: 'قواعد المنصة والمسؤوليات',
      tosKabulMetni: 'قرأت شروط الاستخدام وأوافق عليها',
      privacyBaslik: 'سياسة الخصوصية',
      privacyKisa: 'معالجة البيانات الشخصية',
      privacyKabulMetni: 'قرأت سياسة الخصوصية وأوافق عليها',
      childSafetyBaslik: 'سياسة حماية الطفل',
      childSafetyKisa: '18+ · عدم تسامح · بلا عفو',
      childSafetyKabulMetni: 'قرأت سياسة حماية الطفل وأوافق عليها',
      communityBaslik: 'قواعد المجتمع',
      communityKisa: 'محتوى المستخدم · عدم تسامح · إبلاغ · حظر',
      communityKabulMetni:
        'قرأت قواعد المجتمع وأقبل عدم التسامح مع المحتوى غير اللائق / التحرش',
      communityGovde: `قواعد مجتمع تاموسو

آخر تحديث: 22 سبتمبر 2026
الإصدار: 1.0

تاموسو مفتوح لمحتوى المستخدمين (الحالة والتعليقات والرسائل وغرف الصوت والبث المباشر).
يُطبَّق عدم تسامح تام مع المحتوى غير اللائق وإساءة الاستخدام.

────────────────────────────────
1. العمر
────────────────────────────────
المنصة لمن بلغوا 18 عاماً فأكثر فقط. محتوى أو مشاركة القاصرين محظور.

────────────────────────────────
2. المحتوى والسلوك المحظور
────────────────────────────────
يُحظر قطعاً:
• التحرش والتهديد والملاحقة والتنمّر
• خطاب الكراهية والتمييز
• المحتوى الإباحي / الاستغلال الجنسي
• المحتوى الجنسي دون موافقة
• أي محتوى يتعلق بالاستغلال الجنسي للأطفال (CSAM) — بلا عفو
• تهديدات العنف أو الأذى في الواقع
• الاحتيال والتصيّد والرسائل المزعجة
• انتحال الهوية
• مشاركة معلومات شخصية دون موافقة
• انتهاك حقوق النشر
• المحتوى غير القانوني
• إساءة استخدام المنصة والبوتات والاستغلال

────────────────────────────────
3. الإشراف و24 ساعة
────────────────────────────────
• يمكن للمستخدمين استخدام الإبلاغ / الحظر.
• تدخل البلاغات قائمة الإشراف؛ هدفنا المراجعة خلال 24 ساعة.
• عند المخالفة يُزال المحتوى؛ المخالفات المتكررة أو الجسيمة قد تؤدي إلى تحذير أو تعليق أو إغلاق الحساب.

────────────────────────────────
4. التواصل
────────────────────────────────
داخل التطبيق: الأمان ← اتصل بنا
البريد: support@litxtech.com
الدعم المباشر: الإعدادات / الأمان

تسري هذه القواعد مع شروط الاستخدام وسياسة حماية الطفل.
`,
    },
    cuzdanX: {
      uiEyebrow: 'حسابي',
      uiKartTipi: 'محفظة رقمية',
      uiBrandTagline:
        'ملخص غرف الصوت والمنشورات والرسائل والبث والمكافآت على المنصة.',
      uiKatalogLabel: 'قيمة الكتالوج',
      uiPlatformLabel: 'حصة خدمة المنصة',
      uiSellerNetLabel: 'ملخص تقديري للحساب',
      uiPaymentNote:
        'تُعالج حركة الحساب في فترتي 01–15 و15–31 من كل شهر.',
      uiLanguageNote:
        'المبالغ المعروضة ملخص كتالوج لعناصر افتراضية داخل التطبيق وليست دفعاً نقدياً.',
      uiTakasTitle: 'مبادلة الكوين',
      uiTakasSubtitle: 'تحويل بين الحسابات',
      uiKycTitle: 'توثيق الهوية',
      uiHesapOzetiTitle: 'كشف الحساب',
      uiHesapOzetiSubtitle: 'PDF / Excel',
      uiCoinInfo:
        'الكوينات عناصر افتراضية داخل تاموسو وليست مدفوعات نقدية خارج التطبيق.',
      uiPurchaseLocked: 'الشراء غير متاح مؤقتاً.',
      uiSummaryTitle: 'ملخص',
      uiHeroNote:
        'رصيد محفظتك لإدارة المحتوى والهدايا ونشاط المنصة.',
    },
    bildirimler: {
      azOnce: 'الآن',
      dkOnce: 'منذ {{n}} د',
      saOnce: 'منذ {{n}} س',
    },
    fikirler: {
      gorselYuklenemedi: 'تعذّر رفع الصورة',
    },
    islemHacmi: {
      kademeBulunamadi: 'المستوى غير موجود',
    },
    lobi: {
      formBaslik: 'تسجيل الدخول',
      ambientCafeIkili: 'حديث مقهى',
      ambientCafeSohbet: 'أصدقاء يتحدثون',
      ambientCafeGulme: 'أجواء حيوية',
    },
  },
};

function quoteTs(v) {
  if (String(v).includes('\n') || String(v).includes('`')) {
    return '`' + String(v).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$') + '`';
  }
  return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function injectTs(filePath, localeKeys) {
  let src = fs.readFileSync(filePath, 'utf8');
  for (const [ns, entries] of Object.entries(localeKeys)) {
    const marker = `\n  ${ns}: {`;
    const start = src.indexOf(marker);
    if (start < 0) {
      let insertAt = src.lastIndexOf('\n} as const');
      if (insertAt < 0) insertAt = src.lastIndexOf('\n};');
      if (insertAt < 0) throw new Error('no object end in ' + filePath);
      const lines = Object.entries(entries)
        .map(([k, v]) => `    ${k}: ${quoteTs(v)},`)
        .join('\n');
      src =
        src.slice(0, insertAt) +
        `\n  ${ns}: {\n${lines}\n  },` +
        src.slice(insertAt);
      continue;
    }
    let i = start + marker.length;
    let depth = 1;
    let inStr = null;
    let esc = false;
    let closeAt = -1;
    for (; i < src.length; i++) {
      const c = src[i];
      if (inStr) {
        if (esc) {
          esc = false;
          continue;
        }
        if (c === '\\') {
          esc = true;
          continue;
        }
        if (c === inStr) inStr = null;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') {
        inStr = c;
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          closeAt = i;
          break;
        }
      }
    }
    if (closeAt < 0) throw new Error('no close for ' + ns);
    const block = src.slice(start, closeAt);
    const toAdd = Object.entries(entries).filter(
      ([k]) => !new RegExp(`\\n    ${k}:`).test(block),
    );
    if (toAdd.length === 0) continue;
    const addLines =
      '\n' + toAdd.map(([k, v]) => `    ${k}: ${quoteTs(v)},`).join('\n');
    src = src.slice(0, closeAt) + addLines + '\n  ' + src.slice(closeAt);
  }
  fs.writeFileSync(filePath, src);
  console.log('updated', filePath);
}

function injectAr(filePath, localeKeys) {
  const ar = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const [ns, entries] of Object.entries(localeKeys)) {
    if (!ar[ns]) ar[ns] = {};
    for (const [k, v] of Object.entries(entries)) {
      if (ar[ns][k] === undefined) ar[ns][k] = v;
    }
  }
  fs.writeFileSync(filePath, JSON.stringify(ar, null, 2) + '\n');
  console.log('updated', filePath);
}

injectTs('src/i18n/locales/tr.ts', KEYS.tr);
injectTs('src/i18n/locales/en.ts', KEYS.en);
injectTs('src/i18n/locales/es.ts', KEYS.es);
injectAr('src/i18n/locales/ar.json', KEYS.ar);
console.log('done');
