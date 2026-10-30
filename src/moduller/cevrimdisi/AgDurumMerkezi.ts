import { AgBaglantisiIzleyici } from '../ag-baglantisi/AgBaglantisiIzleyici';
import type { AgBaglantiDurumu } from '../ag-baglantisi/okuma/AgBaglantiDurumunuGetir';

export type CevrimdisiFaz = 'ONLINE' | 'OFFLINE' | 'RECONNECTING' | 'SYNCING' | 'SYNC_ERROR';

export type CevrimdisiToast = 'offline' | 'online' | 'syncing' | 'done' | 'error';

export type CevrimdisiAgGorunum = {
  faz: CevrimdisiFaz;
  agTipi: string;
  toast: CevrimdisiToast | null;
  toastNesil: number;
};

type Dinleyici = (g: CevrimdisiAgGorunum) => void;

function onlineMi(d: AgBaglantiDurumu | null): boolean {
  if (!d) return true;
  if (!d.bagli) return false;
  if (d.internetErisilebilir === false) return false;
  return true;
}

/**
 * Tek ağ dinleyicisi: AgBaglantisiIzleyici.
 * Ekranlar buraya abone olur, kendi listener'ını kurmaz.
 */
class AgDurumMerkeziImpl {
  private faz: CevrimdisiFaz = 'ONLINE';
  private agTipi = 'UNKNOWN';
  private toast: CevrimdisiToast | null = null;
  private toastNesil = 0;
  private dinleyiciler = new Set<Dinleyici>();
  private abone: (() => void) | null = null;
  private oncekiOnline: boolean | null = null;
  private basladi = false;

  gorunum(): CevrimdisiAgGorunum {
    return {
      faz: this.faz,
      agTipi: this.agTipi,
      toast: this.toast,
      toastNesil: this.toastNesil,
    };
  }

  async baslat(): Promise<void> {
    if (this.basladi) return;
    this.basladi = true;
    await AgBaglantisiIzleyici.baslat();
    this.abone = AgBaglantisiIzleyici.dinle((d) => this.agGeldi(d)) as unknown as () => void;
  }

  private agGeldi(d: AgBaglantiDurumu) {
    this.agTipi = d.tip || 'UNKNOWN';
    const online = onlineMi(d);
    if (this.oncekiOnline === false && online) {
      this.oncekiOnline = true;
      this.fazYaz('RECONNECTING', 'online');
      return;
    }
    if (this.oncekiOnline === true && !online) {
      this.oncekiOnline = false;
      this.fazYaz('OFFLINE', 'offline');
      return;
    }
    this.oncekiOnline = online;
    if (!online && this.faz !== 'OFFLINE') this.fazYaz('OFFLINE', null);
    if (online && (this.faz === 'OFFLINE' || this.faz === 'RECONNECTING')) {
      this.fazYaz('ONLINE', null);
    }
  }

  senkronBasladi() {
    if (this.faz === 'OFFLINE') return;
    this.fazYaz('SYNCING', 'syncing');
  }

  senkronBitti(hataVar: boolean) {
    if (hataVar) this.fazYaz('SYNC_ERROR', 'error');
    else this.fazYaz('ONLINE', 'done');
  }

  baglantiHazir() {
    if (this.faz === 'RECONNECTING' || this.faz === 'SYNCING') {
      this.oncekiOnline = true;
    }
  }

  dinle(fn: Dinleyici): () => void {
    this.dinleyiciler.add(fn);
    fn(this.gorunum());
    return () => this.dinleyiciler.delete(fn);
  }

  private fazYaz(faz: CevrimdisiFaz, toast: CevrimdisiToast | null) {
    this.faz = faz;
    if (toast) {
      this.toast = toast;
      this.toastNesil += 1;
    }
    const g = this.gorunum();
    for (const fn of this.dinleyiciler) {
      try {
        fn(g);
      } catch {
        /* dinleyici hatası ağı düşürmesin */
      }
    }
  }
}

export const AgDurumMerkezi = new AgDurumMerkeziImpl();

export function AgSuAnOnlineMi(): boolean {
  const faz = AgDurumMerkezi.gorunum().faz;
  return faz === 'ONLINE' || faz === 'SYNCING' || faz === 'SYNC_ERROR' || faz === 'RECONNECTING';
}
