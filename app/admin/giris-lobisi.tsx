import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { GaleriAc } from '../../src/ortak/medya/ImagePickerHazirMi';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { GradientButton } from '../../src/components/GradientButton';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminGirisLobisiIslemleri } from '../../src/moduller/giris-lobisi/islemler/AdminGirisLobisiIslemleri';
import {
  VARSAYILAN_GIRIS_LOBISI_AYAR,
  type GirisLobisiAyar,
  type GirisLobisiMedya,
  type GirisLobisiPublic,
} from '../../src/moduller/giris-lobisi/tipler';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { MedyaUriGuvenli } from '../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

export default function AdminGirisLobisiEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [data, setData] = useState<GirisLobisiPublic>({
    ayar: VARSAYILAN_GIRIS_LOBISI_AYAR,
    medya: [],
  });
  const [ayar, setAyar] = useState<GirisLobisiAyar>(VARSAYILAN_GIRIS_LOBISI_AYAR);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [medyaYukleniyor, setMedyaYukleniyor] = useState(false);

  const yukle = useCallback(async () => {
    if (!admin) return;
    setYukleniyor(true);
    try {
      const d = await AdminGirisLobisiIslemleri.getir();
      setData(d);
      setAyar(d.ayar);
    } catch (e) {
      Alert.alert(
        'Giriş lobisi',
        e instanceof Error ? e.message : 'Yüklenemedi. Migration 084 çalıştırıldı mı?',
      );
    } finally {
      setYukleniyor(false);
    }
  }, [admin]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  if (!admin) {
    return (
      <Screen>
        <EkranBasligi title="Giriş lobisi" fallbackHref="/admin" />
        <Text style={styles.uyari}>Admin yetkisi gerekli.</Text>
      </Screen>
    );
  }

  const kaydet = async () => {
    setKaydediyor(true);
    try {
      const d = await AdminGirisLobisiIslemleri.ayarGuncelle(ayar);
      setData(d);
      setAyar(d.ayar);
      Alert.alert('Kaydedildi', 'Giriş lobisi metinleri anında güncellendi.');
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Kayıt başarısız');
    } finally {
      setKaydediyor(false);
    }
  };

  /** Gizleme anahtarları — switch ile anında canlıya */
  const gizleAnindaKaydet = async (
    alan: 'sosyal_medya_gizle' | 'tum_butonlar_gizle',
    deger: boolean,
  ) => {
    const onceki = ayar;
    const sonraki = { ...ayar, [alan]: deger };
    setAyar(sonraki);
    try {
      const d = await AdminGirisLobisiIslemleri.ayarGuncelle({ [alan]: deger });
      setData(d);
      setAyar(d.ayar);
    } catch (e) {
      setAyar(onceki);
      Alert.alert('Hata', e instanceof Error ? e.message : 'Güncellenemedi');
    }
  };

  const medyaSec = async (tur: 'video' | 'image') => {
    const secim = await GaleriAc({
      mediaTypes: tur === 'video' ? ['videos'] : ['images'],
      videoMaxDuration: 120,
    });
    if (!secim.ok) {
      if (!secim.iptal) Alert.alert('Medya', secim.hata);
      return;
    }
    const asset = secim.asset;
    setMedyaYukleniyor(true);
    try {
      const d = await AdminGirisLobisiIslemleri.medyaYukle({
        uri: asset.uri,
        mime: asset.mimeType,
        tur,
      });
      setData(d);
      Alert.alert(
        'Yüklendi',
        tur === 'video'
          ? 'Eski medya kaldırıldı. Yeni video giriş lobisinde anında oynar (build yok).'
          : 'Eski medya kaldırıldı. Yeni resim giriş lobisinde anında görünür.',
      );
    } catch (e) {
      Alert.alert('Yükleme', e instanceof Error ? e.message : 'Başarısız');
    } finally {
      setMedyaYukleniyor(false);
    }
  };

  const medyaSil = (m: GirisLobisiMedya) => {
    Alert.alert('Sil', 'Bu medya kaldırılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              const d = await AdminGirisLobisiIslemleri.medyaSil(m.id);
              setData(d);
            } catch (e) {
              Alert.alert('Hata', e instanceof Error ? e.message : 'Silinemedi');
            }
          })();
        },
      },
    ]);
  };

  const hepsiniSil = () => {
    Alert.alert(
      'Tüm medya',
      'Tüm video/resimler silinsin mi? Lobide modern arka plan kalır.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const d = await AdminGirisLobisiIslemleri.medyaHepsiniSil();
                setData(d);
              } catch (e) {
                Alert.alert('Hata', e instanceof Error ? e.message : 'Silinemedi');
              }
            })();
          },
        },
      ],
    );
  };

  const aktifMedya = data.medya.filter((m) => m.aktif !== false);

  return (
    <Screen>
      <EkranBasligi title="Giriş lobisi" fallbackHref="/admin" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={yukleniyor} onRefresh={() => void yukle()} />
        }
      >
        <Text style={styles.bolum}>Arka plan medya</Text>
        <Text style={styles.ipucu}>
          Video veya resim yükle → eski medya kalkar, yenisi anında lobide tam
          ekran. Hepsi silinirse modern gradient kalır. Build gerekmez.
        </Text>

        <View style={styles.rowBtn}>
          <GradientButton
            title={medyaYukleniyor ? 'Yükleniyor…' : 'Video ekle / değiştir'}
            onPress={() => void medyaSec('video')}
            loading={medyaYukleniyor}
            style={styles.flexBtn}
          />
          <GradientButton
            title="Resim ekle"
            variant="ghost"
            onPress={() => void medyaSec('image')}
            disabled={medyaYukleniyor}
            style={styles.flexBtn}
          />
        </View>

        {aktifMedya.length === 0 ? (
          <View style={styles.bosKart}>
            <Text style={styles.bosYazi}>Medya yok → modern arka plan</Text>
          </View>
        ) : (
          aktifMedya.map((m) => (
            <View key={m.id} style={styles.medyaKart}>
              {m.tur === 'image' && MedyaUriGuvenli(m.public_url) ? (
                <Image source={{ uri: MedyaUriGuvenli(m.public_url)! }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbVideo]}>
                  <Ionicons name="videocam" size={28} color="#fff" />
                </View>
              )}
              <View style={styles.medyaCopy}>
                <Text style={styles.medyaTur}>
                  {m.tur === 'video' ? 'Video' : 'Resim'} · aktif
                </Text>
                <Text style={styles.medyaUrl} numberOfLines={2}>
                  {m.public_url}
                </Text>
              </View>
              <Pressable onPress={() => medyaSil(m)} hitSlop={8}>
                <Ionicons name="trash" size={22} color={RenkTokenlari.danger} />
              </Pressable>
            </View>
          ))
        )}

        {aktifMedya.length > 0 ? (
          <Pressable onPress={hepsiniSil} style={styles.silHepsi}>
            <Text style={styles.silHepsiYazi}>Tüm medyayı sil</Text>
          </Pressable>
        ) : null}

        <Text style={styles.bolum}>Lobide gösterilecekler</Text>
        <Text style={styles.ipucu}>
          Varsayılan: logo / isim / slogan kapalı. İstediklerini aç ve metni yaz.
        </Text>

        <SatirSwitch
          etiket="Logo göster"
          deger={ayar.logo_goster}
          onDegis={(v) => setAyar((a) => ({ ...a, logo_goster: v }))}
        />
        {ayar.logo_goster ? (
          <>
            <Alan
              etiket="Logo harfi (URL yoksa)"
              deger={ayar.logo_harf}
              onDegis={(t) => setAyar((a) => ({ ...a, logo_harf: t }))}
            />
            <Alan
              etiket="Logo resim URL (opsiyonel)"
              deger={ayar.logo_url ?? ''}
              onDegis={(t) => setAyar((a) => ({ ...a, logo_url: t || null }))}
              autoCapitalize="none"
            />
          </>
        ) : null}

        <SatirSwitch
          etiket="Marka adı göster"
          deger={ayar.marka_goster}
          onDegis={(v) => setAyar((a) => ({ ...a, marka_goster: v }))}
        />
        {ayar.marka_goster ? (
          <Alan
            etiket="Marka adı"
            deger={ayar.marka_adi ?? ''}
            onDegis={(t) => setAyar((a) => ({ ...a, marka_adi: t || null }))}
          />
        ) : null}

        <SatirSwitch
          etiket="Slogan göster"
          deger={ayar.slogan_goster}
          onDegis={(v) => setAyar((a) => ({ ...a, slogan_goster: v }))}
        />
        {ayar.slogan_goster ? (
          <Alan
            etiket="Slogan"
            deger={ayar.slogan ?? ''}
            onDegis={(t) => setAyar((a) => ({ ...a, slogan: t || null }))}
          />
        ) : null}

        <Alan
          etiket="Üst metin (opsiyonel)"
          deger={ayar.ust_metin ?? ''}
          onDegis={(t) => setAyar((a) => ({ ...a, ust_metin: t || null }))}
        />
        <Alan
          etiket="Form başlığı"
          deger={ayar.form_baslik}
          onDegis={(t) => setAyar((a) => ({ ...a, form_baslik: t }))}
        />
        <Alan
          etiket="Form alt yazı"
          deger={ayar.form_alt ?? ''}
          onDegis={(t) => setAyar((a) => ({ ...a, form_alt: t || null }))}
        />

        <Text style={styles.bolum}>Buton görünürlüğü</Text>
        <Text style={styles.ipucu}>
          Anahtarlar anında kaydedilir; lobideki cihazlar realtime ile güncellenir.
          Build gerekmez.
        </Text>

        <SatirSwitch
          etiket="Sosyal medya giriş butonlarını gizle"
          aciklama="Spotify, Twitch, X, Google, Apple"
          deger={ayar.sosyal_medya_gizle}
          onDegis={(v) => void gizleAnindaKaydet('sosyal_medya_gizle', v)}
        />
        <SatirSwitch
          etiket="Lobideki tüm butonları gizle"
          aciklama="Form, sosyal, kayıt, misafir, oturum geçmişi"
          deger={ayar.tum_butonlar_gizle}
          onDegis={(v) => void gizleAnindaKaydet('tum_butonlar_gizle', v)}
        />

        <GradientButton
          title={kaydediyor ? 'Kaydediliyor…' : 'Metinleri kaydet'}
          onPress={() => void kaydet()}
          loading={kaydediyor}
        />

        {yukleniyor ? (
          <ActivityIndicator color={RenkTokenlari.primary} style={{ marginTop: 16 }} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function SatirSwitch({
  etiket,
  aciklama,
  deger,
  onDegis,
}: {
  etiket: string;
  aciklama?: string;
  deger: boolean;
  onDegis: (v: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchMetin}>
        <Text style={styles.switchEtiket}>{etiket}</Text>
        {aciklama ? (
          <Text style={styles.switchAciklama}>{aciklama}</Text>
        ) : null}
      </View>
      <Switch
        value={deger}
        onValueChange={onDegis}
        trackColor={{
          false: RenkTokenlari.border,
          true: RenkTokenlari.primary,
        }}
      />
    </View>
  );
}

function Alan({
  etiket,
  deger,
  onDegis,
  autoCapitalize,
}: {
  etiket: string;
  deger: string;
  onDegis: (t: string) => void;
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={styles.alan}>
      <Text style={styles.alanEtiket}>{etiket}</Text>
      <TextInput
        value={deger}
        onChangeText={onDegis}
        style={styles.input}
        placeholderTextColor={RenkTokenlari.textDim}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  uyari: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    padding: BoslukTokenlari.xl,
  },
  content: {
    paddingHorizontal: BoslukTokenlari.xl,
    paddingBottom: 48,
    gap: BoslukTokenlari.md,
  },
  bolum: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    marginTop: BoslukTokenlari.lg,
  },
  ipucu: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginTop: -4,
  },
  rowBtn: { flexDirection: 'row', gap: 10 },
  flexBtn: { flex: 1 },
  bosKart: {
    padding: 16,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  bosYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  medyaKart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.surface,
  },
  thumbVideo: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,64,145,0.35)',
  },
  medyaCopy: { flex: 1, minWidth: 0, gap: 4 },
  medyaTur: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  medyaUrl: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  silHepsi: { alignSelf: 'center', paddingVertical: 8 },
  silHepsiYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.danger,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 12,
  },
  switchMetin: { flex: 1, gap: 2 },
  switchEtiket: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
  },
  switchAciklama: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  alan: { gap: 6 },
  alanEtiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  input: {
    minHeight: 48,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 14,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    color: RenkTokenlari.text,
    ...TipografiTokenlari.body,
  },
});
