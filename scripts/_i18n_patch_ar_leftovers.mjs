import fs from 'fs';

const ar = JSON.parse(fs.readFileSync('src/i18n/locales/ar.json', 'utf8'));

// Pull ajans keys from tr via a simple extract of the recover script block already in arAjans section of recover file
const recover = fs.readFileSync('scripts/_i18n_recover_leftovers.mjs', 'utf8');
const m = recover.match(/const arAjans = \{([\s\S]*?)\n\};/);
if (m) {
  // eval object body carefully
  const obj = Function(`return ({${m[1]}})`)();
  ar.ajans = { ...(ar.ajans || {}), ...obj };
}

Object.assign(ar.cuzdan || (ar.cuzdan = {}), {
  numaraHazirlaniyor: 'جارٍ تجهيز الرقم…',
  qrIpucu: 'امسح بالكاميرا · تظهر فقط الأحرف الأولى لاسم المستلم في التحويل',
  qrOku: 'مسح',
  qrKoduA11y: 'رمز QR للمحفظة',
  ajansPaketBaslangic: 'بداية',
  ajansPaketStandart: 'قياسي',
  ajansPaketPopuler: 'شائع',
  ajansPaketPrestij: 'مميز',
  ajansPaketVip: 'VIP',
  ajansPaketElite: 'نخبوي',
  ajansPaketMax: 'أقصى',
  ajansPaketMesaj:
    'مرحباً، أريد باقة {{title}}.\n{{coins}} عملة · قائمة {{liste}} ₺ · {{ode}} ₺ مع خصم وكالة {{pct}}٪.\nالمعدل: 1 عملة = {{oran}} ₺',
  stripeKapali: 'Stripe متوقف (stripe_enabled). استخدم IAP على iOS.',
  coinSatinAlmaKapali: 'شراء العملات مغلق (مفتاح الإيقاف).',
});

Object.assign(ar.fikirler || (ar.fikirler = {}), {
  islemBasarisiz: 'فشلت العملية',
  olusturulamadi: 'تعذّر إنشاء الفكرة',
});
Object.assign(ar.siralamalar || (ar.siralamalar = {}), {
  hostOdasi: 'غرفة {{host}}',
  odaHarcamasi: 'إنفاق الغرفة',
});
Object.assign(ar.auth || (ar.auth = {}), {
  hesapBaglandiProfilHata: 'تم ربط الحساب لكن تعذّر تحديث الملف: {{hata}}',
});
Object.assign(ar.sesOda || (ar.sesOda = {}), {
  baglantiIptalEdildi: 'أُلغي الاتصال',
});
ar.odaKapasite = {
  mini: 'مصغّر',
  miniAlt: 'غرفة حميمة',
  social: 'اجتماعي',
  socialAlt: 'دردشة يومية',
  community: 'مجتمع',
  communityAlt: 'منصة مجتمع',
  stage: 'منصة',
  stageAlt: 'منصة كبيرة',
  event: 'فعالية',
  eventAlt: 'حجم فعالية',
};
ar.odaSohbet = {
  mesajBos: 'لا يمكن أن تكون الرسالة فارغة.',
  mesajCokUzun: 'الرسالة طويلة جداً.',
};

// Sync mesajV2 from en for parity
const enSrc = fs.readFileSync('src/i18n/locales/en.ts', 'utf8');
const mv = enSrc.match(/\n  mesajV2: \{([\s\S]*?)\n  \},/);
if (mv && !ar.mesajV2?.reply) {
  const enObj = Function(`return ({${mv[1]}})`)();
  // Use English as temporary Arabic placeholders if missing — better than parity fail
  // Prefer Arabic translations for common keys
  const arMv = { ...enObj };
  const arOverride = {
    reply: 'رد',
    replyTo: 'الرد على {{ad}}',
    cancelReply: 'إلغاء الرد',
    messageUnavailable: 'الرسالة غير متاحة',
    photo: 'صورة',
    video: 'فيديو',
    voice: 'رسالة صوتية',
    music: 'موسيقى',
    edit: 'تعديل',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    send: 'إرسال',
    copy: 'نسخ',
    report: 'إبلاغ',
    pin: 'تثبيت',
    unpin: 'إلغاء التثبيت',
    play: 'تشغيل',
    pause: 'إيقاف مؤقت',
    retry: 'إعادة المحاولة',
    failed: 'فشل',
    sent: 'أُرسلت',
    delivered: 'وُصلت',
    read: 'مقروءة',
    sending: 'جارٍ الإرسال…',
    queued: 'في الانتظار',
  };
  ar.mesajV2 = { ...arMv, ...arOverride };
}

fs.writeFileSync('src/i18n/locales/ar.json', JSON.stringify(ar, null, 2) + '\n');
console.log('ar patched', !!ar.ajans?.gorevlerBaslik, !!ar.odaSohbet?.mesajBos, !!ar.mesajV2?.reply);
