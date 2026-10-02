/**
 * Inject leftover i18n keys into tr/en/es/ar.
 * Run: node scripts/_i18n_wire_leftovers_keys.mjs
 */
import fs from 'fs';

const KEYS = {
  tr: {
    ajans: {
      davetlerAlt: 'Kod · QR · analitika',
      yeniDavet: 'Yeni davet',
      phEtiketOpsiyonel: 'Etiket (opsiyonel)',
      phMaxKullanim: 'Max kullanım (boş=sınırsız, 1=tek)',
      davetOlustur: 'Davet Oluştur',
      alertDavet: 'Davet',
      alertKod: 'Kod',
      davetPaylasMetin: 'Tamuso ajans davet kodu: {{kod}}',
      qrTurleriHint:
        'QR türleri: AJANS PROFİLİ / BAŞVUR / ETKİNLİK — deep link mevcut navigasyon ile açılır.',
      aktifDavetler: 'Aktif davetler',
      davetAnalitik: 'Davet analitiği',
      toplamOlay: 'Toplam olay: {{n}}',
      tiplerJson: 'Tipler: {{json}}',
      kaynakJson: 'Kaynak: {{json}}',
      duyurularBaslik: 'Duyurular',
      duyurularAltAjans: 'Üyelere duyuru · push',
      yeniDuyuru: 'Yeni duyuru',
      phMesaj: 'Mesaj',
      pushGonderLimit: 'Push gönder (günlük limit 10)',
      alertDuyuruAjans: 'Duyuru',
      okundu: 'Okundu',
      okunmadiDurum: 'Okunmadı',
      rayEkip: 'Ekip',
      rayGorev: 'Görev',
      rayIslem: 'İşlem',
      rayGuvenlik: 'Güvenlik',
      rayDestek: 'Destek',
    },
    cuzdan: {
      numaraHazirlaniyor: 'Numara hazırlanıyor…',
      qrIpucu:
        'Kamerayla okut · transfer için alıcı adının yalnızca baş harfleri görünür',
      qrOku: 'Oku',
      qrKoduA11y: 'Cüzdan QR kodu',
      ajansPaketBaslangic: 'Başlangıç',
      ajansPaketStandart: 'Standart',
      ajansPaketPopuler: 'Popüler',
      ajansPaketPrestij: 'Prestij',
      ajansPaketVip: 'VIP',
      ajansPaketElite: 'Elite',
      ajansPaketMax: 'Max',
      ajansPaketMesaj:
        'Merhaba, {{title}} paketini almak istiyorum.\n{{coins}} coin · liste {{liste}} ₺ · %{{pct}} ajans indirimi ile {{ode}} ₺.\nOran: 1 coin = {{oran}} ₺',
      stripeKapali: "Stripe kapalı (stripe_enabled). iOS'ta IAP kullan.",
    },
    fikirler: {
      islemBasarisiz: 'İşlem başarısız',
      olusturulamadi: 'Fikir oluşturulamadı',
    },
    siralamalar: {
      hostOdasi: '{{host}} odası',
      odaHarcamasi: 'Oda harcaması',
    },
    auth: {
      hesapBaglandiProfilHata:
        'Hesap bağlandı ama profil güncellenemedi: {{hata}}',
    },
    odaKapasite: {
      mini: 'Mini',
      miniAlt: 'Samimi oda',
      social: 'Sosyal',
      socialAlt: 'Günlük sohbet',
      community: 'Topluluk',
      communityAlt: 'Topluluk sahnesi',
      stage: 'Sahne',
      stageAlt: 'Büyük sahne',
      event: 'Etkinlik',
      eventAlt: 'Etkinlik boyutu',
    },
    odaSohbet: {
      mesajBos: 'Mesaj boş olamaz.',
      mesajCokUzun: 'Mesaj çok uzun.',
    },
    sesOda: {
      baglantiIptalEdildi: 'Bağlantı iptal edildi',
    },
  },
  en: {
    ajans: {
      davetlerAlt: 'Code · QR · analytics',
      yeniDavet: 'New invite',
      phEtiketOpsiyonel: 'Label (optional)',
      phMaxKullanim: 'Max uses (empty=unlimited, 1=single)',
      davetOlustur: 'Create invite',
      alertDavet: 'Invite',
      alertKod: 'Code',
      davetPaylasMetin: 'Tamuso agency invite code: {{kod}}',
      qrTurleriHint:
        'QR types: AGENCY PROFILE / APPLY / EVENT — deep links open with current navigation.',
      aktifDavetler: 'Active invites',
      davetAnalitik: 'Invite analytics',
      toplamOlay: 'Total events: {{n}}',
      tiplerJson: 'Types: {{json}}',
      kaynakJson: 'Sources: {{json}}',
      duyurularBaslik: 'Announcements',
      duyurularAltAjans: 'Announce to members · push',
      yeniDuyuru: 'New announcement',
      phMesaj: 'Message',
      pushGonderLimit: 'Send push (daily limit 10)',
      alertDuyuruAjans: 'Announcement',
      okundu: 'Read',
      okunmadiDurum: 'Unread',
      rayEkip: 'Team',
      rayGorev: 'Quest',
      rayIslem: 'Tx',
      rayGuvenlik: 'Security',
      rayDestek: 'Support',
    },
    cuzdan: {
      numaraHazirlaniyor: 'Preparing number…',
      qrIpucu:
        "Scan with camera · only the recipient's initials are shown for transfers",
      qrOku: 'Scan',
      qrKoduA11y: 'Wallet QR code',
      ajansPaketBaslangic: 'Starter',
      ajansPaketStandart: 'Standard',
      ajansPaketPopuler: 'Popular',
      ajansPaketPrestij: 'Prestige',
      ajansPaketVip: 'VIP',
      ajansPaketElite: 'Elite',
      ajansPaketMax: 'Max',
      ajansPaketMesaj:
        'Hi, I want the {{title}} pack.\n{{coins}} coins · list {{liste}} ₺ · {{ode}} ₺ with {{pct}}% agency discount.\nRate: 1 coin = {{oran}} ₺',
      stripeKapali: 'Stripe is off (stripe_enabled). Use IAP on iOS.',
    },
    fikirler: {
      islemBasarisiz: 'Action failed',
      olusturulamadi: 'Could not create idea',
    },
    siralamalar: {
      hostOdasi: "{{host}}'s room",
      odaHarcamasi: 'Room spend',
    },
    auth: {
      hesapBaglandiProfilHata:
        'Account linked but profile could not be updated: {{hata}}',
    },
    odaKapasite: {
      mini: 'Mini',
      miniAlt: 'Intimate room',
      social: 'Social',
      socialAlt: 'Everyday chat',
      community: 'Community',
      communityAlt: 'Community stage',
      stage: 'Stage',
      stageAlt: 'Large stage',
      event: 'Event',
      eventAlt: 'Event size',
    },
    odaSohbet: {
      mesajBos: 'Message cannot be empty.',
      mesajCokUzun: 'Message is too long.',
    },
    sesOda: {
      baglantiIptalEdildi: 'Connection cancelled',
    },
  },
  es: {
    ajans: {
      davetlerAlt: 'Código · QR · analítica',
      yeniDavet: 'Nueva invitación',
      phEtiketOpsiyonel: 'Etiqueta (opcional)',
      phMaxKullanim: 'Usos máx. (vacío=ilimitado, 1=único)',
      davetOlustur: 'Crear invitación',
      alertDavet: 'Invitación',
      alertKod: 'Código',
      davetPaylasMetin: 'Código de invitación Tamuso: {{kod}}',
      qrTurleriHint:
        'Tipos QR: PERFIL AGENCIA / SOLICITAR / EVENTO — los deep links abren con la navegación actual.',
      aktifDavetler: 'Invitaciones activas',
      davetAnalitik: 'Analítica de invitaciones',
      toplamOlay: 'Eventos totales: {{n}}',
      tiplerJson: 'Tipos: {{json}}',
      kaynakJson: 'Fuentes: {{json}}',
      duyurularBaslik: 'Anuncios',
      duyurularAltAjans: 'Anunciar a miembros · push',
      yeniDuyuru: 'Nuevo anuncio',
      phMesaj: 'Mensaje',
      pushGonderLimit: 'Enviar push (límite diario 10)',
      alertDuyuruAjans: 'Anuncio',
      okundu: 'Leído',
      okunmadiDurum: 'No leído',
      rayEkip: 'Equipo',
      rayGorev: 'Misión',
      rayIslem: 'Op.',
      rayGuvenlik: 'Seguridad',
      rayDestek: 'Soporte',
    },
    cuzdan: {
      numaraHazirlaniyor: 'Preparando número…',
      qrIpucu:
        'Escanea con la cámara · solo se muestran las iniciales del destinatario en transferencias',
      qrOku: 'Escanear',
      qrKoduA11y: 'Código QR de billetera',
      ajansPaketBaslangic: 'Inicio',
      ajansPaketStandart: 'Estándar',
      ajansPaketPopuler: 'Popular',
      ajansPaketPrestij: 'Prestigio',
      ajansPaketVip: 'VIP',
      ajansPaketElite: 'Elite',
      ajansPaketMax: 'Max',
      ajansPaketMesaj:
        'Hola, quiero el paquete {{title}}.\n{{coins}} monedas · lista {{liste}} ₺ · {{ode}} ₺ con {{pct}}% de descuento de agencia.\nTasa: 1 moneda = {{oran}} ₺',
      stripeKapali: 'Stripe está apagado (stripe_enabled). Usa IAP en iOS.',
    },
    fikirler: {
      islemBasarisiz: 'Acción fallida',
      olusturulamadi: 'No se pudo crear la idea',
    },
    siralamalar: {
      hostOdasi: 'Sala de {{host}}',
      odaHarcamasi: 'Gasto de sala',
    },
    auth: {
      hesapBaglandiProfilHata:
        'Cuenta vinculada pero no se pudo actualizar el perfil: {{hata}}',
    },
    odaKapasite: {
      mini: 'Mini',
      miniAlt: 'Sala íntima',
      social: 'Social',
      socialAlt: 'Chat diario',
      community: 'Comunidad',
      communityAlt: 'Escenario comunitario',
      stage: 'Escenario',
      stageAlt: 'Gran escenario',
      event: 'Evento',
      eventAlt: 'Tamaño de evento',
    },
    odaSohbet: {
      mesajBos: 'El mensaje no puede estar vacío.',
      mesajCokUzun: 'El mensaje es demasiado largo.',
    },
    sesOda: {
      baglantiIptalEdildi: 'Conexión cancelada',
    },
  },
  ar: {
    ajans: {
      davetlerAlt: 'رمز · QR · تحليلات',
      yeniDavet: 'دعوة جديدة',
      phEtiketOpsiyonel: 'وسم (اختياري)',
      phMaxKullanim: 'أقصى استخدام (فارغ=غير محدود، 1=مرة)',
      davetOlustur: 'إنشاء دعوة',
      alertDavet: 'دعوة',
      alertKod: 'رمز',
      davetPaylasMetin: 'رمز دعوة وكالة تاموسو: {{kod}}',
      qrTurleriHint:
        'أنواع QR: ملف الوكالة / تقديم / فعالية — الروابط تفتح بالتنقل الحالي.',
      aktifDavetler: 'الدعوات النشطة',
      davetAnalitik: 'تحليلات الدعوات',
      toplamOlay: 'إجمالي الأحداث: {{n}}',
      tiplerJson: 'الأنواع: {{json}}',
      kaynakJson: 'المصادر: {{json}}',
      duyurularBaslik: 'الإعلانات',
      duyurularAltAjans: 'إعلان للأعضاء · دفع',
      yeniDuyuru: 'إعلان جديد',
      phMesaj: 'رسالة',
      pushGonderLimit: 'إرسال إشعار (حد يومي 10)',
      alertDuyuruAjans: 'إعلان',
      okundu: 'مقروء',
      okunmadiDurum: 'غير مقروء',
      rayEkip: 'فريق',
      rayGorev: 'مهمة',
      rayIslem: 'عملية',
      rayGuvenlik: 'أمان',
      rayDestek: 'دعم',
    },
    cuzdan: {
      numaraHazirlaniyor: 'جارٍ تجهيز الرقم…',
      qrIpucu:
        'امسح بالكاميرا · تظهر فقط الأحرف الأولى لاسم المستلم في التحويل',
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
    },
    fikirler: {
      islemBasarisiz: 'فشلت العملية',
      olusturulamadi: 'تعذّر إنشاء الفكرة',
    },
    siralamalar: {
      hostOdasi: 'غرفة {{host}}',
      odaHarcamasi: 'إنفاق الغرفة',
    },
    auth: {
      hesapBaglandiProfilHata:
        'تم ربط الحساب لكن تعذّر تحديث الملف: {{hata}}',
    },
    odaKapasite: {
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
    },
    odaSohbet: {
      mesajBos: 'لا يمكن أن تكون الرسالة فارغة.',
      mesajCokUzun: 'الرسالة طويلة جداً.',
    },
    sesOda: {
      baglantiIptalEdildi: 'أُلغي الاتصال',
    },
  },
};

function quoteTs(v) {
  return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function injectTs(filePath, localeKeys) {
  let src = fs.readFileSync(filePath, 'utf8');
  for (const [ns, entries] of Object.entries(localeKeys)) {
    const marker = `\n  ${ns}: {`;
    const start = src.indexOf(marker);
    if (start < 0) {
      const insertAt = src.lastIndexOf('\n} as const');
      if (insertAt < 0) throw new Error('no as const in ' + filePath);
      const lines = Object.entries(entries)
        .map(([k, v]) => `    ${k}: ${quoteTs(v)},`)
        .join('\n');
      src = src.slice(0, insertAt) + `\n  ${ns}: {\n${lines}\n  },` + src.slice(insertAt);
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
      '\n' +
      toAdd.map(([k, v]) => `    ${k}: ${quoteTs(v)},`).join('\n');
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
