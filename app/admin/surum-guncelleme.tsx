import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminSurumDenetimi,
  AdminSurumKaydet,
  AdminSurumListesi,
  BosPolitika,
  type AdminSurumPolitikasi,
  type SurumDenetim,
  type SurumPlatformu,
} from '../../src/moduller/admin/surum/AdminSurumPolitikasi';
import { GuncellemeEkrani } from '../../src/moduller/surum-politikasi/bilesenler/GuncellemeEkrani';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const PLATFORMLAR: { key: SurumPlatformu; marka: string; alt: string }[] = [
  { key: 'ios', marka: 'APPLE / iOS', alt: 'App Store' },
  { key: 'android', marka: 'ANDROID / Google Play', alt: 'Google Play' },
];

export default function AdminSurumGuncellemeEkrani() {
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [formlar, setFormlar] = useState<Record<SurumPlatformu, AdminSurumPolitikasi>>({
    ios: BosPolitika('ios'),
    android: BosPolitika('android'),
  });
  const [kaynakForce, setKaynakForce] = useState<Record<SurumPlatformu, boolean>>({
    ios: false,
    android: false,
  });
  const [denetim, setDenetim] = useState<Record<SurumPlatformu, SurumDenetim[]>>({
    ios: [],
    android: [],
  });
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydeden, setKaydeden] = useState<SurumPlatformu | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [onizleme, setOnizleme] = useState<SurumPlatformu | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const liste = await AdminSurumListesi();
      const sonraki = {
        ios: liste.find((p) => p.platform === 'ios') ?? BosPolitika('ios'),
        android: liste.find((p) => p.platform === 'android') ?? BosPolitika('android'),
      };
      setFormlar(sonraki);
      setKaynakForce({
        ios: sonraki.ios.forceUpdate,
        android: sonraki.android.forceUpdate,
      });
      const [iosD, androidD] = await Promise.all([
        AdminSurumDenetimi('ios').catch(() => [] as SurumDenetim[]),
        AdminSurumDenetimi('android').catch(() => [] as SurumDenetim[]),
      ]);
      setDenetim({ ios: iosD, android: androidD });
    } catch {
      setHata('Politikalar okunamadı.');
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!admin) {
        router.replace('/(tabs)/profile');
        return;
      }
      void yukle();
    }, [admin, yukle]),
  );

  if (!admin) return null;

  const guncelle = (platform: SurumPlatformu, parca: Partial<AdminSurumPolitikasi>) => {
    setFormlar((eski) => ({ ...eski, [platform]: { ...eski[platform], ...parca } }));
  };

  const kaydet = (platform: SurumPlatformu) => {
    const form = formlar[platform];
    const aciliyor = !kaynakForce[platform] && form.forceUpdate;
    const gonder = () => {
      void (async () => {
        setKaydeden(platform);
        setHata(null);
        const sonuc = await AdminSurumKaydet(form);
        setKaydeden(null);
        if (!sonuc.ok) {
          setHata(sonuc.hata);
          return;
        }
        await yukle();
      })();
    };
    if (!aciliyor) {
      gonder();
      return;
    }
    Alert.alert(
      'Zorunlu güncelleme',
      'Zorunlu güncellemeyi etkinleştirmek üzeresiniz.\n\nMinimum sürümün altındaki kullanıcılar Tamuso’ya giremeyecek ve mağazaya yönlendirilecektir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Etkinleştir', style: 'destructive', onPress: gonder },
      ],
    );
  };

  const onizlenen = onizleme ? formlar[onizleme] : null;

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Sürüm ve güncelleme"
        subtitle="Uygulama yönetimi"
      />
      <ScrollView contentContainerStyle={AdminStil.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.giris}>
          iOS ve Android ayrı politikadır. Zorunlu güncellemeyi kapatmak yeni bir uygulama
          sürümü gerektirmez.
        </Text>
        {hata ? <Text style={styles.hata}>{hata}</Text> : null}
        {yukleniyor ? <ActivityIndicator color={RenkTokenlari.primarySoft} /> : null}
        {PLATFORMLAR.map((p) => (
          <PlatformKarti
            key={p.key}
            marka={p.marka}
            alt={p.alt}
            form={formlar[p.key]}
            denetim={denetim[p.key]}
            mesgul={kaydeden === p.key}
            onDegistir={(parca) => guncelle(p.key, parca)}
            onKaydet={() => kaydet(p.key)}
            onOnizle={() => setOnizleme(p.key)}
          />
        ))}
      </ScrollView>
      <Modal
        visible={onizlenen != null}
        animationType="fade"
        onRequestClose={() => setOnizleme(null)}
      >
        {onizlenen ? (
          <GuncellemeEkrani
            baslik={onizlenen.title || 'Yeni sürüm hazır'}
            mesaj={onizlenen.message}
            buton={onizlenen.buttonText || 'Şimdi Güncelle'}
            kuruluSurum={onizlenen.minimumVersion || '1.0.0'}
            hedefSurum={onizlenen.latestVersion || '1.0.0'}
            zorunlu={onizlenen.forceUpdate}
            magazaHatasi={false}
            bakimNotu={onizlenen.maintenanceMessage || undefined}
            onizleme
            onOnizlemeKapat={() => setOnizleme(null)}
            onGuncelle={() => undefined}
            onSonra={
              !onizlenen.forceUpdate && onizlenen.optionalUpdate
                ? () => setOnizleme(null)
                : undefined
            }
          />
        ) : null}
      </Modal>
    </Screen>
  );
}

function PlatformKarti({
  marka,
  alt,
  form,
  denetim,
  mesgul,
  onDegistir,
  onKaydet,
  onOnizle,
}: {
  marka: string;
  alt: string;
  form: AdminSurumPolitikasi;
  denetim: SurumDenetim[];
  mesgul: boolean;
  onDegistir: (parca: Partial<AdminSurumPolitikasi>) => void;
  onKaydet: () => void;
  onOnizle: () => void;
}) {
  return (
    <View style={styles.kart}>
      <Text style={styles.marka}>{marka}</Text>
      <Text style={styles.alt}>{alt}</Text>
      <Alan etiket="Yayınlanan sürüm" deger={form.latestVersion} onChange={(latestVersion) => onDegistir({ latestVersion })} />
      <Alan etiket="Yayınlanan build" deger={form.latestBuild} sayi onChange={(latestBuild) => onDegistir({ latestBuild })} />
      <Alan etiket="Minimum sürüm" deger={form.minimumVersion} onChange={(minimumVersion) => onDegistir({ minimumVersion })} />
      <Alan etiket="Minimum build" deger={form.minimumBuild} sayi onChange={(minimumBuild) => onDegistir({ minimumBuild })} />
      <Anahtar
        etiket="Zorunlu güncelleme"
        acik={form.forceUpdate}
        onChange={(forceUpdate) => onDegistir({ forceUpdate })}
      />
      <Anahtar
        etiket="İsteğe bağlı güncelleme"
        acik={form.optionalUpdate}
        onChange={(optionalUpdate) => onDegistir({ optionalUpdate })}
      />
      <Alan etiket="Başlık" deger={form.title} onChange={(title) => onDegistir({ title })} />
      <Alan etiket="Mesaj" deger={form.message} cokSatir onChange={(message) => onDegistir({ message })} />
      <Alan etiket="Buton" deger={form.buttonText} onChange={(buttonText) => onDegistir({ buttonText })} />
      <Alan
        etiket={form.platform === 'ios' ? 'App Store adresi' : 'Google Play adresi'}
        deger={form.storeUrl}
        onChange={(storeUrl) => onDegistir({ storeUrl })}
      />
      <Alan
        etiket="Bakım notu"
        deger={form.maintenanceMessage}
        cokSatir
        onChange={(maintenanceMessage) => onDegistir({ maintenanceMessage })}
      />
      <Text style={styles.meta}>
        {form.updatedAt
          ? `Güncellendi ${new Date(form.updatedAt).toLocaleString('tr-TR')}${form.updatedByName ? ` · ${form.updatedByName}` : ''}`
          : 'Henüz kayıt yok'}
      </Text>
      <View style={styles.aksiyonlar}>
        <Pressable onPress={onOnizle} style={styles.onizle} accessibilityRole="button">
          <Text style={styles.onizleYazi}>Önizleme</Text>
        </Pressable>
        <Pressable
          onPress={onKaydet}
          disabled={mesgul}
          style={styles.kaydet}
          accessibilityRole="button"
        >
          {mesgul ? (
            <ActivityIndicator color={RenkTokenlari.textOnPrimary} />
          ) : (
            <Text style={styles.kaydetYazi}>Kaydet</Text>
          )}
        </Pressable>
      </View>
      {denetim.length ? (
        <View style={styles.denetim}>
          <Text style={styles.denetimBaslik}>Denetim</Text>
          {denetim.slice(0, 4).map((d) => (
            <Text key={d.id} style={styles.denetimSatir}>
              {d.actorName || 'Admin'} · {d.oldForce ? 'zorunlu' : 'kapalı'} →{' '}
              {d.newForce ? 'zorunlu' : 'kapalı'} · min {d.oldMinimum ?? '—'} → {d.newMinimum ?? '—'}
              {d.storeUrlChanged ? ' · mağaza' : ''}
              {d.messageChanged ? ' · mesaj' : ''}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Alan({
  etiket,
  deger,
  onChange,
  cokSatir,
  sayi,
}: {
  etiket: string;
  deger: string;
  onChange: (v: string) => void;
  cokSatir?: boolean;
  sayi?: boolean;
}) {
  return (
    <View style={styles.alan}>
      <Text style={styles.etiket}>{etiket}</Text>
      <TextInput
        value={deger}
        onChangeText={onChange}
        multiline={cokSatir}
        keyboardType={sayi ? 'number-pad' : 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={RenkTokenlari.textDim}
        style={[styles.girdi, cokSatir ? styles.girdiCok : null]}
      />
    </View>
  );
}

function Anahtar({
  etiket,
  acik,
  onChange,
}: {
  etiket: string;
  acik: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.anahtar}>
      <Text style={styles.etiket}>{etiket}</Text>
      <Switch
        value={acik}
        onValueChange={onChange}
        trackColor={{ false: RenkTokenlari.surface, true: RenkTokenlari.primary }}
        accessibilityLabel={etiket}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  giris: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 20,
  },
  hata: {
    color: RenkTokenlari.danger,
  },
  kart: {
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    padding: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
  },
  marka: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginBottom: BoslukTokenlari.sm,
  },
  alan: { gap: 6 },
  etiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  girdi: {
    color: RenkTokenlari.text,
    backgroundColor: RenkTokenlari.bg,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    paddingHorizontal: BoslukTokenlari.md,
    minHeight: 46,
    paddingVertical: 10,
  },
  girdiCok: { minHeight: 88, textAlignVertical: 'top' },
  anahtar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  meta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  aksiyonlar: {
    flexDirection: 'row',
    gap: BoslukTokenlari.sm,
    marginTop: BoslukTokenlari.sm,
  },
  onizle: {
    flex: 1,
    minHeight: 48,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onizleYazi: { color: RenkTokenlari.text, fontWeight: '600' },
  kaydet: {
    flex: 1,
    minHeight: 48,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kaydetYazi: { color: RenkTokenlari.textOnPrimary, fontWeight: '700' },
  denetim: {
    marginTop: BoslukTokenlari.sm,
    gap: 4,
  },
  denetimBaslik: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    letterSpacing: 0.8,
  },
  denetimSatir: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
});
