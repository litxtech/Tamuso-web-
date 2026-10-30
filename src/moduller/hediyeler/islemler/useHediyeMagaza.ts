import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import i18n from '../../../i18n';
import { useAuth, useWallet } from '../../../contexts/AuthContext';
import { useMisafirIslemKapisi } from '../../misafir-hesabi/islemler/useMisafirIslemKapisi';
import { useCoinYuklePaneli } from '../../cuzdan/islemler/useCoinYuklePaneli';
import type { CoinKaynagi, Gift } from '../../../types/models';
import { HediyeKatalogunuGetir } from '../okuma/HediyeKatalogunuGetir';
import { HEDIYE_FALLBACK_50 } from '../katalog/HediyeFallback50';
import { HediyeAdiCevir } from '../katalog/HediyeAdiCevir';
import { HediyeGonder } from './HediyeGonder';
import { HediyeAnimasyonuKuyrugu } from '../animasyon/HediyeAnimasyonuKuyrugu';
import type { HediyePkAlici } from './HediyeMagazaTipleri';

type GonderBaglam = {
  receiverId: string;
  roomId?: string | null;
  statusId?: string | null;
  liveSessionId?: string | null;
  pkAlicilar?: HediyePkAlici[];
  animasyon?: boolean;
  channel?: 'message' | 'live' | null;
  onBasarili?: (gift: Gift, adet: number) => void;
};

const KAYNAK_ALANI = {
  purchased: 'coins',
  game: 'game_coins',
  bonus: 'bonus_coins',
} as const satisfies Record<CoinKaynagi, 'coins' | 'game_coins' | 'bonus_coins'>;

/**
 * Sesli oda / canlı / mesaj / profil / durum — ortak hediye mağazası.
 * Panel açık kalır; peş peşe gönderim (TikTok) — başarı Alert yok.
 * Coin yükleme hediye Modal içinde (ikinci Modal yok — iOS).
 */
export function useHediyeMagaza() {
  const { isGuest, user, profile } = useAuth();
  const { wallet, adjustWallet, refreshWallet } = useWallet();
  const { upgradeAcik, upgradeKapat, upgradeAc, islemiDene } =
    useMisafirIslemKapisi(isGuest);
  const coinYuklePaneli = useCoinYuklePaneli();
  const paketleriYenile = coinYuklePaneli.paketleriYenile;
  const [acik, setAcik] = useState(false);
  const [gonderiyor, setGonderiyor] = useState(false);
  const gonderKilit = useRef(false);
  const [gifts, setGifts] = useState<Gift[]>(HEDIYE_FALLBACK_50);
  const [coinKaynagi, setCoinKaynagi] = useState<CoinKaynagi>('purchased');
  const [hedef, setHedef] = useState<{
    receiverId: string;
    roomId?: string | null;
    statusId?: string | null;
    liveSessionId?: string | null;
    pkAlicilar?: HediyePkAlici[];
    aliciAdi?: string | null;
    animasyon?: boolean;
    channel?: 'message' | 'live' | null;
    onBasarili?: (gift: Gift, adet: number) => void;
  } | null>(null);
  const [seciliPkAliciId, setSeciliPkAliciId] = useState<string | null>(null);

  const coinBakiyeleri = useMemo<Record<CoinKaynagi, number>>(
    () => ({
      purchased: wallet?.coins ?? 0,
      game: wallet?.game_coins ?? 0,
      bonus: wallet?.bonus_coins ?? 0,
    }),
    [wallet?.coins, wallet?.game_coins, wallet?.bonus_coins],
  );

  useEffect(() => {
    void HediyeKatalogunuGetir()
      .then((rows) => {
        if (rows.length) setGifts(rows);
      })
      .catch(() => undefined);
  }, []);

  const ac = useCallback(
    (opts: {
      receiverId: string;
      aliciAdi?: string | null;
      roomId?: string | null;
      statusId?: string | null;
      liveSessionId?: string | null;
      pkAlicilar?: HediyePkAlici[];
      animasyon?: boolean;
      channel?: 'message' | 'live' | null;
      onBasarili?: (gift: Gift, adet: number) => void;
    }) => {
      const pkListe = (opts.pkAlicilar ?? []).filter(
        (a) => a.id && (!user?.id || a.id !== user.id),
      );
      const varsayilanId =
        pkListe.find((a) => a.id === opts.receiverId)?.id ??
        pkListe[0]?.id ??
        opts.receiverId;

      if (!varsayilanId) {
        Alert.alert(i18n.t('hediye.baslik'), i18n.t('hediye.aliciBulunamadi'));
        return;
      }
      if (user?.id && varsayilanId === user.id && pkListe.length === 0) {
        Alert.alert(i18n.t('hediye.baslik'), i18n.t('hediye.kendineGonderemezsin'));
        return;
      }
      islemiDene('hediye_gonder', () => {
        const secili = pkListe.find((a) => a.id === varsayilanId);
        setSeciliPkAliciId(varsayilanId);
        setCoinKaynagi('purchased');
        setHedef({
          receiverId: varsayilanId,
          roomId: opts.roomId ?? null,
          statusId: opts.statusId ?? null,
          liveSessionId: secili?.liveSessionId ?? opts.liveSessionId ?? null,
          pkAlicilar: pkListe.length > 1 ? pkListe : undefined,
          aliciAdi: secili?.ad ?? opts.aliciAdi,
          animasyon: opts.animasyon !== false,
          channel: opts.channel ?? null,
          onBasarili: opts.onBasarili,
        });
        setAcik(true);
        paketleriYenile?.();
      });
    },
    [islemiDene, user?.id, paketleriYenile],
  );

  const kapat = useCallback(() => {
    setAcik(false);
    setHedef(null);
    setSeciliPkAliciId(null);
    gonderKilit.current = false;
    setGonderiyor(false);
  }, []);

  const gonder = useCallback(
    (gift: Gift, quantity = 1) => {
      if (!hedef || gonderKilit.current) return;
      const adet = Math.max(1, quantity);
      const seciliPk =
        hedef.pkAlicilar?.find((a) => a.id === seciliPkAliciId) ??
        hedef.pkAlicilar?.[0];
      const receiverId = seciliPk?.id ?? hedef.receiverId;
      const liveSessionId =
        seciliPk?.liveSessionId ?? hedef.liveSessionId ?? null;
      const baglam: GonderBaglam = {
        ...hedef,
        receiverId,
        liveSessionId,
      };
      const kaynak = coinKaynagi;
      const maliyet = gift.coin_cost * adet;
      const bakiye = coinBakiyeleri[kaynak];

      if (user?.id && receiverId === user.id) {
        Alert.alert(i18n.t('hediye.baslik'), i18n.t('hediye.kendineGonderemezsin'));
        return;
      }

      if (maliyet > bakiye) {
        if (kaynak === 'purchased') {
          // HediyeMagazaPaneli yetmez → panel içi coin moda geçer
          paketleriYenile?.(true);
        } else {
          Alert.alert(i18n.t('hediye.yetersizCoin'), i18n.t('cuzdanY.kaynakYetersiz'));
        }
        return;
      }

      if (gift.id.startsWith('fb_')) {
        Alert.alert(i18n.t('hediye.baslik'), i18n.t('hediye.katalogYukleniyor'));
        return;
      }

      islemiDene('hediye_gonder', () => {
        if (gonderKilit.current) return;
        gonderKilit.current = true;
        setGonderiyor(true);

        void (async () => {
          try {
            if (baglam.animasyon !== false) {
              HediyeAnimasyonuKuyrugu.ekle({
                giftId: gift.id,
                emoji: gift.emoji,
                name: HediyeAdiCevir(gift.code, gift.name),
                senderName:
                  profile?.display_name ??
                  profile?.username ??
                  i18n.t('gorusme.sen'),
                animationUrl: gift.animation_url,
                animationType: gift.animation_type,
                durationMs: gift.duration_ms ?? (adet > 1 ? 2800 : 2400),
                fullScreen:
                  !!gift.full_screen || gift.coin_cost >= 999 || adet >= 77,
                coinCost: gift.coin_cost,
                quantity: adet,
              });
            }

            const sonuc = await HediyeGonder({
              roomId: baglam.roomId ?? null,
              receiverId,
              giftId: gift.id,
              quantity: adet,
              statusId: baglam.statusId ?? null,
              liveSessionId,
              coinSource: kaynak,
              channel: baglam.channel ?? null,
            });
            if (!sonuc.ok) {
              const yetersiz = /insufficient|yetersiz/i.test(sonuc.hata);
              if (yetersiz) {
                if (kaynak === 'purchased') paketleriYenile?.();
                Alert.alert(
                  i18n.t('hediye.yetersizCoin'),
                  kaynak === 'purchased'
                    ? i18n.t('hediye.yetersizCoinBody')
                    : i18n.t('cuzdanY.kaynakYetersiz'),
                );
                return;
              }
              Alert.alert(i18n.t('hediye.gonderilemedi'), sonuc.hata);
              return;
            }
            if (sonuc.coinsSpent > 0) {
              adjustWallet({ [KAYNAK_ALANI[kaynak]]: -sonuc.coinsSpent });
            }
            void refreshWallet();
            baglam.onBasarili?.(gift, adet);
          } finally {
            gonderKilit.current = false;
            setGonderiyor(false);
          }
        })();
      });
    },
    [
      hedef,
      seciliPkAliciId,
      islemiDene,
      adjustWallet,
      refreshWallet,
      profile,
      coinKaynagi,
      coinBakiyeleri,
      paketleriYenile,
      user?.id,
    ],
  );

  /** Panel içi coin modu — paketleri yenile (ayrı Modal yok) */
  const coinYukle = useCallback(() => {
    paketleriYenile?.();
  }, [paketleriYenile]);

  const seciliPk =
    hedef?.pkAlicilar?.find((a) => a.id === seciliPkAliciId) ??
    hedef?.pkAlicilar?.[0];

  return {
    acik,
    ac,
    kapat,
    gonder,
    gonderiyor,
    gifts,
    coins: wallet?.coins,
    coinKaynagi,
    setCoinKaynagi,
    coinBakiyeleri,
    aliciAdi: seciliPk?.ad ?? hedef?.aliciAdi,
    pkAlicilar: hedef?.pkAlicilar,
    seciliPkAliciId,
    setSeciliPkAliciId,
    coinYukle,
    coinYuklePaneli,
    upgradeAcik,
    upgradeKapat,
    upgradeAc,
    isGuest,
  };
}
