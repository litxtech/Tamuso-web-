import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { ProfilAvatarKucuk } from '../../canli-sohbet/bilesenler/ProfilAvatarKucuk';
import {
  ProfilAlinanHediyeleriGetir,
  type ProfilAlinanHediyeler,
  type ProfilHediyeGonderen,
  type ProfilHediyeKalemi,
} from '../okuma/ProfilAlinanHediyeleriGetir';

const ONIZLEME = 6;

function kisaSayi(n: number): string {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '0';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.floor(v));
}

function adAl(g: ProfilHediyeGonderen): string {
  return g.display_name?.trim() || g.username?.trim() || g.user_id.slice(0, 8);
}

export function ProfilAlinanHediyeButonu({
  userId,
  adet,
  gizli = false,
}: {
  userId: string;
  adet: number;
  gizli?: boolean;
}) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const { height: ekran } = useWindowDimensions();
  const [acik, setAcik] = useState(false);
  const [listeTakili, setListeTakili] = useState(false);
  const [tamListe, setTamListe] = useState<ProfilHediyeGonderen | null>(null);
  const [tamTakili, setTamTakili] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [veri, setVeri] = useState<ProfilAlinanHediyeler | null>(null);
  const [hata, setHata] = useState(false);
  const hedefRef = useRef<string | null>(null);
  const listeBittiRef = useRef(false);
  const tamBittiRef = useRef(false);
  const yukseklik = Math.round(ekran * 0.62);

  const listeKapandi = () => {
    if (listeBittiRef.current) return;
    listeBittiRef.current = true;
    const id = hedefRef.current;
    hedefRef.current = null;
    setListeTakili(false);
    if (!id) return;
    // Modal ağaçtan çıktıktan sonra geç; aksi halde görünmez katman dokunuşu yutar.
    setTimeout(() => {
      router.push(`/kullanici/${id}` as never);
    }, 40);
  };

  const tamKapandi = () => {
    if (tamBittiRef.current) return;
    tamBittiRef.current = true;
    setTamTakili(false);
  };

  useEffect(() => {
    if (acik || !listeTakili) return;
    const timer = setTimeout(listeKapandi, Platform.OS === 'ios' ? 800 : 80);
    return () => clearTimeout(timer);
  }, [acik, listeTakili]);

  useEffect(() => {
    if (tamListe || !tamTakili) return;
    const timer = setTimeout(tamKapandi, Platform.OS === 'ios' ? 800 : 80);
    return () => clearTimeout(timer);
  }, [tamListe, tamTakili]);

  if (gizli || !userId) return null;

  const ac = () => {
    listeBittiRef.current = false;
    hedefRef.current = null;
    setListeTakili(true);
    setAcik(true);
    setYukleniyor(true);
    setHata(false);
    void ProfilAlinanHediyeleriGetir(userId)
      .then((gelen) => setVeri(gelen))
      .catch(() => {
        setVeri(null);
        setHata(true);
      })
      .finally(() => setYukleniyor(false));
  };

  const gonderenler = veri?.gizli ? [] : (veri?.gonderenler ?? []);

  const hediyeSatiri = (h: ProfilHediyeKalemi, anahtar: string) => (
    <View key={anahtar} style={styles.hediyeSatir}>
      <Text style={styles.hediyeEmoji}>{h.emoji || '🎁'}</Text>
      <Text style={styles.hediyeAd} numberOfLines={2}>
        {h.ad || t('profil.alinan')}
      </Text>
      <Text style={styles.hediyeAdet}>×{kisaSayi(h.adet)}</Text>
    </View>
  );

  return (
    <>
      <Pressable
        onPress={ac}
        style={styles.butonDis}
        accessibilityRole="button"
        accessibilityLabel={t('profil.cazibeUnvanA11y', { adet })}
      >
        <LinearGradient
          colors={['#FF4D8D', '#C026D3', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buton}
        >
          <Ionicons name="sparkles" size={13} color="#FFF4C8" />
          <Text style={styles.butonYazi}>{t('profil.cazibeUnvan')}</Text>
          <View style={styles.butonSayiKapsul}>
            <Text style={styles.butonSayi}>{kisaSayi(adet)}</Text>
          </View>
        </LinearGradient>
      </Pressable>

      {listeTakili ? (
      <TamusoModal
        visible={acik}
        onClose={() => {
          hedefRef.current = null;
          setAcik(false);
        }}
        onDismiss={listeKapandi}
        placement="bottom"
        animationType="slide"
        backdropClosable
      >
        <View
          style={[
            styles.kart,
            {
              height: yukseklik,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.baslikSatir}>
            <View style={styles.baslikIkon}>
              <Ionicons name="sparkles" size={18} color="#FFF4C8" />
            </View>
            <Text style={styles.baslik} numberOfLines={1}>
              {t('profil.cazibeUnvan')}
            </Text>
            <Pressable
              onPress={() => {
                hedefRef.current = null;
                setAcik(false);
              }}
              style={styles.kapat}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('ortak.kapat')}
            >
              <Ionicons name="close" size={20} color="#F7F2E8" />
            </Pressable>
          </View>

          <View style={styles.ozet}>
            <View style={styles.ozetKart}>
              <Text style={styles.ozetEtiket}>{t('profil.alinan')}</Text>
              <Text style={styles.ozetDeger}>
                {kisaSayi(veri?.toplam_adet ?? adet)}
              </Text>
            </View>
            <View style={styles.ozetKart}>
              <Text style={styles.ozetEtiket}>{t('cuzdan.coin')}</Text>
              <Text style={styles.ozetDeger}>
                {kisaSayi(veri?.toplam_coin ?? 0)}
              </Text>
            </View>
          </View>

          {yukleniyor ? (
            <ActivityIndicator color={RenkTokenlari.mint} style={styles.bos} />
          ) : hata ? (
            <Text style={styles.bosMetin}>{t('profil.hediyeListeHata')}</Text>
          ) : veri?.gizli ? (
            <Text style={styles.bosMetin}>{t('profil.hediyeGizli')}</Text>
          ) : gonderenler.length === 0 ? (
            <Text style={styles.bosMetin}>{t('profil.hediyeGonderenBos')}</Text>
          ) : (
            <ScrollView
              style={styles.liste}
              contentContainerStyle={styles.listeIcerik}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.bolum}>{t('profil.hediyeKimden')}</Text>
              {gonderenler.map((g, index) => (
                <Pressable
                  key={g.user_id}
                  style={styles.kartSatir}
                  onPress={() => {
                    listeBittiRef.current = false;
                    hedefRef.current = g.user_id;
                    setAcik(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={adAl(g)}
                >
                  <View style={styles.kartUst}>
                    <View style={[styles.sira, index < 3 && styles.siraUst]}>
                      <Text style={[styles.siraYazi, index < 3 && styles.siraYaziUst]}>
                        {index + 1}
                      </Text>
                    </View>
                    <ProfilAvatarKucuk
                      size={42}
                      displayName={g.display_name}
                      username={g.username}
                      avatarUrl={g.avatar_url}
                    />
                    <View style={styles.satirMetin}>
                      <Text style={styles.ad} numberOfLines={1}>
                        {adAl(g)}
                      </Text>
                      {g.username ? (
                        <Text style={styles.kullaniciAdi} numberOfLines={1}>
                          @{g.username}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="rgba(247,242,232,0.35)"
                    />
                  </View>
                  <View style={styles.kartAlt}>
                    <Text style={styles.ozetMini}>
                      {t('profil.hediyeAdet', { adet: kisaSayi(g.adet) })}
                      {'  ·  '}
                      {t('profil.hediyeCoin', { coin: kisaSayi(g.coin) })}
                    </Text>
                    <View style={styles.hediyeListe}>
                      {g.hediyeler.slice(0, ONIZLEME).map((h, hi) =>
                        hediyeSatiri(h, `${g.user_id}-${hi}`),
                      )}
                    </View>
                    {g.hediyeler.length > ONIZLEME ? (
                      <Pressable
                        onPress={() => {
                          tamBittiRef.current = false;
                          setTamTakili(true);
                          setTamListe(g);
                        }}
                        style={styles.dahaFazla}
                        accessibilityRole="button"
                      >
                        <Text style={styles.dahaFazlaYazi}>
                          {t('profil.hediyeDahaFazla')}
                        </Text>
                        <Text style={styles.dahaFazlaSayi}>
                          {g.hediyeler.length - ONIZLEME}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </TamusoModal>
      ) : null}

      {tamTakili ? (
      <TamusoModal
        visible={!!tamListe}
        onClose={() => setTamListe(null)}
        onDismiss={tamKapandi}
        placement="bottom"
        animationType="slide"
        backdropClosable
      >
        <View
          style={[
            styles.kart,
            {
              height: yukseklik,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.baslikSatir}>
            <View style={styles.baslikIkon}>
              <Ionicons name="gift" size={18} color={RenkTokenlari.mint} />
            </View>
            <View style={styles.satirMetin}>
              <Text style={styles.baslik} numberOfLines={1}>
                {tamListe ? adAl(tamListe) : ''}
              </Text>
              <Text style={styles.kullaniciAdi} numberOfLines={1}>
                {t('profil.alinanHediyeler')}
              </Text>
            </View>
            <Pressable
              onPress={() => setTamListe(null)}
              style={styles.kapat}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('ortak.kapat')}
            >
              <Ionicons name="close" size={20} color="#F7F2E8" />
            </Pressable>
          </View>
          <ScrollView
            style={styles.liste}
            contentContainerStyle={styles.listeIcerik}
            showsVerticalScrollIndicator={false}
          >
            {(tamListe?.hediyeler ?? []).map((h, hi) =>
              hediyeSatiri(h, `tam-${hi}`),
            )}
          </ScrollView>
        </View>
      </TamusoModal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  butonDis: {
    flexShrink: 0,
    borderRadius: YaricapTokenlari.pill,
    shadowColor: '#E11D74',
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  buton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 244, 200, 0.55)',
  },
  butonYazi: {
    ...TipografiTokenlari.micro,
    color: '#FFF8EE',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  butonSayiKapsul: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(18, 8, 22, 0.38)',
    alignItems: 'center',
  },
  butonSayi: {
    ...TipografiTokenlari.micro,
    color: '#FFF4C8',
    fontWeight: '800',
  },
  kart: {
    backgroundColor: 'rgba(18, 14, 26, 0.98)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginBottom: 10,
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  baslikIkon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(192, 38, 211, 0.28)',
  },
  baslik: {
    ...TipografiTokenlari.title,
    color: '#F7F2E8',
    fontWeight: '800',
    fontSize: 17,
    flex: 1,
  },
  ozet: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  ozetKart: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ozetEtiket: {
    ...TipografiTokenlari.micro,
    color: 'rgba(247,242,232,0.5)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  ozetDeger: {
    ...TipografiTokenlari.title,
    color: '#F7F2E8',
    fontWeight: '800',
    fontSize: 20,
    marginTop: 2,
  },
  kapat: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  liste: { flex: 1 },
  listeIcerik: { paddingBottom: 8, gap: 8 },
  bolum: {
    ...TipografiTokenlari.micro,
    color: 'rgba(247,242,232,0.45)',
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  kartSatir: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  kartUst: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sira: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  siraUst: {
    backgroundColor: 'rgba(240, 215, 140, 0.22)',
  },
  siraYazi: {
    ...TipografiTokenlari.micro,
    color: 'rgba(247,242,232,0.55)',
    fontWeight: '800',
  },
  siraYaziUst: {
    color: '#F0D78C',
  },
  satirMetin: { flex: 1, minWidth: 0 },
  ad: {
    ...TipografiTokenlari.body,
    color: '#F7F2E8',
    fontWeight: '700',
  },
  kullaniciAdi: {
    ...TipografiTokenlari.micro,
    color: 'rgba(247,242,232,0.5)',
    marginTop: 1,
  },
  kartAlt: { gap: 8, paddingLeft: 32 },
  ozetMini: {
    ...TipografiTokenlari.micro,
    color: 'rgba(247,242,232,0.72)',
    fontWeight: '600',
  },
  hediyeListe: { gap: 4 },
  hediyeSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  hediyeEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  hediyeAd: {
    ...TipografiTokenlari.body,
    color: '#F7F2E8',
    fontWeight: '600',
    flex: 1,
  },
  hediyeAdet: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.mint,
    fontWeight: '800',
  },
  dahaFazla: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(61, 207, 176, 0.12)',
  },
  dahaFazlaYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.mint,
    fontWeight: '800',
  },
  dahaFazlaSayi: {
    ...TipografiTokenlari.micro,
    color: '#F7F2E8',
    fontWeight: '800',
    minWidth: 22,
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bos: { marginVertical: 28 },
  bosMetin: {
    ...TipografiTokenlari.body,
    color: 'rgba(247,242,232,0.7)',
    textAlign: 'center',
    marginVertical: 28,
  },
});
