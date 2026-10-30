import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextStyle,
} from 'react-native';import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import {
  basariliGirisiKaydet,
  basarisizDenemeKaydet,
  kilitDurumunuGetir,
  sureBicimle,
} from '../../../src/moduller/admin/web/AdminGirisKoruma';
import { adminOturumIsaretiniKoy } from '../../../src/moduller/admin/web/AdminOturumIsareti';
import { GuvenlikOlayiKaydet } from '../../../src/moduller/guvenlik/olaylar/GuvenlikOlayiKaydet';

const MASAUSTU_MIN = 900;

/** Tarayıcının varsayılan odak çerçevesini kapatır; alanın kendi kenarlığı var. */
const WEB_ODAK_SIFIRLA =
  Platform.OS === 'web'
    ? ({ outlineStyle: 'none' } as unknown as TextStyle)
    : undefined;

type OdakAlani = 'eposta' | 'sifre' | null;

/** Giriş sayfasına dışarıdan gelen neden kodları. */
const NEDEN_MESAJLARI: Record<string, string> = {
  idle: 'Hareketsizlik nedeniyle oturum kapatıldı. Yeniden giriş yapın.',
  suresi_doldu: 'Oturum süresi doldu. Yeniden giriş yapın.',
  yetkisiz: 'Bu hesabın yönetim yetkisi yok.',
  sekme_kapandi: 'Sekme kapatıldığı için oturum sonlandı. Yeniden giriş yapın.',
  cikis: 'Güvenli çıkış yapıldı.',
};

/**
 * Personel girişi — yalnızca bu web uygulamasında bulunur.
 * Mobil binary'de bu ekran yoktur.
 *
 * Alanlar boş açılır: örnek e-posta/şifre gösterilmez, önceden doldurulmaz.
 */
export default function GirisEkrani() {
  const { width } = useWindowDimensions();
  const masaustu = Platform.OS === 'web' && width >= MASAUSTU_MIN;
  const params = useLocalSearchParams<{ neden?: string }>();

  const [eposta, setEposta] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreGorunur, setSifreGorunur] = useState(false);
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [odak, setOdak] = useState<OdakAlani>(null);
  const [capsLock, setCapsLock] = useState(false);
  const [kilit, setKilit] = useState(() => kilitDurumunuGetir());

  const sifreRef = useRef<TextInput>(null);
  const kilitZamanlayici = useRef<number | null>(null);

  // Dış nedenden gelen bilgi mesajı (oturum kapandı vb.)
  useEffect(() => {
    const neden = typeof params.neden === 'string' ? params.neden : '';
    if (neden && NEDEN_MESAJLARI[neden]) setBilgi(NEDEN_MESAJLARI[neden]);
  }, [params.neden]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Giriş · Tamuso Yönetim';
      // Arama motorlarına kapalı bir panelin indekslenmesini istemiyoruz.
      let meta = document.querySelector('meta[name="robots"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'robots');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', 'noindex, nofollow, noarchive');
    }
  }, []);

  // Caps Lock uyarısı — web klavyesinde şifre yanlış girilmesini azaltır.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const dinle = (e: KeyboardEvent) => {
      if (typeof e.getModifierState !== 'function') return;
      setCapsLock(e.getModifierState('CapsLock'));
    };
    window.addEventListener('keydown', dinle);
    window.addEventListener('keyup', dinle);
    return () => {
      window.removeEventListener('keydown', dinle);
      window.removeEventListener('keyup', dinle);
    };
  }, []);

  // Kilit sayacı
  useEffect(() => {
    if (!kilit.kilitli) return;
    const azalt = () => {
      const guncel = kilitDurumunuGetir();
      setKilit(guncel);
      if (!guncel.kilitli && kilitZamanlayici.current) {
        window.clearInterval(kilitZamanlayici.current);
        kilitZamanlayici.current = null;
        setHata('');
      }
    };
    kilitZamanlayici.current = window.setInterval(azalt, 1000);
    return () => {
      if (kilitZamanlayici.current) {
        window.clearInterval(kilitZamanlayici.current);
        kilitZamanlayici.current = null;
      }
    };
  }, [kilit.kilitli]);

  const girisYap = useCallback(async () => {
    if (yukleniyor) return;

    const guncelKilit = kilitDurumunuGetir();
    if (guncelKilit.kilitli) {
      setKilit(guncelKilit);
      return;
    }

    setHata('');
    setBilgi('');

    const kimlik = eposta.trim();
    if (!kimlik || !sifre) {
      setHata('E-posta ve şifre gerekli.');
      return;
    }

    setYukleniyor(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: kimlik,
        password: sifre,
      });

      if (error || !data?.user) {
        // Kullanıcı var/yok bilgisi sızdırılmaz; tek tip mesaj.
        const sonuc = basarisizDenemeKaydet();
        setKilit(sonuc);
        GuvenlikOlayiKaydet('login_failed', { surface: 'admin_web' });
        // Kilit mesajı ayrı ve türetilmiş olarak gösterilir (kaybolmasın).
        setHata(
          sonuc.kilitli
            ? ''
            : sonuc.kalanDeneme > 0
              ? `E-posta veya şifre hatalı. ${sonuc.kalanDeneme} deneme hakkı kaldı.`
              : 'E-posta veya şifre hatalı.',
        );
        setSifre('');
        sifreRef.current?.focus();
        return;
      }

      basariliGirisiKaydet();
      // Sekmeye bağlı oturum işareti — sekme kapanınca oturum düşer.
      adminOturumIsaretiniKoy();
      GuvenlikOlayiKaydet('login_success', { surface: 'admin_web' });

      // Yönlendirmeyi oturum kapısı yapar: /giris geçmişte taban kalır,
      // böylece geri tuşu panelin dışına (önceki siteye) düşmez.
    } catch {
      basarisizDenemeKaydet();
      setHata('Giriş yapılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setYukleniyor(false);
    }
  }, [eposta, sifre, yukleniyor]);

  const kilitli = kilit.kilitli;

  return (
    <View style={styles.kap}>
      {masaustu ? <MarkaPaneli /> : null}

      <View style={[styles.formTarafi, !masaustu && styles.formTarafiDar]}>
        <View style={styles.kart}>
          {!masaustu ? (
            <View style={styles.mobilMarka}>
              <View style={styles.markaIsaret}>
                <Ionicons name="shield-checkmark" size={20} color={RenkTokenlari.textOnPrimary} />
              </View>
              <Text style={styles.mobilMarkaAd}>Tamuso</Text>
            </View>
          ) : null}

          <View style={styles.rozet}>
            <View style={styles.rozetNokta} />
            <Text style={styles.rozetYazi}>YETKİLİ PERSONEL</Text>
          </View>

          <Text style={styles.baslik}>Yönetim paneli</Text>
          <Text style={styles.alt}>
            Devam etmek için personel hesabınızla giriş yapın.
          </Text>

          {bilgi ? (
            <View style={styles.bilgiKutu}>
              <Ionicons name="information-circle" size={16} color={RenkTokenlari.accent} />
              <Text style={styles.bilgiYazi}>{bilgi}</Text>
            </View>
          ) : null}

          {kilitli ? (
            <View style={styles.kilitKutu}>
              <Ionicons name="lock-closed" size={16} color={RenkTokenlari.warning} />
              <Text style={styles.kilitYazi}>
                Çok fazla başarısız deneme. {sureBicimle(kilit.kalanSaniye)} sonra
                tekrar deneyin.
              </Text>
            </View>
          ) : hata ? (
            <View style={styles.hataKutu}>
              <Ionicons name="alert-circle" size={16} color={RenkTokenlari.danger} />
              <Text style={styles.hataYazi}>{hata}</Text>
            </View>
          ) : null}

          <Text style={styles.etiket}>E-posta</Text>
          <View
            style={[
              styles.girdiKap,
              odak === 'eposta' && styles.girdiKapOdak,
              kilitli && styles.girdiKapPasif,
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={16}
              color={odak === 'eposta' ? RenkTokenlari.primarySoft : RenkTokenlari.textDim}
            />
            <TextInput
              style={[styles.girdi, WEB_ODAK_SIFIRLA]}
              value={eposta}
              onChangeText={(t) => {
                setEposta(t);
                if (hata) setHata('');
              }}
              onFocus={() => setOdak('eposta')}
              onBlur={() => setOdak((o) => (o === 'eposta' ? null : o))}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="username"
              textContentType="username"
              keyboardType="email-address"
              inputMode="email"
              enterKeyHint="next"
              editable={!kilitli && !yukleniyor}
              onSubmitEditing={() => sifreRef.current?.focus()}
              placeholder=""
              accessibilityLabel="E-posta"
            />
          </View>

          <Text style={styles.etiket}>Şifre</Text>
          <View
            style={[
              styles.girdiKap,
              odak === 'sifre' && styles.girdiKapOdak,
              kilitli && styles.girdiKapPasif,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color={odak === 'sifre' ? RenkTokenlari.primarySoft : RenkTokenlari.textDim}
            />
            <TextInput
              ref={sifreRef}
              style={[styles.girdi, WEB_ODAK_SIFIRLA]}
              value={sifre}
              onChangeText={(t) => {
                setSifre(t);
                if (hata) setHata('');
              }}
              onFocus={() => setOdak('sifre')}
              onBlur={() => setOdak((o) => (o === 'sifre' ? null : o))}
              secureTextEntry={!sifreGorunur}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="current-password"
              textContentType="password"
              enterKeyHint="go"
              editable={!kilitli && !yukleniyor}
              onSubmitEditing={() => void girisYap()}
              placeholder=""
              accessibilityLabel="Şifre"
            />
            <Pressable
              onPress={() => setSifreGorunur((g) => !g)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={sifreGorunur ? 'Şifreyi gizle' : 'Şifreyi göster'}
            >
              <Ionicons
                name={sifreGorunur ? 'eye-off-outline' : 'eye-outline'}
                size={17}
                color={RenkTokenlari.textDim}
              />
            </Pressable>
          </View>

          {capsLock ? (
            <View style={styles.capsUyari}>
              <Ionicons name="warning-outline" size={13} color={RenkTokenlari.warning} />
              <Text style={styles.capsYazi}>Caps Lock açık.</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.dugme,
              (kilitli || yukleniyor) && styles.dugmePasif,
              pressed && !kilitli && !yukleniyor && styles.dugmeBasili,
            ]}
            disabled={kilitli || yukleniyor}
            onPress={() => void girisYap()}
            accessibilityRole="button"
            accessibilityLabel="Giriş yap"
          >
            {yukleniyor ? (
              <ActivityIndicator color={RenkTokenlari.textOnPrimary} size="small" />
            ) : (
              <>
                <Text style={styles.dugmeYazi}>
                  {kilitli ? `Kilitli · ${sureBicimle(kilit.kalanSaniye)}` : 'Giriş yap'}
                </Text>
                {!kilitli ? (
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={RenkTokenlari.textOnPrimary}
                  />
                ) : null}
              </>
            )}
          </Pressable>

          <View style={styles.ayrac} />

          <Text style={styles.not}>
            Bu panel yalnızca yetkili personel içindir. Giriş denemeleri ve kritik
            işlemler denetim kaydına yazılır; şifreler hiçbir zaman kaydedilmez.
          </Text>
          <Text style={styles.notAlt}>
            20 dakika işlem yapılmazsa oturum otomatik kapanır.
          </Text>
        </View>
      </View>
    </View>
  );
}

function MarkaPaneli() {
  return (
    <LinearGradient
      colors={[...RenkTokenlari.gradientNight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.markaPaneli}
    >
      <View style={styles.markaUst}>
        <View style={styles.markaIsaret}>
          <Ionicons
            name="shield-checkmark"
            size={22}
            color={RenkTokenlari.textOnPrimary}
          />
        </View>
        <View>
          <Text style={styles.markaAd}>Tamuso</Text>
          <Text style={styles.markaAlt}>Kontrol merkezi</Text>
        </View>
      </View>

      <View style={styles.markaOrta}>
        <Text style={styles.markaBaslik}>Platformu tek yerden yönetin.</Text>
        <Text style={styles.markaAciklama}>
          Kullanıcı, içerik, finans ve moderasyon işlemleri; yetkiye göre
          sınırlandırılmış tek bir konsoldan.
        </Text>

        <View style={styles.markaListe}>
          <MarkaMadde ikon="lock-closed" metin="Şifreler ve oturum belirteçleri kaydedilmez" />
          <MarkaMadde ikon="timer-outline" metin="Hareketsizlikte otomatik oturum kapatma" />
          <MarkaMadde ikon="document-text-outline" metin="Kritik işlemler denetim kaydında" />
        </View>
      </View>

      <Text style={styles.markaDip}>
        Bu konsol mobil uygulamaya dahil değildir.
      </Text>
    </LinearGradient>
  );
}

function MarkaMadde({
  ikon,
  metin,
}: {
  ikon: React.ComponentProps<typeof Ionicons>['name'];
  metin: string;
}) {
  return (
    <View style={styles.markaMadde}>
      <View style={styles.markaMaddeIkon}>
        <Ionicons name={ikon} size={14} color={RenkTokenlari.primarySoft} />
      </View>
      <Text style={styles.markaMaddeYazi}>{metin}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kap: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: RenkTokenlari.bg,
  },

  // Sol marka paneli (yalnızca masaüstü)
  markaPaneli: {
    flex: 1,
    padding: BoslukTokenlari.xxxl,
    justifyContent: 'space-between',
    borderRightWidth: 1,
    borderRightColor: RenkTokenlari.border,
  },
  markaUst: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  markaIsaret: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.primary,
  },
  markaAd: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },
  markaAlt: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim, marginTop: 2 },
  markaOrta: { maxWidth: 420, gap: 12 },
  markaBaslik: { ...TipografiTokenlari.hero, color: RenkTokenlari.text },
  markaAciklama: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    marginBottom: 8,
  },
  markaListe: { gap: 10, marginTop: 8 },
  markaMadde: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  markaMaddeIkon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  markaMaddeYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    flex: 1,
  },
  markaDip: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },

  // Sağ form tarafı
  formTarafi: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: BoslukTokenlari.xxl,
  },
  formTarafiDar: {
    flex: 0,
    width: '100%',
    minHeight: '100%',
    padding: BoslukTokenlari.lg,
  },
  kart: {
    width: '100%',
    maxWidth: 396,
    gap: 6,
    padding: BoslukTokenlari.xl,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },

  mobilMarka: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  mobilMarkaAd: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },

  rozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: RenkTokenlari.chipFill,
    marginBottom: 10,
  },
  rozetNokta: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: RenkTokenlari.success,
  },
  rozetYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    letterSpacing: 1,
  },

  baslik: { ...TipografiTokenlari.title, color: RenkTokenlari.text },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginBottom: 14,
  },

  bilgiKutu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.surface,
    marginBottom: 8,
  },
  bilgiYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    flex: 1,
  },
  hataKutu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: RenkTokenlari.danger,
    backgroundColor: RenkTokenlari.pressFill,
    marginBottom: 8,
  },
  hataYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.danger,
    flex: 1,
  },
  kilitKutu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: RenkTokenlari.warning,
    backgroundColor: RenkTokenlari.surface,
    marginBottom: 8,
  },
  kilitYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.warning,
    flex: 1,
  },

  etiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginTop: 8,
    marginBottom: 6,
  },
  girdiKap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 11 : 9,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  girdiKapOdak: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.surface,
  },
  girdiKapPasif: { opacity: 0.5 },
  girdi: {
    flex: 1,
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
  },

  capsUyari: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  capsYazi: { ...TipografiTokenlari.micro, color: RenkTokenlari.warning },

  dugme: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.primary,
  },
  dugmeBasili: { opacity: 0.88 },
  dugmePasif: { opacity: 0.5 },
  dugmeYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '700',
  },

  ayrac: {    height: 1,
    backgroundColor: RenkTokenlari.divider,
    marginVertical: 16,
  },
  not: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    lineHeight: 16,
  },
  notAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 6,
  },
});
