import { DusukCihazAnimasyonSiniri } from '../../performans/DusukCihazModuAktifMi';
import { KillSwitchAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';

/** Sol combo balonu ekranda kalma süresi */
export const HEDIYE_COMBO_GORUNME_MS = 4500;

/** Aynı hediye+gönderen bu sürede birleşir (TikTok combo penceresi) */
export const HEDIYE_COMBO_BIRLESTIR_MS = 3200;

export type HediyeAnimasyonIslemi = {
  id: string;
  giftId: string;
  emoji: string;
  name: string;
  senderName?: string | null;
  /** Ses odasında hediyenin gittiği konuk veya oda sahibi */
  receiverName?: string | null;
  /** Sırada kayan alıcı avatarları */
  alicilar?: { ad: string; avatarUrl?: string | null }[];
  animationUrl?: string | null;
  animationType?: string | null;
  durationMs: number;
  fullScreen: boolean;
  soundUrl?: string | null;
  coinCost?: number;
  quantity?: number;
  /** giftId+gönderen — combo birleşimi */
  comboKey?: string;
  /** Her birleşmede artar — UI ×patlatma tetikler */
  comboTick?: number;
};

type Dinleyici = (
  aktif: HediyeAnimasyonIslemi | null,
  kuyrukBoyu: number,
  sonBes: HediyeAnimasyonIslemi[],
) => void;

function comboAnahtar(giftId: string, senderName?: string | null): string {
  return `${giftId}::${(senderName ?? '').trim().toLowerCase()}`;
}

function temizIsim(name: string): string {
  return name.replace(/\s*[x×]\s*\d+\s*$/i, '').trim() || name;
}

/**
 * Gift animasyon kuyrugu — LiveKit / mic / chat UI thread'ini bloklamaz.
 * Aynı hediye üst üste / adetli → sol combo birleşir, ×patlar.
 */
class HediyeAnimasyonuKuyruguImpl {
  private kuyruk: HediyeAnimasyonIslemi[] = [];
  private aktif: HediyeAnimasyonIslemi | null = null;
  private sonBes: HediyeAnimasyonIslemi[] = [];
  private sonBesZamanlayicilar = new Map<string, ReturnType<typeof setTimeout>>();
  private comboSonDokunus = new Map<string, number>();
  private calisiyor = false;
  private dinleyiciler = new Set<Dinleyici>();

  dinle(fn: Dinleyici) {
    this.dinleyiciler.add(fn);
    fn(this.aktif, this.kuyruk.length, this.sonBes);
    return () => {
      this.dinleyiciler.delete(fn);
    };
  }

  kuyrukBoyu() {
    return this.kuyruk.length;
  }

  aktifVarMi() {
    return this.aktif != null;
  }

  private yayinla() {
    this.dinleyiciler.forEach((fn) =>
      fn(this.aktif, this.kuyruk.length, this.sonBes),
    );
  }

  private comboZamanlayiciIptal(id: string) {
    const t = this.sonBesZamanlayicilar.get(id);
    if (t != null) {
      clearTimeout(t);
      this.sonBesZamanlayicilar.delete(id);
    }
  }

  private comboBalonuPlanla(item: HediyeAnimasyonIslemi) {
    this.comboZamanlayiciIptal(item.id);
    const timer = setTimeout(() => {
      this.sonBesZamanlayicilar.delete(item.id);
      const onceki = this.sonBes.length;
      this.sonBes = this.sonBes.filter((x) => x.id !== item.id);
      if (item.comboKey) this.comboSonDokunus.delete(item.comboKey);
      if (this.sonBes.length !== onceki) {
        this.yayinla();
      }
    }, HEDIYE_COMBO_GORUNME_MS);
    this.sonBesZamanlayicilar.set(item.id, timer);
  }

  private adetBirlesirMi(comboKey: string): boolean {
    const son = this.comboSonDokunus.get(comboKey);
    if (son == null) return false;
    return Date.now() - son < HEDIYE_COMBO_BIRLESTIR_MS;
  }

  /**
   * Mevcut combo satırına adet ekle; true = birleşti (yeni merkez kuyruk gerekebilir).
   */
  private comboBirlesir(
    comboKey: string,
    ekstraAdet: number,
    isim: string,
  ): HediyeAnimasyonIslemi | null {
    if (!this.adetBirlesirMi(comboKey)) return null;
    const mevcut = this.sonBes.find((x) => x.comboKey === comboKey);
    if (!mevcut) return null;

    mevcut.quantity = (mevcut.quantity ?? 1) + ekstraAdet;
    mevcut.comboTick = (mevcut.comboTick ?? 0) + 1;
    mevcut.name = temizIsim(isim || mevcut.name);
    const q = mevcut.quantity;
    mevcut.fullScreen =
      mevcut.fullScreen || q >= 77 || (mevcut.coinCost ?? 0) * q >= 999;

    // Yeni referans — React combo patlamasını kaçırmasın
    const guncel: HediyeAnimasyonIslemi = { ...mevcut };
    this.sonBes = [
      guncel,
      ...this.sonBes.filter((x) => x.id !== mevcut.id),
    ].slice(0, 5);
    this.comboSonDokunus.set(comboKey, Date.now());
    this.comboBalonuPlanla(guncel);

    // Aktif merkez aynı combo ise anında güncelle
    if (this.aktif?.comboKey === comboKey) {
      this.aktif = {
        ...this.aktif,
        quantity: guncel.quantity,
        comboTick: guncel.comboTick,
        name: guncel.name,
        fullScreen: guncel.fullScreen,
      };
    }

    // Kuyruktaki aynı combo'yu da birleştir (çift uçuş olmasın)
    const ki = this.kuyruk.findIndex((x) => x.comboKey === comboKey);
    if (ki >= 0) {
      const k = this.kuyruk[ki]!;
      this.kuyruk[ki] = {
        ...k,
        quantity: guncel.quantity,
        comboTick: guncel.comboTick,
        name: guncel.name,
        fullScreen: guncel.fullScreen,
        durationMs: Math.min(k.durationMs, 1100),
      };
    }

    this.yayinla();
    return guncel;
  }

  ekle(islem: Omit<HediyeAnimasyonIslemi, 'id'> & { id?: string }) {
    if (KillSwitchAktifMi('kill_heavy_animations')) {
      return;
    }
    const sinir = DusukCihazAnimasyonSiniri();
    const adet = Math.max(1, islem.quantity ?? 1);
    const isim = temizIsim(islem.name);
    const comboKey =
      islem.comboKey ??
      comboAnahtar(
        islem.giftId,
        `${islem.senderName ?? ''}|${islem.receiverName ?? ''}`,
      );

    // TikTok: pencere içinde aynı hediye → sol ×patlat, ayrı balon yok
    const birlesen = this.comboBirlesir(comboKey, adet, isim);
    if (birlesen) {
      // Merkezde kısa bir “hit” yoksa ve kuyruk boş/uygunsa mini uçuş ekle
      const merkezAyni = this.aktif?.comboKey === comboKey;
      const kuyruktaVar = this.kuyruk.some((x) => x.comboKey === comboKey);
      if (!merkezAyni && !kuyruktaVar && this.kuyruk.length < sinir.maxKuyruk) {
        const mini: HediyeAnimasyonIslemi = {
          ...birlesen,
          id: `combo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          durationMs: Math.min(1000, sinir.maxDurationMs),
          quantity: birlesen.quantity,
          comboTick: birlesen.comboTick,
          comboKey,
          name: isim,
        };
        this.kuyruk.push(mini);
        void this.calistir();
      }
      return;
    }

    if (this.kuyruk.length >= sinir.maxKuyruk) {
      return;
    }

    const fullScreen = sinir.fullScreenIzinli
      ? !!(islem.fullScreen || adet >= 77)
      : false;
    const item: HediyeAnimasyonIslemi = {
      ...islem,
      id:
        islem.id ??
        `anim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: isim,
      quantity: adet,
      comboKey,
      comboTick: 1,
      durationMs: Math.min(
        islem.durationMs || (adet >= 77 ? 3200 : adet > 1 ? 2800 : 2500),
        sinir.maxDurationMs,
      ),
      fullScreen,
    };

    this.kuyruk.push(item);
    this.comboSonDokunus.set(comboKey, Date.now());

    const oncekiIds = new Set(this.sonBes.map((x) => x.id));
    this.sonBes = [item, ...this.sonBes.filter((x) => x.comboKey !== comboKey)].slice(
      0,
      5,
    );
    for (const id of oncekiIds) {
      if (!this.sonBes.some((x) => x.id === id)) {
        this.comboZamanlayiciIptal(id);
      }
    }
    this.comboBalonuPlanla(item);
    this.yayinla();
    void this.calistir();
  }

  private async calistir() {
    if (this.calisiyor) return;
    this.calisiyor = true;
    while (this.kuyruk.length > 0) {
      this.aktif = this.kuyruk.shift() ?? null;
      this.yayinla();
      const sinir = DusukCihazAnimasyonSiniri();
      const ms = Math.min(this.aktif?.durationMs ?? 2200, sinir.maxDurationMs);
      await new Promise((r) => setTimeout(r, ms));
      this.aktif = null;
      this.yayinla();
    }
    this.calisiyor = false;
  }

  temizle() {
    this.kuyruk = [];
    this.aktif = null;
    this.sonBes = [];
    this.comboSonDokunus.clear();
    for (const t of this.sonBesZamanlayicilar.values()) {
      clearTimeout(t);
    }
    this.sonBesZamanlayicilar.clear();
    this.yayinla();
  }
}

export const HediyeAnimasyonuKuyrugu = new HediyeAnimasyonuKuyruguImpl();
