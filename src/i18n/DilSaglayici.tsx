import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ActivityIndicator, View } from 'react-native';
import { I18nDiliniAyarla } from './index';
import { dilBootstrapSoz } from './dilBootstrap';
import {
  CihazDiliniAl,
  DilCozumle,
  DilNormalizeEt,
  DIL_ETIKETLERI,
  DIL_LOCALE_MAP,
  DESTEKLENEN_DILLER,
  VARSAYILAN_DIL,
  type DilModu,
  type UygulamaDili,
} from './diller';
import { RtlUygula, RtlYenidenBaslat } from './RtlUygula';
import { isRtlAktif, isRtlDil } from './rtl';
import {
  DilAyariniKaydet,
  DilModunuSistemYap,
} from '../moduller/ayarlar/islemler/KullaniciAyarlariniYonet';
import { ProfilDiliniKaydet } from '../moduller/ayarlar/islemler/ProfilDiliniKaydet';
import { RenkTokenlari } from '../tasarim-sistemi/RenkTokenlari';

type DilBaglam = {
  dil: UygulamaDili;
  dilModu: DilModu;
  dilEtiketi: string;
  locale: string;
  /** Dil intent — ar ise true (I18nManager ile aynı olmalı; reload sonrası) */
  rtl: boolean;
  /** Native layout şu an RTL mi */
  rtlAktif: boolean;
  desteklenen: readonly UygulamaDili[];
  /** Manuel dil — kalıcı; cihaz/ülke dili değiştirmez */
  dilDegistir: (yeni: UygulamaDili) => Promise<{ reloadGerekli: boolean }>;
  /** Sistem / ülke diline dön */
  sistemDiliniKullan: () => Promise<{ reloadGerekli: boolean }>;
  hazir: boolean;
};

const DilContext = createContext<DilBaglam>({
  dil: VARSAYILAN_DIL,
  dilModu: 'SYSTEM',
  dilEtiketi: DIL_ETIKETLERI[VARSAYILAN_DIL],
  locale: DIL_LOCALE_MAP[VARSAYILAN_DIL],
  rtl: false,
  rtlAktif: false,
  desteklenen: DESTEKLENEN_DILLER,
  dilDegistir: async () => ({ reloadGerekli: false }),
  sistemDiliniKullan: async () => ({ reloadGerekli: false }),
  hazir: false,
});

type Props = {
  children: React.ReactNode;
  profilDili?: string | null;
  profilUlke?: string | null;
};

function diliUygula(kod: UygulamaDili): Promise<boolean> {
  return I18nDiliniAyarla(kod).then(() => RtlUygula(kod).yenidenBaslatGerekli);
}

export function DilSaglayici({
  children,
  profilDili: _profilDili,
  profilUlke,
}: Props) {
  const [dil, setDil] = useState<UygulamaDili>(() => CihazDiliniAl());
  const [dilModu, setDilModu] = useState<DilModu>('SYSTEM');
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    let iptal = false;
    void (async () => {
      let bekleyenReload = false;
      try {
        const sonuc = await dilBootstrapSoz;
        if (iptal) return;
        setDil(sonuc.dil);
        setDilModu(sonuc.dilModu);
        if (sonuc.reloadGerekli) {
          bekleyenReload = true;
          void RtlYenidenBaslat();
        }
      } catch {
        if (!iptal) {
          const fallback = DilCozumle({ mod: 'SYSTEM' });
          const reloadGerekli = await diliUygula(fallback);
          if (iptal) return;
          setDil(fallback);
          setDilModu('SYSTEM');
          if (reloadGerekli) {
            bekleyenReload = true;
            void RtlYenidenBaslat();
          }
        }
      } finally {
        if (!iptal && !bekleyenReload) setHazir(true);
      }
    })();
    return () => {
      iptal = true;
    };
  }, []);

  const dilDegistir = useCallback(async (yeni: UygulamaDili) => {
    const kod = DilNormalizeEt(yeni);
    const reloadGerekli = await diliUygula(kod);
    setDil(kod);
    setDilModu('MANUAL');
    await DilAyariniKaydet(kod);
    void ProfilDiliniKaydet(kod);
    return { reloadGerekli };
  }, []);

  const sistemDiliniKullan = useCallback(async () => {
    await DilModunuSistemYap();
    const kod = DilCozumle({ mod: 'SYSTEM', profilUlke });
    const reloadGerekli = await diliUygula(kod);
    setDil(kod);
    setDilModu('SYSTEM');
    void ProfilDiliniKaydet(kod);
    return { reloadGerekli };
  }, [profilUlke]);

  const value = useMemo<DilBaglam>(
    () => ({
      dil,
      dilModu,
      dilEtiketi: DIL_ETIKETLERI[dil],
      locale: DIL_LOCALE_MAP[dil],
      rtl: isRtlDil(dil),
      rtlAktif: isRtlAktif(),
      desteklenen: DESTEKLENEN_DILLER,
      dilDegistir,
      sistemDiliniKullan,
      hazir,
    }),
    [dil, dilModu, dilDegistir, sistemDiliniKullan, hazir],
  );

  if (!hazir) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: RenkTokenlari.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={RenkTokenlari.primary} size="large" />
      </View>
    );
  }

  return <DilContext.Provider value={value}>{children}</DilContext.Provider>;
}

export function useDil(): DilBaglam {
  return useContext(DilContext);
}
