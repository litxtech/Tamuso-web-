/**
 * Dinamik kullanıcı ünvanları — public API.
 * Admin ekranları / route'lar bu modüle bağlıdır; RBAC buradan gelmez.
 */

export type {
  TitlePresentationModel,
  UnvanDesign,
  UnvanKatalogKaydi,
  UnvanKayit,
  UnvanAtama,
  UnvanAdminKaydetGirdi,
  UnvanAtaGirdi,
  UnvanShape,
  UnvanBgType,
  UnvanAnimation,
  UnvanSize,
  UnvanIconType,
  UnvanGlow,
} from './tipler';

export {
  UNVAN_SHAPES,
  UNVAN_BG_TYPES,
  UNVAN_ANIMATIONS,
  UNVAN_SIZES,
  UNVAN_ICON_TYPES,
  UNVAN_GLOW,
} from './tipler';

export {
  UnvanTasarimZod,
  UnvanTasariminiDogrula,
  UNVAN_TASARIM_VARSAYILAN,
} from './dogrulama/UnvanTasarimZod';

export {
  UNVAN_IKON_KUTUPHANESI,
  UNVAN_IKON_LISTESI,
  UnvanIkonIonAdi,
} from './sabitlemeler/UnvanIkonKutuphanesi';

export { UNVAN_PRESETLERI, UnvanPresetAl } from './sabitlemeler/UnvanPresetleri';

export { UnvanKatalogCache } from './onbellek/UnvanKatalogCache';

export {
  UnvanKatalogunuYukle,
  UnvanKatalogSurumunuYukle,
} from './okuma/UnvanKatalogunuYukle';

export {
  UnvanSunumunuCoz,
  UnvanSunumunuKayittanCoz,
  UnvanSunumunuHamdanCoz,
  UnvanKayittanSunum,
} from './okuma/UnvanSunumunuCoz';

export {
  UnvanBenimkileriGetir,
  UnvanSec,
  UnvanGizle,
  UnvanBatchGorunen,
} from './islemler/UnvanKullaniciIslemleri';

export {
  AdminUnvanKaydet,
  AdminUnvanArsivle,
  AdminUnvanKopyala,
  AdminUnvanlariListele,
  AdminUnvanListele,
  AdminUnvanDetay,
  AdminUnvanAta,
  AdminUnvanTopluAta,
  AdminUnvanGeriAl,
  AdminUnvanAtananlar,
  AdminKullaniciUnvanlari,
} from './islemler/UnvanAdminIslemleri';

export { useUnvanKatalog } from './kancalar/useUnvanKatalog';
export { useKullaniciUnvanlari } from './kancalar/useKullaniciUnvanlari';

export { UserTitleBadge } from './bilesenler/UserTitleBadge';
export { UserIdentityRow } from './bilesenler/UserIdentityRow';

export {
  UnvanKontrastUyari,
  UnvanKontrastOrani,
  UnvanGoreliParlaklik,
  UnvanDusukKontrastMi,
} from './kontrast/UnvanKontrastUyari';
