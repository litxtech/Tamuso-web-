import { AppState } from 'react-native';
import { AgBaglantisiIzleyici } from '../ag-baglantisi/AgBaglantisiIzleyici';
import { MesajOutboxBellekTemizle, MesajOutboxOturumBagla } from '../mesajlasma/depolama/MesajOutboxDepolama';
import { AgDurumMerkezi } from './AgDurumMerkezi';
import { CevrimdisiAktifKullaniciAyarla, CevrimdisiAktifKullanici } from './AktifKullanici';
import { SenkronCalistir } from './SenkronMotoru';
let agKop: (() => void) | null = null;
let appKop: { remove: () => void } | null = null;
let kurulu = false;

/**
 * Oturum açılınca tek merkez. Çıkışta bellek başka hesaba taşınmaz.
 * Disk kayıtları kullanıcı anahtarında kalır; okuyan taraf yalnız aktif kullanıcıyı görür.
 */
export async function CevrimdisiOturumBagla(userId: string | null): Promise<void> {
  const onceki = CevrimdisiAktifKullanici();
  if (onceki && onceki !== userId) {
    MesajOutboxBellekTemizle(onceki);
  }
  CevrimdisiAktifKullaniciAyarla(userId);
  MesajOutboxOturumBagla(userId);
  if (!kurulu) {
    kurulu = true;
    await AgDurumMerkezi.baslat();
    agKop = AgDurumMerkezi.dinle((g) => {
      const uid = CevrimdisiAktifKullanici();
      if (!uid) return;
      if (g.faz === 'RECONNECTING') void SenkronCalistir(uid);
    }) as unknown as () => void;
    appKop = AppState.addEventListener('change', (state) => {
      const uid = CevrimdisiAktifKullanici();
      if (state === 'active' && uid) {
        const son = AgBaglantisiIzleyici.sonDurum();
        const online = !!son?.bagli && son.internetErisilebilir !== false;
        if (online) void SenkronCalistir(uid);
      }
    });
  }
  if (userId) {
    const son = AgBaglantisiIzleyici.sonDurum();
    const online = !son || (son.bagli && son.internetErisilebilir !== false);
    if (online) void SenkronCalistir(userId);
  }
}

/**
 * Çıkış: bellek ve kullanıcıya bağlı olmayan sohbet sayfası.
 * Diskteki taslak / kuyruk / profil anlık görüntüsü `{userId}` anahtarında kalır;
 * diğer hesap bu öneki okumaz. Parola ve token yazılmaz.
 */
export async function CevrimdisiOzelTemizle(userId: string | null | undefined): Promise<void> {
  if (userId) MesajOutboxBellekTemizle(userId);
  if (CevrimdisiAktifKullanici() === userId) CevrimdisiAktifKullaniciAyarla(null);
  try {
    const { MesajSayfaOnbellekHepsiniSil } = await import(
      '../mesajlasma/depolama/MesajSayfaOnbellek'
    );
    await MesajSayfaOnbellekHepsiniSil();
  } catch {
    /* mesaj önbelleği yoksa çıkış sürer */
  }
}

export function CevrimdisiDinleyiciBirak(): void {
  agKop?.();
  agKop = null;
  appKop?.remove();
  appKop = null;
  kurulu = false;
}
