import type { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';

export type AdminModul = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  alt: string;
  href: string;
  tint: string;
  bolum: string;
  /** Arama için ek anahtar kelimeler */
  anahtarlar?: string[];
};

/** Admin hub + arama katalogu (tek kaynak) */
export const ADMIN_MODULLER: AdminModul[] = [
  {
    icon: 'people-outline',
    label: 'Kullanıcılar',
    alt: 'Dosya · ban · ihtar · harcama',
    href: '/admin/kullanicilar',
    tint: RenkTokenlari.accent,
    bolum: 'İnsanlar',
    anahtarlar: ['user', 'ban', 'ihtar', 'profil', 'hesap'],
  },
  {
    icon: 'book-outline',
    label: 'Rehber',
    alt: 'Telefon · e-posta · WhatsApp · mail',
    href: '/admin/rehber',
    tint: RenkTokenlari.mint,
    bolum: 'İnsanlar',
    anahtarlar: ['telefon', 'email', 'whatsapp', 'iletişim'],
  },
  {
    icon: 'wallet-outline',
    label: 'Finans',
    alt: 'Yükleme · çekim · en çok harcayan',
    href: '/admin/finans',
    tint: RenkTokenlari.primarySoft,
    bolum: 'İnsanlar',
    anahtarlar: ['para', 'çekim', 'yükleme', 'harcama'],
  },
  {
    icon: 'id-card-outline',
    label: 'Kimlik onayı',
    alt: 'KYC · belge · canlılık · onay/red',
    href: '/admin/kyc',
    tint: RenkTokenlari.mint,
    bolum: 'İnsanlar',
    anahtarlar: ['kyc', 'kimlik', 'belge', 'doğrulama'],
  },
  {
    icon: 'shield-checkmark-outline',
    label: 'Doğrulama Merkezi',
    alt: 'Ajans KYC/KYB · kullanıcı · inceleme kuyruğu',
    href: '/admin/dogrulama',
    tint: RenkTokenlari.violet,
    bolum: 'Güvenlik',
    anahtarlar: ['kyb', 'verification', 'inceleme'],
  },
  {
    icon: 'swap-horizontal-outline',
    label: 'Coin takas',
    alt: 'Takas · transfer · aylık limit · onay',
    href: '/admin/takas',
    tint: RenkTokenlari.accent,
    bolum: 'İnsanlar',
    anahtarlar: ['takas', 'transfer', 'exchange'],
  },
  {
    icon: 'add-circle-outline',
    label: 'Coin yükle',
    alt: 'İsim yaz · avatar · yükle',
    href: '/admin/coin',
    tint: RenkTokenlari.accent,
    bolum: 'İnsanlar',
    anahtarlar: ['topup', 'yukle', 'bakiye'],
  },
  {
    icon: 'pricetags-outline',
    label: 'Coin paketleri',
    alt: 'Product ID · coin · bonus · kampanya',
    href: '/admin/coin-paketleri',
    tint: RenkTokenlari.primarySoft,
    bolum: 'İnsanlar',
    anahtarlar: ['iap', 'paket', 'store', 'ürün'],
  },
  {
    icon: 'business-outline',
    label: 'Ajans paketleri',
    alt: 'Liste fiyatı · coin · indirim %',
    href: '/admin/ajans-paketleri',
    tint: RenkTokenlari.accent,
    bolum: 'İnsanlar',
    anahtarlar: ['ajans paket', 'liste fiyat'],
  },
  {
    icon: 'alert-circle-outline',
    label: 'Satın alma itirazları',
    alt: 'Paket itirazı · onay / red · geri dönüş',
    href: '/admin/satin-alma-itirazlar',
    tint: RenkTokenlari.accent,
    bolum: 'İnsanlar',
    anahtarlar: ['itiraz', 'refund', 'chargeback', 'iap'],
  },
  {
    icon: 'color-palette-outline',
    label: 'Cüzdan yönetimi',
    alt: 'Simge · tema · bölüm · yayın / geri al',
    href: '/admin/cuzdan-yonetimi',
    tint: RenkTokenlari.primarySoft,
    bolum: 'İnsanlar',
    anahtarlar: ['wallet ui', 'tema', 'simge'],
  },
  {
    icon: 'cash-outline',
    label: 'Ciro',
    alt: 'Anlık · gün · hafta · ay · PDF',
    href: '/admin/ciro',
    tint: RenkTokenlari.accent,
    bolum: 'İnsanlar',
    anahtarlar: ['gelir', 'rapor', 'pdf'],
  },
  {
    icon: 'diamond-outline',
    label: 'İşlem Hacmi',
    alt: 'Aggregate · kademe · uygunluk · rebuild',
    href: '/admin/islem-hacmi',
    tint: RenkTokenlari.violet,
    bolum: 'İnsanlar',
    anahtarlar: ['volume', 'kademe', 'hacim'],
  },
  {
    icon: 'globe-outline',
    label: 'Ülke Ligi',
    alt: 'Katkı · uygunluk · ürün puan · hafta',
    href: '/admin/ulke-ligi',
    tint: RenkTokenlari.magenta,
    bolum: 'İnsanlar',
    anahtarlar: ['ülke', 'lig', 'country'],
  },
  {
    icon: 'business-outline',
    label: 'Ajanslar',
    alt: 'Operasyon · yaptırım · coin · limit',
    href: '/admin/ajanslar',
    tint: RenkTokenlari.accent,
    bolum: 'İnsanlar',
    anahtarlar: [
      'ajans',
      'agency',
      'yaptırım',
      'ceza',
      'dekont',
      'satış',
      'dondur',
      'askı',
    ],
  },
  {
    icon: 'shield-half-outline',
    label: 'Moderasyon',
    alt: 'Rapor kuyruğu · çözüm',
    href: '/admin/moderasyon',
    tint: RenkTokenlari.danger,
    bolum: 'Güvenlik',
    anahtarlar: ['rapor', 'şikayet', 'mod'],
  },
  {
    icon: 'call-outline',
    label: 'Görüşme güvenliği',
    alt: 'Kayıt / ekran görüntüsü · uyarı',
    href: '/admin/gorusme-guvenlik',
    tint: RenkTokenlari.danger,
    bolum: 'Güvenlik',
    anahtarlar: ['görüşme', 'call', 'ekran'],
  },
  {
    icon: 'shield-checkmark-outline',
    label: 'Platform güvenliği',
    alt: 'Cihaz · silinen dönüş · benzer mail',
    href: '/admin/platform-guvenlik',
    tint: RenkTokenlari.danger,
    bolum: 'Güvenlik',
    anahtarlar: ['cihaz', 'ban', 'güvenlik'],
  },
  {
    icon: 'accessibility-outline',
    label: 'Çocuk Koruma',
    alt: 'Onaylayanlar · vermeyenler · 18+',
    href: '/admin/cocuk-koruma',
    tint: RenkTokenlari.danger,
    bolum: 'Güvenlik',
    anahtarlar: ['çocuk', '18', 'consent'],
  },
  {
    icon: 'headset-outline',
    label: 'Canlı destek',
    alt: 'Toprak · oturum · temsilci ata',
    href: '/admin/destek',
    tint: RenkTokenlari.mint,
    bolum: 'Güvenlik',
    anahtarlar: ['destek', 'support', 'ticket'],
  },
  {
    icon: 'bulb-outline',
    label: 'Fikir & Öneriler',
    alt: 'Kuyruk · durum · ödül · kategori',
    href: '/admin/fikirler',
    tint: RenkTokenlari.accent,
    bolum: 'Ürün',
    anahtarlar: ['öneri', 'feedback', 'fikir'],
  },
  {
    icon: 'radio-outline',
    label: 'Canlı odalar',
    alt: 'Ses odası · yayın · kapat · yaptırım',
    href: '/admin/odalar',
    tint: RenkTokenlari.live,
    bolum: 'Güvenlik',
    anahtarlar: ['oda', 'ses', 'room', 'yayın'],
  },
  {
    icon: 'ribbon-outline',
    label: 'Ünvan Yönetimi',
    alt: 'Oluştur · tasarla · ata · geri al',
    href: '/admin/unvanlar',
    tint: RenkTokenlari.accent,
    bolum: 'Ürün',
    anahtarlar: ['ünvan', 'title', 'rozet'],
  },
  {
    icon: 'musical-notes-outline',
    label: 'Müzik Merkezi',
    alt: 'Oda BGM · yükle · yayınla · arşiv',
    href: '/admin/muzik',
    tint: RenkTokenlari.violet,
    bolum: 'Ürün',
    anahtarlar: ['bgm', 'müzik', 'ses'],
  },
  {
    icon: 'sparkles-outline',
    label: 'AI Müzik',
    alt: 'Üretim · paketler · limitler · dashboard',
    href: '/admin/ai-muzik',
    tint: RenkTokenlari.primarySoft,
    bolum: 'Ürün',
    anahtarlar: ['ai', 'yapay', 'müzik'],
  },
  {
    icon: 'people-outline',
    label: 'Kişiler & Aramalar',
    alt: 'Keşif · ücret · komisyon · algoritma',
    href: '/admin/kisiler-aramalar',
    tint: RenkTokenlari.magenta,
    bolum: 'Ürün',
    anahtarlar: ['kişi', 'arama', 'keşif'],
  },
  {
    icon: 'gift-outline',
    label: 'Ekonomi merkezi',
    alt: 'Oranlar · simülatör · paket · hediye',
    href: '/admin/ekonomi',
    tint: RenkTokenlari.violet,
    bolum: 'Ürün',
    anahtarlar: ['ekonomi', 'hediye', 'rtp', 'oran'],
  },
  {
    icon: 'pie-chart-outline',
    label: 'Komisyon oranları',
    alt: 'Hediye elması nasıl bölünür? · ajans düzenle',
    href: '/admin/komisyonlar',
    tint: RenkTokenlari.accent,
    bolum: 'Ürün',
    anahtarlar: ['komisyon', 'pay', 'elmas'],
  },
  {
    icon: 'game-controller-outline',
    label: 'Oyun yönetimi',
    alt: 'Aç/kapa · test · Kaskad RTP',
    href: '/admin/oyunlar',
    tint: RenkTokenlari.accent,
    bolum: 'Ürün',
    anahtarlar: ['oyun', 'zeus', 'kaskad', 'slot'],
  },
  {
    icon: 'flask-outline',
    label: 'Oyun test',
    alt: 'Simülasyon · RTP · spin',
    href: '/admin/oyun-test',
    tint: RenkTokenlari.violet,
    bolum: 'Ürün',
    anahtarlar: ['test', 'sim', 'rtp'],
  },
  {
    icon: 'git-branch-outline',
    label: 'Oyun algoritma',
    alt: 'Ağırlık · kademe · dağılım',
    href: '/admin/oyun-algoritma',
    tint: RenkTokenlari.magenta,
    bolum: 'Ürün',
    anahtarlar: ['algoritma', 'ağırlık'],
  },
  {
    icon: 'layers-outline',
    label: 'Kaskad yönetim',
    alt: 'RTP · animasyon · kontrol',
    href: '/admin/kaskad-yonetim',
    tint: RenkTokenlari.accent,
    bolum: 'Ürün',
    anahtarlar: ['kaskad', 'cascade'],
  },
  {
    icon: 'checkbox-outline',
    label: 'Şehir seçimleri',
    alt: '81 il · başlat · sonuç · push',
    href: '/admin/sehir-secim',
    tint: RenkTokenlari.mint,
    bolum: 'Ürün',
    anahtarlar: ['şehir', 'seçim', 'il'],
  },
  {
    icon: 'options-outline',
    label: 'Özellikler',
    alt: 'Bayrak · kill · duyuru · canlı sync',
    href: '/admin/ozellikler',
    tint: RenkTokenlari.mint,
    bolum: 'Ürün',
    anahtarlar: ['flag', 'kill', 'bayrak', 'duyuru'],
  },
  {
    icon: 'menu-outline',
    label: 'Hamburger menü',
    alt: 'Sıra · gizle · simülasyon',
    href: '/admin/hamburger-menu',
    tint: RenkTokenlari.primarySoft,
    bolum: 'Ürün',
    anahtarlar: ['menü', 'hamburger', 'drawer'],
  },
  {
    icon: 'images-outline',
    label: 'Bannerlar',
    alt: 'Kampanya · yerleştirme · CTR',
    href: '/admin/bannerlar',
    tint: RenkTokenlari.magenta,
    bolum: 'Büyüme',
    anahtarlar: ['banner', 'kampanya', 'slider'],
  },
  {
    icon: 'flash-outline',
    label: 'Otomatik bannerlar',
    alt: 'Hediye eşik · yağmur · sabitle',
    href: '/admin/bannerlar/otomatik',
    tint: RenkTokenlari.accent,
    bolum: 'Büyüme',
    anahtarlar: ['otomatik', 'eşik', 'yağmur'],
  },
  {
    icon: 'call-outline',
    label: 'Kurumsal iletişim',
    alt: 'E-posta · WhatsApp · hamburger',
    href: '/admin/iletisim',
    tint: RenkTokenlari.mint,
    bolum: 'Büyüme',
    anahtarlar: ['iletişim', 'mail', 'whatsapp'],
  },
  {
    icon: 'film-outline',
    label: 'Giriş lobisi',
    alt: 'Video · resim · logo · metin',
    href: '/admin/giris-lobisi',
    tint: RenkTokenlari.primarySoft,
    bolum: 'Büyüme',
    anahtarlar: ['lobi', 'splash', 'giriş'],
  },
  {
    icon: 'clipboard-outline',
    label: 'Kayıt alanları',
    alt: 'Zorunlu · gizli · özel alan',
    href: '/admin/kayit-alanlari',
    tint: RenkTokenlari.mint,
    bolum: 'Büyüme',
    anahtarlar: ['kayıt', 'register', 'form'],
  },
  {
    icon: 'document-text-outline',
    label: 'Politikalar',
    alt: 'Yaz · güncelle · kayıt/giriş linki',
    href: '/admin/politikalar',
    tint: RenkTokenlari.primarySoft,
    bolum: 'Büyüme',
    anahtarlar: ['kvkk', 'gizlilik', 'şart', 'policy'],
  },
  {
    icon: 'link-outline',
    label: 'Paylaşım',
    alt: 'İndirme linkleri',
    href: '/admin/paylasim-linkleri',
    tint: RenkTokenlari.primarySoft,
    bolum: 'Büyüme',
    anahtarlar: ['link', 'indir', 'store'],
  },
  {
    icon: 'notifications-outline',
    label: 'Bildirimler',
    alt: 'Push kuyruğu',
    href: '/bildirimler',
    tint: RenkTokenlari.violet,
    bolum: 'Büyüme',
    anahtarlar: ['push', 'bildirim', 'notification'],
  },
  {
    icon: 'ribbon-outline',
    label: 'Sertifikasyon',
    alt: 'Kontrol · ağ · stres testi',
    href: '/sertifikasyon',
    tint: RenkTokenlari.accent,
    bolum: 'Operasyon',
    anahtarlar: ['sertifika', 'test', 'ağ'],
  },
  {
    icon: 'grid-outline',
    label: 'Platform',
    alt: 'Etkinlik · görev · kısayollar',
    href: '/platform',
    tint: RenkTokenlari.mint,
    bolum: 'Operasyon',
    anahtarlar: ['platform', 'görev', 'etkinlik'],
  },
  {
    icon: 'lock-closed-outline',
    label: 'Güvenlik',
    alt: 'Koruma · bildir · olaylar',
    href: '/guvenlik',
    tint: RenkTokenlari.danger,
    bolum: 'Operasyon',
    anahtarlar: ['koruma', 'olay', 'güvenlik merkezi'],
  },
];

export const ADMIN_BOLUM_SIRASI = [
  'İnsanlar',
  'Güvenlik',
  'Ürün',
  'Büyüme',
  'Operasyon',
] as const;

function normalize(s: string): string {
  return String(s ?? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

export type AdminAramaSonuc = AdminModul & { skor: number };

/** Harf yazıldıkça anlık sayfa önerisi */
export function AdminModulleriAra(
  sorgu: string,
  limit = 12,
): AdminAramaSonuc[] {
  const q = normalize(sorgu);
  if (!q) return [];

  const parcalar = q.split(/\s+/).filter(Boolean);
  const sonuclar: AdminAramaSonuc[] = [];

  for (const m of ADMIN_MODULLER) {
    const havuz = normalize(
      [m.label, m.alt, m.bolum, m.href, ...(m.anahtarlar ?? [])].join(' '),
    );
    let skor = 0;
    const labelN = normalize(m.label);

    if (labelN === q) skor += 100;
    else if (labelN.startsWith(q)) skor += 80;
    else if (labelN.includes(q)) skor += 50;

    if (havuz.includes(q)) skor += 25;

    let tumParca = true;
    for (const p of parcalar) {
      if (!havuz.includes(p)) {
        tumParca = false;
        break;
      }
      skor += 8;
    }
    if (!tumParca && parcalar.length > 1) continue;

    // href path parçaları
    if (normalize(m.href).includes(q)) skor += 15;

    if (skor > 0) sonuclar.push({ ...m, skor });
  }

  return sonuclar.sort((a, b) => b.skor - a.skor || a.label.localeCompare(b.label, 'tr')).slice(0, limit);
}
