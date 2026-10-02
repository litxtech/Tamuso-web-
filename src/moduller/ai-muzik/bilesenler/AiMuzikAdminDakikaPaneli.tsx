import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AiMuzikAdminBakiyeAyarla,
  AiMuzikAdminBakiyeTopluAyarla,
  AiMuzikAdminKullaniciAra,
  AiMuzikAdminKullaniciBakiyesi,
} from '../islemler/AiMuzikApi';
import type { AiMuzikAdminBakiyeKullanici } from '../tipler';
import { DakikaEtiket, SureFormat } from '../utils/SureFormat';
import {
  AdminKullaniciOneri,
  OneriAdi,
  type AdminKullaniciOneriSatiri,
} from '../../admin/kullanici/okuma/AdminKullaniciOneri';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  GolgeTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

const DAKIKA_PRESET = [1, 2, 5, 7, 10, 15, 30, 60] as const;

type SeciliKullanici = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  public_user_id: string | null;
  available_seconds: number;
  reserved_seconds: number;
  lifetime_granted_seconds: number;
  track_count: number;
};

type Props = {
  onKullaniciDetay?: (userId: string) => void;
  /** Pull-to-refresh / sekme yenilemesi — seçimi bozmadan listeyi tazeler */
  yenileToken?: number;
};

function Avatar({
  url,
  ad,
  size = 40,
}: {
  url?: string | null;
  ad: string;
  size?: number;
}) {
  const harf = (ad.trim() || '?').charAt(0).toLocaleUpperCase('tr-TR');
  const safe = MedyaUriGuvenli(url);
  if (safe) {
    return (
      <Image
        source={{ uri: safe }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: RenkTokenlari.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: RenkTokenlari.border,
      }}
    >
      <Text
        style={{
          color: RenkTokenlari.textMuted,
          fontWeight: '800',
          fontSize: size * 0.38,
        }}
      >
        {harf}
      </Text>
    </View>
  );
}

function kisiAdi(
  u: {
    display_name: string | null;
    username: string | null;
  },
  fallback: string,
) {
  return u.display_name?.trim() || u.username?.trim() || fallback;
}

export function AiMuzikAdminDakikaPaneli({
  onKullaniciDetay,
  yenileToken = 0,
}: Props) {
  const { t } = useCeviri();
  const [arama, setArama] = useState('');
  const [oneriler, setOneriler] = useState<AdminKullaniciOneriSatiri[]>([]);
  const [araniyor, setAraniyor] = useState(false);
  const [secililer, setSecililer] = useState<SeciliKullanici[]>([]);
  const [liste, setListe] = useState<AiMuzikAdminBakiyeKullanici[]>([]);
  const [tumListeAcik, setTumListeAcik] = useState(false);
  const [listeYukleniyor, setListeYukleniyor] = useState(false);
  const [dakikaMetin, setDakikaMetin] = useState('7');
  const [sebep, setSebep] = useState('');
  const [islemYapiliyor, setIslemYapiliyor] = useState(false);
  const aramaSeq = useRef(0);

  useEffect(() => {
    setSebep((prev) =>
      prev.trim() ? prev : t('aiMuzik.admin.sebepVarsayilan'),
    );
  }, [t]);

  const seciliIds = secililer.map((s) => s.user_id);

  const secililerRef = useRef(secililer);
  secililerRef.current = secililer;
  const tumListeAcikRef = useRef(tumListeAcik);
  tumListeAcikRef.current = tumListeAcik;

  useEffect(() => {
    const q = arama.trim();
    if (q.length < 1) {
      setOneriler([]);
      setAraniyor(false);
      return;
    }

    const seq = ++aramaSeq.current;
    setAraniyor(true);
    const t = setTimeout(() => {
      void (async () => {
        try {
          const rows = await AdminKullaniciOneri(q, 8);
          if (seq !== aramaSeq.current) return;
          setOneriler(rows);
        } catch {
          if (seq !== aramaSeq.current) return;
          setOneriler([]);
        } finally {
          if (seq === aramaSeq.current) setAraniyor(false);
        }
      })();
    }, 160);

    return () => clearTimeout(t);
  }, [arama]);

  const listeYenile = useCallback(async (q?: string) => {
    setListeYukleniyor(true);
    try {
      const list = await AiMuzikAdminKullaniciAra({
        query: q,
        limit: 40,
      });
      setListe(list);
    } finally {
      setListeYukleniyor(false);
    }
  }, []);

  const bakiyeleriYenile = useCallback(async () => {
    const mevcut = secililerRef.current;
    if (mevcut.length === 0) return;
    const guncel = await Promise.all(
      mevcut.map(async (s) => {
        try {
          const bal = await AiMuzikAdminKullaniciBakiyesi(s.user_id);
          return {
            ...s,
            available_seconds: bal.ok
              ? Number(bal.available_seconds ?? 0)
              : s.available_seconds,
            reserved_seconds: bal.ok
              ? Number(bal.reserved_seconds ?? 0)
              : s.reserved_seconds,
          };
        } catch {
          return s;
        }
      }),
    );
    setSecililer(guncel);
  }, []);

  useEffect(() => {
    if (yenileToken > 0) {
      void bakiyeleriYenile();
      if (tumListeAcikRef.current) void listeYenile();
    }
  }, [yenileToken, listeYenile, bakiyeleriYenile]);

  const tumunuAc = () => {
    setTumListeAcik(true);
    void listeYenile();
  };

  const tumunuKapat = () => {
    setTumListeAcik(false);
    setListe([]);
  };

  const ekleSecili = async (k: AdminKullaniciOneriSatiri | AiMuzikAdminBakiyeKullanici) => {
    const id = 'user_id' in k ? k.user_id : k.id;
    if (seciliIds.includes(id)) return;

    let available = 0;
    let reserved = 0;
    let lifetime = 0;
    let tracks = 0;
    let publicId: string | null = null;
    let avatar = k.avatar_url;
    let username = k.username;
    let display = k.display_name;

    if ('available_seconds' in k) {
      available = k.available_seconds;
      reserved = k.reserved_seconds;
      lifetime = k.lifetime_granted_seconds;
      tracks = k.track_count;
      publicId = k.public_user_id;
    } else {
      try {
        const [bal, ara] = await Promise.all([
          AiMuzikAdminKullaniciBakiyesi(id),
          AiMuzikAdminKullaniciAra({ query: id, limit: 1 }),
        ]);
        available = bal.ok ? Number(bal.available_seconds ?? 0) : 0;
        reserved = bal.ok ? Number(bal.reserved_seconds ?? 0) : 0;
        const hit = ara.find((u) => u.user_id === id) ?? ara[0];
        if (hit) {
          lifetime = hit.lifetime_granted_seconds;
          tracks = hit.track_count;
          publicId = hit.public_user_id;
          avatar = hit.avatar_url ?? avatar;
          username = hit.username ?? username;
          display = hit.display_name ?? display;
          available = hit.available_seconds;
          reserved = hit.reserved_seconds;
        }
      } catch {
        /* bakiye yoksa 0 kalır */
      }
    }

    setSecililer((prev) => [
      ...prev,
      {
        user_id: id,
        username,
        display_name: display,
        avatar_url: avatar,
        public_user_id: publicId,
        available_seconds: available,
        reserved_seconds: reserved,
        lifetime_granted_seconds: lifetime,
        track_count: tracks,
      },
    ]);
    setArama('');
    setOneriler([]);
  };

  const cikarSecili = (userId: string) => {
    setSecililer((prev) => prev.filter((s) => s.user_id !== userId));
  };

  const toggleListe = (u: AiMuzikAdminBakiyeKullanici) => {
    if (seciliIds.includes(u.user_id)) {
      cikarSecili(u.user_id);
    } else {
      void ekleSecili(u);
    }
  };

  const dakikaSn = () => {
    const dk = Number(dakikaMetin.replace(',', '.'));
    if (!Number.isFinite(dk) || dk <= 0) return 0;
    return Math.round(dk * 60);
  };

  const dakikaUygula = (isaret: 1 | -1) => {
    const sn = dakikaSn() * isaret;
    if (sn === 0) {
      Alert.alert(t('aiMuzik.admin.alertDakika'), t('aiMuzik.admin.dakikaGecersiz'));
      return;
    }
    const reason = sebep.trim() || t('aiMuzik.admin.sebepVarsayilan');
    if (reason.length < 3) {
      Alert.alert(t('aiMuzik.admin.alertSebep'), t('aiMuzik.admin.sebepMin'));
      return;
    }
    if (seciliIds.length === 0) {
      Alert.alert(t('aiMuzik.admin.alertSecim'), t('aiMuzik.admin.enAzBir'));
      return;
    }

    Alert.alert(
      isaret > 0 ? t('aiMuzik.admin.dakikaEkle') : t('aiMuzik.admin.dakikaEksilt'),
      t('aiMuzik.admin.onayBody', {
        n: seciliIds.length,
        dk: Math.abs(sn / 60),
        yon:
          isaret > 0
            ? t('aiMuzik.admin.yonEklenecek')
            : t('aiMuzik.admin.yonEksiltilecek'),
      }),
      [
        { text: t('ortak.iptal'), style: 'cancel' },
        {
          text: t('aiMuzik.admin.uygula'),
          onPress: () => {
            void (async () => {
              setIslemYapiliyor(true);
              try {
                const r =
                  seciliIds.length === 1
                    ? await AiMuzikAdminBakiyeAyarla(
                        seciliIds[0]!,
                        sn,
                        reason,
                      ).then((x) => ({
                        ok: x.ok,
                        success_count: x.ok ? 1 : 0,
                        fail_count: x.ok ? 0 : 1,
                        hata: x.hata,
                      }))
                    : await AiMuzikAdminBakiyeTopluAyarla(
                        seciliIds,
                        sn,
                        reason,
                      );
                if (r.fail_count > 0 && r.success_count === 0) {
                  Alert.alert(
                    t('ortak.islemBasarisiz'),
                    r.hata ?? t('aiMuzik.admin.islemYapilamadi'),
                  );
                } else {
                  Alert.alert(
                    t('ortak.tamam'),
                    t('aiMuzik.admin.sonuc', {
                      ok: r.success_count,
                      fail: r.fail_count
                        ? t('aiMuzik.admin.sonucHata', { n: r.fail_count })
                        : '',
                    }),
                  );
                }
                await Promise.all([
                  bakiyeleriYenile(),
                  tumListeAcikRef.current ? listeYenile() : Promise.resolve(),
                ]);
              } finally {
                setIslemYapiliyor(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.kok}>
      <View style={styles.heroKart}>
        <Text style={styles.heroBaslik}>{t('aiMuzik.admin.dakikaEkle')}</Text>
        <Text style={styles.heroAlt}>{t('aiMuzik.admin.heroAlt')}</Text>

        <Text style={styles.etiket}>{t('aiMuzik.admin.etiketDakika')}</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={dakikaMetin}
          onChangeText={setDakikaMetin}
          placeholder="7"
          placeholderTextColor={RenkTokenlari.textDim}
          editable={!islemYapiliyor}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetRow}
        >
          {DAKIKA_PRESET.map((d) => (
            <Pressable
              key={d}
              style={[
                styles.presetChip,
                dakikaMetin === String(d) && styles.presetChipAktif,
              ]}
              onPress={() => setDakikaMetin(String(d))}
              disabled={islemYapiliyor}
            >
              <Text
                style={[
                  styles.presetYazi,
                  dakikaMetin === String(d) && styles.presetYaziAktif,
                ]}
              >
                {t('aiMuzik.dk', { n: d })}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.etiket}>{t('aiMuzik.admin.etiketSebep')}</Text>
        <TextInput
          style={styles.input}
          value={sebep}
          onChangeText={setSebep}
          placeholder={t('aiMuzik.admin.sebepVarsayilan')}
          placeholderTextColor={RenkTokenlari.textDim}
          editable={!islemYapiliyor}
        />

        <View style={styles.aksiyonRow}>
          <Pressable
            style={[
              styles.aksiyonBtn,
              styles.ekleBtn,
              islemYapiliyor && styles.disabled,
            ]}
            disabled={islemYapiliyor}
            onPress={() => dakikaUygula(1)}
          >
            <Ionicons name="add" size={18} color={RenkTokenlari.textOnPrimary} />
            <Text style={styles.aksiyonYazi}>
              {t('aiMuzik.admin.ekleN', { n: seciliIds.length })}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.aksiyonBtn,
              styles.eksiltBtn,
              islemYapiliyor && styles.disabled,
            ]}
            disabled={islemYapiliyor}
            onPress={() => dakikaUygula(-1)}
          >
            <Ionicons name="remove" size={18} color="#fff" />
            <Text style={styles.aksiyonYazi}>
              {t('aiMuzik.admin.eksiltN', { n: seciliIds.length })}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.aramaKart}>
        <Text style={styles.bolumBaslik}>{t('aiMuzik.admin.profilAra')}</Text>
        <Text style={styles.bolumAlt}>{t('aiMuzik.admin.profilAraAlt')}</Text>

        <View style={styles.aramaKutu}>
          <Ionicons name="search" size={16} color={RenkTokenlari.textDim} />
          <TextInput
            style={styles.aramaInput}
            placeholder={t('aiMuzik.admin.aramaPh')}
            placeholderTextColor={RenkTokenlari.textDim}
            value={arama}
            onChangeText={setArama}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            editable={!islemYapiliyor}
          />
          {araniyor ? (
            <ActivityIndicator size="small" color={RenkTokenlari.primarySoft} />
          ) : arama ? (
            <Pressable
              onPress={() => {
                setArama('');
                setOneriler([]);
              }}
              hitSlop={8}
            >
              <Ionicons
                name="close-circle"
                size={16}
                color={RenkTokenlari.textDim}
              />
            </Pressable>
          ) : null}
        </View>

        {oneriler.length > 0 ? (
          <View style={styles.oneriListe}>
            {oneriler.map((k, i) => {
              const ad = OneriAdi(k);
              const secili = seciliIds.includes(k.id);
              return (
                <Pressable
                  key={k.id}
                  style={({ pressed }) => [
                    styles.oneriSatir,
                    i > 0 && styles.satirCizgi,
                    secili && styles.oneriSecili,
                    pressed && { opacity: 0.88 },
                  ]}
                  onPress={() => void ekleSecili(k)}
                  disabled={secili || islemYapiliyor}
                >
                  <Avatar url={k.avatar_url} ad={ad} size={40} />
                  <View style={styles.oneriMetin}>
                    <Text style={styles.oneriAd} numberOfLines={1}>
                      {ad}
                    </Text>
                    {k.username ? (
                      <Text style={styles.oneriUser} numberOfLines={1}>
                        @{k.username}
                      </Text>
                    ) : null}
                  </View>
                  {secili ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={RenkTokenlari.mint}
                    />
                  ) : (
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color={RenkTokenlari.primarySoft}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {!araniyor && arama.trim().length >= 1 && oneriler.length === 0 ? (
          <Text style={styles.bosOneri}>{t('aiMuzik.admin.eslesenYok')}</Text>
        ) : null}

        {secililer.length > 0 ? (
          <View style={styles.seciliBolum}>
            <View style={styles.seciliBaslikRow}>
              <Text style={styles.bolumBaslik}>
                {t('aiMuzik.admin.secilenN', { n: secililer.length })}
              </Text>
              <Pressable onPress={() => setSecililer([])} hitSlop={8}>
                <Text style={styles.link}>{t('aiMuzik.temizle')}</Text>
              </Pressable>
            </View>
            {secililer.map((u) => {
              const ad = kisiAdi(u, t('ortak.kullanici'));
              return (
                <View key={u.user_id} style={styles.seciliSatir}>
                  <Avatar url={u.avatar_url} ad={ad} size={44} />
                  <View style={styles.oneriMetin}>
                    <Text style={styles.oneriAd} numberOfLines={1}>
                      {ad}
                    </Text>
                    <Text style={styles.bakiyeYazi}>
                      {t('aiMuzik.admin.kalan', {
                        sure: DakikaEtiket(u.available_seconds),
                      })}
                      {u.username ? ` · @${u.username}` : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => cikarSecili(u.user_id)}
                    hitSlop={8}
                    style={styles.cikarBtn}
                  >
                    <Ionicons
                      name="close"
                      size={16}
                      color={RenkTokenlari.textMuted}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      {!tumListeAcik ? (
        <Pressable style={styles.tumunuBtn} onPress={tumunuAc}>
          <Ionicons
            name="people-outline"
            size={18}
            color={RenkTokenlari.primarySoft}
          />
          <Text style={styles.tumunuBtnYazi}>{t('ortak.tumunuGor')}</Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={RenkTokenlari.textDim}
          />
        </Pressable>
      ) : (
        <>
          <View style={styles.listeBaslikRow}>
            <Text style={styles.bolumBaslik}>{t('aiMuzik.admin.tumKullanicilar')}</Text>
            <View style={styles.listeAksiyonlar}>
              <Pressable
                onPress={() => void listeYenile()}
                hitSlop={8}
                disabled={listeYukleniyor}
              >
                <Text style={styles.link}>{t('ortak.yenile')}</Text>
              </Pressable>
              <Pressable onPress={tumunuKapat} hitSlop={8}>
                <Text style={styles.link}>{t('aiMuzik.admin.gizle')}</Text>
              </Pressable>
            </View>
          </View>

          {listeYukleniyor && liste.length === 0 ? (
            <ActivityIndicator
              color={RenkTokenlari.primarySoft}
              style={{ marginVertical: 16 }}
            />
          ) : null}

          {liste.map((u) => {
            const ad = kisiAdi(u, t('ortak.kullanici'));
            const secili = seciliIds.includes(u.user_id);
            return (
              <Pressable
                key={u.user_id}
                style={[styles.kisiKart, secili && styles.kisiKartSecili]}
                onPress={() => toggleListe(u)}
                onLongPress={() => onKullaniciDetay?.(u.user_id)}
              >
                <Avatar url={u.avatar_url} ad={ad} size={48} />
                <View style={styles.oneriMetin}>
                  <Text style={styles.oneriAd} numberOfLines={1}>
                    {ad}
                  </Text>
                  <Text style={styles.oneriUser} numberOfLines={1}>
                    {u.username ? `@${u.username}` : '—'}
                    {u.public_user_id
                      ? ` · ${t('aiMuzik.admin.idEtiket', { id: u.public_user_id })}`
                      : ''}
                  </Text>
                  <Text style={styles.bakiyeYazi}>
                    {t('aiMuzik.admin.kalanSure', {
                      sure: SureFormat(u.available_seconds),
                    })}
                    {u.track_count
                      ? ` · ${t('aiMuzik.admin.muzikN', { n: u.track_count })}`
                      : ''}
                  </Text>
                </View>
                <View style={[styles.check, secili && styles.checkAktif]}>
                  {secili ? (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={RenkTokenlari.textOnPrimary}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}

          {!listeYukleniyor && liste.length === 0 ? (
            <Text style={styles.bosOneri}>{t('aiMuzik.admin.henuzKayitYok')}</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kok: { gap: BoslukTokenlari.md },
  heroKart: {
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: BoslukTokenlari.sm,
    ...GolgeTokenlari.card,
  },
  heroBaslik: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  heroAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginBottom: 4,
  },
  etiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  input: {
    backgroundColor: RenkTokenlari.bgElevated,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: RenkTokenlari.text,
    ...TipografiTokenlari.body,
  },
  presetRow: {
    gap: 8,
    paddingVertical: 4,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  presetChipAktif: {
    backgroundColor: RenkTokenlari.primary,
    borderColor: RenkTokenlari.primary,
  },
  presetYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  presetYaziAktif: {
    color: RenkTokenlari.textOnPrimary,
  },
  aksiyonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  aksiyonBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: YaricapTokenlari.md,
  },
  ekleBtn: {
    backgroundColor: RenkTokenlari.primary,
  },
  eksiltBtn: {
    backgroundColor: RenkTokenlari.danger,
  },
  aksiyonYazi: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '800',
  },
  disabled: { opacity: 0.5 },
  aramaKart: {
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 8,
  },
  bolumBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontSize: 16,
  },
  bolumAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginBottom: 4,
  },
  aramaKutu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  aramaInput: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    flex: 1,
    paddingVertical: 13,
  },
  oneriListe: {
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgElevated,
    overflow: 'hidden',
    marginTop: 4,
  },
  oneriSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  oneriSecili: {
    backgroundColor: `${RenkTokenlari.mint}14`,
  },
  satirCizgi: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
  },
  oneriMetin: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  oneriAd: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  oneriUser: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  bakiyeYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '600',
  },
  bosOneri: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    paddingVertical: 6,
  },
  seciliBolum: {
    marginTop: 8,
    gap: 8,
  },
  seciliBaslikRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seciliSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
  },
  cikarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.bgElevated,
  },
  link: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  listeBaslikRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  listeAksiyonlar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  tumunuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  tumunuBtnYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
    flex: 1,
  },
  kisiKart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  kisiKartSecili: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: `${RenkTokenlari.primarySoft}14`,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: RenkTokenlari.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkAktif: {
    backgroundColor: RenkTokenlari.primary,
    borderColor: RenkTokenlari.primary,
  },
});
