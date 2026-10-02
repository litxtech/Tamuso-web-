import type { Gift } from '../../../types/models';
import type { CoinPackage } from '../../../types/models';

/** useCoinYuklePaneli dönüş şekli — hook import etmeden tip paylaşımı */
export type CoinYuklePaneliDurumu = {
  acik: boolean;
  ac: () => void;
  kapat: () => void;
  packages: CoinPackage[];
  purchaseLocked: boolean;
  satinAl: (pkg: CoinPackage) => void;
  paketleriYenile?: () => void;
  upgradeAcik: boolean;
  upgradeKapat: () => void;
  upgradeAc: () => void;
  isGuest: boolean;
};

export type HediyePkAlici = {
  id: string;
  ad: string;
  liveSessionId?: string | null;
  side?: 'a' | 'b';
  /** Ses odası: sahip tahtı, konuk mikrofon koltuğu */
  rol?: 'sahip' | 'konuk';
  avatarUrl?: string | null;
};

/** HediyeMagazaBaglamasi props — hook döngüsünü önlemek için ayrı tip dosyası */
export type HediyeMagazaDurumu = {
  acik: boolean;
  ac: (opts: {
    receiverId: string;
    aliciAdi?: string | null;
    roomId?: string | null;
    statusId?: string | null;
    liveSessionId?: string | null;
    /** PK sırasında birden fazla yayıncı — seçilen alır */
    pkAlicilar?: HediyePkAlici[];
    animasyon?: boolean;
    onBasarili?: (gift: Gift, adet: number) => void;
  }) => void;
  kapat: () => void;
  gonder: (gift: Gift, quantity?: number) => void;
  /** RPC sürerken UI kilidi */
  gonderiyor?: boolean;
  gifts: Gift[];
  coins: number | undefined;
  aliciAdi: string | null | undefined;
  pkAlicilar: HediyePkAlici[] | undefined;
  seciliPkAliciId: string | null | undefined;
  setSeciliPkAliciId: (id: string) => void;
  coinYukle: () => void;
  coinYuklePaneli: CoinYuklePaneliDurumu;
  upgradeAcik: boolean;
  upgradeKapat: () => void;
  upgradeAc: () => void;
  isGuest: boolean;
};
