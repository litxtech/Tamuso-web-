import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { AdminYetkisiVarMi } from '../yetki/AdminYetkisiVarMi';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { AdminOturumuKapat } from './AdminOturumuKapat';
import {
  adminOturumBaslangiciGetir,
  adminOturumIsaretiniKoy,
  adminOturumIsaretiVarMi,
} from './AdminOturumIsareti';

/** Hareketsizlik süresi — bu kadar süre işlem yapılmazsa oturum kapanır. */
export const ADMIN_BOSLUK_MS = 20 * 60 * 1000;
/** Mutlak oturum ömrü — hareketsizlik olsa bile bu süre sonunda kapanır. */
export const ADMIN_MUTLAK_MS = 8 * 60 * 60 * 1000;
/** Profil yüklenmesi için tanınan süre; aşılırsa yetkisiz sayılır. */
const PROFIL_BEKLEME_MS = 12_000;

const TIK_MS = 15_000;

export type AdminOturumDurumu = {
  /** Kalan süre (saniye) — boşluk veya mutlak sürenin küçüğü. */
  kalanSaniye: number;
  toplamSaniye: number;
  /** Kullanıcı işlemi sayacı sıfırlar. */
  uzat: () => void;
};

const VarsayilanDurum: AdminOturumDurumu = {
  kalanSaniye: Math.floor(ADMIN_BOSLUK_MS / 1000),
  toplamSaniye: Math.floor(ADMIN_BOSLUK_MS / 1000),
  uzat: () => undefined,
};

const OturumDurumuContext = createContext<AdminOturumDurumu>(VarsayilanDurum);

export function useAdminOturumDurumu(): AdminOturumDurumu {
  return useContext(OturumDurumuContext);
}

function Bekleme({ mesaj }: { mesaj: string }) {
  return (
    <View style={styles.bekleme}>
      <ActivityIndicator color={RenkTokenlari.primarySoft} />
      <Text style={styles.beklemeYazi}>{mesaj}</Text>
    </View>
  );
}

/**
 * Yönetim panelinin tek oturum kapısı.
 *
 *  - Oturum yoksa /giris'e yönlendirir.
 *  - Oturumu olup personel yetkisi olmayanı çıkarır.
 *  - Hareketsizlik / mutlak süre aşımında çıkarır.
 *  - Oturum belirteci bu uygulamada sessionStorage'da tutulur: sekme
 *    kapanınca personel oturumu tarayıcıda kalmaz.
 *
 * Sunucu tarafı yetki (RLS + is_admin) esastır; bu kapı yalnızca arayüzü
 * korur ve veri isteklerini erkenden keser.
 */
export function AdminOturumKapisi({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, refreshProfile } = useAuth();
  const path = usePathname();
  const girisSayfasi = path === '/giris';

  const [profilZamanAsimi, setProfilZamanAsimi] = useState(false);
  const [kalanSaniye, setKalanSaniye] = useState(
    Math.floor(ADMIN_BOSLUK_MS / 1000),
  );

  const sonAktiviteRef = useRef(Date.now());
  const cikisBasladiRef = useRef(false);
  const yonlendirildiRef = useRef(false);

  const admin = AdminYetkisiVarMi(profile);

  const uzat = useCallback(() => {
    sonAktiviteRef.current = Date.now();
  }, []);

  // Sekme işareti oturumun başlangıç anını tutar (mutlak süre için).
  // Belirteç zaten sessionStorage'da: yeni sekmede oturum olmaz.
  useEffect(() => {
    if (session && !adminOturumIsaretiVarMi()) adminOturumIsaretiniKoy();
  }, [session]);

  // Profil gecikirse bir kez daha dene, sonra yetkisiz say.
  useEffect(() => {
    if (!session?.user?.id || profile) {
      setProfilZamanAsimi(false);
      return;
    }
    const t1 = setTimeout(() => void refreshProfile(), 3_000);
    const t2 = setTimeout(() => setProfilZamanAsimi(true), PROFIL_BEKLEME_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [session?.user?.id, profile, refreshProfile]);

  // Oturum yok → girişe
  useEffect(() => {
    if (loading) return;
    if (!session) {
      // Yeni giriş denemesi engellenmesin: çıkış kilidi burada açılır.
      cikisBasladiRef.current = false;
      setProfilZamanAsimi(false);
      if (!girisSayfasi && !yonlendirildiRef.current) {
        yonlendirildiRef.current = true;
        router.replace('/giris' as never);
      }
      return;
    }
    yonlendirildiRef.current = false;
  }, [loading, session, girisSayfasi]);

  // Yetki yok → zorunlu çıkış
  useEffect(() => {
    if (loading || !session) return;
    if (cikisBasladiRef.current) return;

    const yetkiYok = (!!profile && !admin) || (!profile && profilZamanAsimi);
    if (!yetkiYok) return;

    cikisBasladiRef.current = true;
    void AdminOturumuKapat('yetkisiz').finally(() => {
      router.replace('/giris?neden=yetkisiz' as never);
    });
  }, [loading, session, profile, admin, profilZamanAsimi]);

  // Oturum açıkken giriş sayfasına dönülürse panele geri gönder.
  // push (replace değil): /giris girişi geçmişte taban olarak kalsın,
  // böylece tarayıcı geri tuşu panelin dışına düşmez.
  useEffect(() => {
    if (loading || !session || !admin || !girisSayfasi) return;
    router.push('/admin');
  }, [loading, session, admin, girisSayfasi]);

  // Hareketsizlik sayacı — yalnızca yetkili oturumda çalışır.
  const sayacAktif = !loading && !!session && admin;

  useEffect(() => {
    if (!sayacAktif) return;
    sonAktiviteRef.current = Date.now();

    const dokun = () => {
      sonAktiviteRef.current = Date.now();
    };

    const olaylar: (keyof WindowEventMap)[] = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'wheel',
    ];
    olaylar.forEach((o) =>
      window.addEventListener(o, dokun, { passive: true, capture: true }),
    );

    const baslangic = adminOturumBaslangiciGetir() || Date.now();

    const kontrolEt = () => {
      if (cikisBasladiRef.current) return;
      const simdi = Date.now();
      const boslukKalan = ADMIN_BOSLUK_MS - (simdi - sonAktiviteRef.current);
      const mutlakKalan = ADMIN_MUTLAK_MS - (simdi - baslangic);
      const kalan = Math.min(boslukKalan, mutlakKalan);

      setKalanSaniye(Math.max(0, Math.floor(kalan / 1000)));

      if (kalan <= 0) {
        cikisBasladiRef.current = true;
        const neden = mutlakKalan <= boslukKalan ? 'suresi_doldu' : 'idle';
        void AdminOturumuKapat(neden).finally(() => {
          router.replace(`/giris?neden=${neden}` as never);
        });
      }
    };

    const gorunurluk = () => {
      // Sekmeye dönüşte geçen süreyi hemen değerlendir.
      if (document.visibilityState === 'visible') kontrolEt();
    };
    document.addEventListener('visibilitychange', gorunurluk);

    kontrolEt();
    const zamanlayici = window.setInterval(kontrolEt, TIK_MS);

    return () => {
      window.clearInterval(zamanlayici);
      olaylar.forEach((o) =>
        window.removeEventListener(o, dokun, { capture: true }),
      );
      document.removeEventListener('visibilitychange', gorunurluk);
    };
  }, [sayacAktif]);

  const durum = useMemo<AdminOturumDurumu>(
    () => ({
      kalanSaniye,
      toplamSaniye: Math.floor(ADMIN_BOSLUK_MS / 1000),
      uzat,
    }),
    [kalanSaniye, uzat],
  );

  if (loading) return <Bekleme mesaj="Oturum kontrol ediliyor…" />;

  if (!session) {
    // Giriş ekranının kendisi engellenmez; diğer sayfalar yönlendirilir.
    return girisSayfasi ? (
      <OturumDurumuContext.Provider value={durum}>
        {children}
      </OturumDurumuContext.Provider>
    ) : (
      <Bekleme mesaj="Giriş ekranına yönlendiriliyorsunuz…" />
    );
  }

  if (cikisBasladiRef.current) {
    return <Bekleme mesaj="Oturum kapatılıyor…" />;
  }

  if (!profile && !profilZamanAsimi) {
    return <Bekleme mesaj="Yetkiler doğrulanıyor…" />;
  }

  if (!admin) {
    return <Bekleme mesaj="Bu hesabın yönetim yetkisi yok." />;
  }

  if (girisSayfasi) {
    return <Bekleme mesaj="Kontrol merkezine yönlendiriliyorsunuz…" />;
  }

  return (
    <OturumDurumuContext.Provider value={durum}>
      {children}
    </OturumDurumuContext.Provider>
  );
}

const styles = StyleSheet.create({
  bekleme: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: RenkTokenlari.bg,
  },
  beklemeYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
});
