import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { AdminStil } from '../../src/moduller/admin/bilesenler/AdminStil';
import { supabase } from '../../src/lib/supabase';
import { AgoraNativeVarMi } from '../../src/moduller/rtc/AgoraMotoru';
import { RtcProviderYukle, type RtcSaglayiciKodu } from '../../src/moduller/rtc/RtcProviderDurumu';
import {
  RtcLiveKitOlcumAl,
  RtcLiveKitYorumu,
  type RtcKalite,
  type RtcLiveKitOlcum,
} from '../../src/moduller/rtc/RtcLiveKitOlcum';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

type Gecmis = {
  previous_provider: string | null;
  new_provider: string;
  reason: string | null;
  config_version: number;
  created_at: string;
};

const AKIS = ['Ses odaları', 'Sesli aramalar', 'Görüntülü aramalar', 'Canlı yayın'];

function saat(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function RtcAltyapiEkrani() {
  const { profile, loading } = useAuth();
  const yetkili = AdminYetkisiVarMi(profile);
  const [aktif, setAktif] = useState<RtcSaglayiciKodu>('LIVEKIT');
  const [surum, setSurum] = useState(1);
  const [gecmis, setGecmis] = useState<Gecmis[]>([]);
  const [olcum, setOlcum] = useState<RtcLiveKitOlcum | null>(null);
  const [modal, setModal] = useState<RtcSaglayiciKodu | null>(null);
  const [kod, setKod] = useState('');
  const [neden, setNeden] = useState('');
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    const [d, o] = await Promise.all([
      RtcProviderYukle(),
      RtcLiveKitOlcumAl(),
    ]);
    setAktif(d.active_provider);
    setSurum(d.version);
    setOlcum(o);
    const { data, error } = await supabase.rpc('rtc_provider_gecmis');
    if (!error && Array.isArray(data)) setGecmis(data as Gecmis[]);
    setYukleniyor(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (yetkili) void yukle();
    }, [yetkili, yukle]),
  );

  const degistir = async () => {
    if (!modal || busy) return;
    setBusy(true);
    setHata(null);
    setMesaj(null);
    const { data, error } = await supabase.rpc('rtc_provider_degistir', {
      p_hedef: modal,
      p_kod: kod.trim(),
      p_neden: neden.trim(),
      p_beklenen_surum: surum,
    });
    setBusy(false);
    if (error) {
      const m = error.message;
      setHata(
        m.includes('KOD_HATALI')
          ? 'Yetkilendirme parolası yanlış.'
          : m.includes('COOLDOWN')
            ? 'Çok fazla hatalı deneme. Bir süre sonra yeniden dene.'
            : m.includes('Forbidden')
              ? 'Bu işlem için RTC geçiş yetkisi gerekir.'
              : m.includes('VERSION')
                ? 'Ekran güncel değil. Yeniden dene.'
                : 'Değişiklik yapılamadı.',
      );
      return;
    }
    const row = data as { active_provider?: RtcSaglayiciKodu; version?: number };
    setAktif(row.active_provider === 'AGORA' ? 'AGORA' : 'LIVEKIT');
    setSurum(Number(row.version ?? surum + 1));
    setModal(null);
    setKod('');
    setNeden('');
    setMesaj(
      row.active_provider === 'AGORA'
        ? 'RTC sağlayıcısı Agora olarak değiştirildi.'
        : 'RTC sağlayıcısı LiveKit olarak değiştirildi.',
    );
    void yukle();
  };

  if (!loading && !yetkili) {
    return (
      <Screen>
        <EkranBasligi title="RTC altyapısı" fallbackHref={'/admin' as never} />
        <Text style={styles.yasak}>Bu ekran yalnız yöneticiler içindir.</Text>
      </Screen>
    );
  }

  const agoraNative = AgoraNativeVarMi();
  const hedef: RtcSaglayiciKodu = aktif === 'LIVEKIT' ? 'AGORA' : 'LIVEKIT';
  const yorum = yukleniyor && !olcum
    ? { etiket: 'Ölçülüyor' as const, renk: 'sessiz' as const, aciklama: 'LiveKit odaları ve bağlantı kalitesi okunuyor.' }
    : RtcLiveKitYorumu(olcum);
  const renk =
    yorum.renk === 'iyi'
      ? RenkTokenlari.mint
      : yorum.renk === 'dikkat'
        ? RenkTokenlari.warning
        : yorum.renk === 'kotu'
          ? RenkTokenlari.danger
          : RenkTokenlari.textMuted;
  const kalite = olcum?.ok ? olcum.kalite : null;
  const kaliteToplam = kalite
    ? kalite.mukemmel + kalite.iyi + kalite.zayif + kalite.koptu + kalite.yeni + kalite.bilinmiyor
    : 0;
  const token = olcum?.ok ? olcum.token : olcum?.token ?? null;
  const gecisKapali = hedef === 'AGORA' && !agoraNative;

  return (
    <Screen>
      <EkranBasligi title="RTC altyapısı" fallbackHref={'/admin' as never} />
      <ScrollView
        contentContainerStyle={AdminStil.content}
        refreshControl={<RefreshControl refreshing={yukleniyor} onRefresh={() => void yukle()} tintColor={RenkTokenlari.primarySoft} />}
      >
        <View style={[styles.karar, { borderColor: renk }]}>
          <Text style={styles.kucukEtiket}>LIVEKIT ŞU AN</Text>
          <Text style={[styles.kararBaslik, { color: renk }]}>{yorum.etiket}</Text>
          <Text style={styles.kararYazi}>{yorum.aciklama}</Text>
          <Text style={styles.olcumZaman}>
            Ölçüm {olcum?.ok ? saat(olcum.olcum_at) : saat(olcum?.olcum_at)} · aşağı çekerek yenile
          </Text>
        </View>

        {mesaj ? <Text style={styles.ok}>{mesaj}</Text> : null}

        <View style={styles.izgara}>
          <Olcu deger={olcum?.ok ? String(olcum.oda) : '—'} etiket="Açık oda" />
          <Olcu deger={olcum?.ok ? String(olcum.katilimci) : '—'} etiket="Bağlı kişi" />
          <Olcu
            deger={kalite ? String(kalite.zayif + kalite.koptu) : '—'}
            etiket="Zayıf veya kopuk"
            vurgu={kalite != null && kalite.zayif + kalite.koptu > 0 ? renk : undefined}
          />
          <Olcu deger={token ? String(token.son_15dk) : '—'} etiket="Token · 15 dk" />
        </View>

        <View style={styles.kart}>
          <Text style={styles.kartAd}>Bağlantı kalitesi</Text>
          <Text style={styles.kartAlt}>
            LiveKit’in o andaki katılımcı kalitesi. İlk 15 saniye zayıf sayılmaz; sunucu varsayılanı 0 döndürebilir.
          </Text>
          <KaliteBar toplam={kaliteToplam} kalite={kalite} />
          <View style={styles.legend}>
            <Nokta renk="#3DCFB0" ad="Mükemmel" n={kalite?.mukemmel} />
            <Nokta renk="#7AD4C0" ad="İyi" n={kalite?.iyi} />
            <Nokta renk={RenkTokenlari.warning} ad="Zayıf" n={kalite?.zayif} />
            <Nokta renk={RenkTokenlari.danger} ad="Kopuk" n={kalite?.koptu} />
            <Nokta renk={RenkTokenlari.textMuted} ad="Yeni" n={kalite?.yeni} />
          </View>
          {olcum?.ok && olcum.kismi ? (
            <Text style={styles.kartAlt}>Kalite ilk 25 odadan okundu. Oda sayısı daha fazla.</Text>
          ) : null}
          {olcum?.ok && olcum.okunamayan_oda > 0 ? (
            <Text style={styles.kartAlt}>{olcum.okunamayan_oda} odanın katılımcı listesi okunamadı.</Text>
          ) : null}
        </View>

        <View style={styles.kart}>
          <Text style={styles.kartAd}>Token kayıtları</Text>
          <Text style={styles.kartAlt}>
            Bu, bağlantı kalitesi değil. Sunucunun başarıyla yazdığı LiveKit token istekleri.
          </Text>
          <View style={styles.tokenSatir}>
            <Olcu kucuk deger={token ? String(token.son_15dk) : '—'} etiket="15 dk" />
            <Olcu kucuk deger={token ? String(token.son_60dk) : '—'} etiket="1 saat" />
            <Olcu kucuk deger={token ? String(token.son_24s) : '—'} etiket="24 saat" />
          </View>
          <Text style={styles.kartAlt}>
            Son istek {saat(token?.son_istek_at)}
            {token ? ` · 15 dk’da ${token.kisi_15dk} kişi, ${token.oda_15dk} oda` : ''}
          </Text>
        </View>

        <Text style={AdminStil.sectionLabel}>Sağlayıcı</Text>
        <Text style={styles.kartAlt}>Tek seçim bütün ses ve görüntüyü değiştirir. Otomatik geçiş yok.</Text>

        <SaglayiciKart
          ad="LiveKit"
          aktif={aktif === 'LIVEKIT'}
          not={aktif === 'LIVEKIT' ? 'Bütün trafik burada.' : 'Yedek. Geçersen yeni bağlantılar buraya döner.'}
        />
        <SaglayiciKart
          ad="Agora"
          aktif={aktif === 'AGORA'}
          kullanilamaz={aktif !== 'AGORA' && !agoraNative}
          not={
            !agoraNative
              ? 'Bu uygulama sürümünde SDK yok. Geçiş kapalı. Canlı Agora ölçümü de yok.'
              : 'Yedek. Canlı kalite ölçümü yalnız LiveKit’ten geliyor.'
          }
        />

        <Pressable
          style={[styles.birincil, gecisKapali && styles.birincilKapali]}
          onPress={() => {
            if (gecisKapali) return;
            setHata(null);
            setModal(hedef);
          }}
          disabled={gecisKapali}
        >
          <Text style={styles.birincilYazi}>
            {hedef === 'AGORA' ? 'Agora’ya geç' : 'LiveKit’e geri dön'}
          </Text>
        </Pressable>

        <Text style={AdminStil.sectionLabel}>Geçiş geçmişi</Text>
        {gecmis.length === 0 ? (
          <Text style={styles.kartAlt}>Henüz geçiş yok. Üretim hâlâ LiveKit.</Text>
        ) : (
          gecmis.map((g) => (
            <View key={`${g.created_at}-${g.config_version}`} style={styles.gecmis}>
              <Text style={styles.gecmisYol}>
                {g.previous_provider ?? '—'} → {g.new_provider}
              </Text>
              <Text style={styles.kartAlt}>
                {saat(g.created_at)} · sürüm {g.config_version}
                {g.reason ? ` · ${g.reason}` : ''}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modal != null} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <View style={styles.perde}>
          <View style={styles.kutu}>
            <Text style={styles.modalBaslik}>Sağlayıcı değişecek</Text>
            <Text style={styles.modalYol}>
              {aktif} → {modal}
            </Text>
            <Text style={styles.kartAlt}>
              Açık oturumlar aynı kalır. Yalnız ses ve görüntü taşıması yenilenir.
            </Text>
            {AKIS.map((a) => (
              <Text key={a} style={styles.akis}>• {a}</Text>
            ))}
            <Text style={styles.etiket}>Neden</Text>
            <TextInput
              value={neden}
              onChangeText={setNeden}
              placeholder="Kısa neden"
              placeholderTextColor={RenkTokenlari.textMuted}
              style={styles.girdi}
            />
            <Text style={styles.etiket}>Yetkilendirme parolası</Text>
            <TextInput
              value={kod}
              onChangeText={setKod}
              secureTextEntry
              keyboardType="number-pad"
              style={styles.girdi}
            />
            {hata ? <Text style={styles.hata}>{hata}</Text> : null}
            <View style={styles.satirBtn}>
              <Pressable style={styles.ikincil} onPress={() => setModal(null)} disabled={busy}>
                <Text style={styles.ikincilYazi}>İptal</Text>
              </Pressable>
              <Pressable style={styles.birincilModal} onPress={() => void degistir()} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.birincilYazi}>Değiştir</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Olcu({
  deger,
  etiket,
  vurgu,
  kucuk,
}: {
  deger: string;
  etiket: string;
  vurgu?: string;
  kucuk?: boolean;
}) {
  return (
    <View style={[styles.olcu, kucuk && styles.olcuKucuk]}>
      <Text style={[styles.olcuDeger, vurgu ? { color: vurgu } : null]}>{deger}</Text>
      <Text style={styles.olcuEtiket}>{etiket}</Text>
    </View>
  );
}

function KaliteBar({
  toplam,
  kalite,
}: {
  toplam: number;
  kalite: RtcKalite | null;
}) {
  if (!kalite || toplam <= 0) {
    return <View style={styles.barBos} />;
  }
  const dilim = (n: number, renk: string) =>
    n > 0 ? <View key={renk} style={{ flex: n, backgroundColor: renk }} /> : null;
  return (
    <View style={styles.bar}>
      {dilim(kalite.mukemmel, '#3DCFB0')}
      {dilim(kalite.iyi, '#7AD4C0')}
      {dilim(kalite.zayif, RenkTokenlari.warning)}
      {dilim(kalite.koptu, RenkTokenlari.danger)}
      {dilim(kalite.yeni, 'rgba(255,255,255,0.28)')}
      {dilim(kalite.bilinmiyor, 'rgba(255,255,255,0.12)')}
    </View>
  );
}

function Nokta({ renk, ad, n }: { renk: string; ad: string; n?: number }) {
  return (
    <View style={styles.noktaSatir}>
      <View style={[styles.nokta, { backgroundColor: renk }]} />
      <Text style={styles.noktaYazi}>
        {ad} {n ?? '—'}
      </Text>
    </View>
  );
}

function SaglayiciKart({
  ad,
  aktif,
  kullanilamaz,
  not,
}: {
  ad: string;
  aktif: boolean;
  kullanilamaz?: boolean;
  not: string;
}) {
  const durum = aktif ? 'Aktif' : kullanilamaz ? 'Kullanılamıyor' : 'Yedek';
  const renk = aktif ? RenkTokenlari.mint : kullanilamaz ? RenkTokenlari.danger : RenkTokenlari.textMuted;
  return (
    <View style={[styles.saglayici, aktif && styles.saglayiciAktif]}>
      <View style={styles.saglayiciUst}>
        <Text style={styles.kartAd}>{ad}</Text>
        <Text style={[styles.durum, { color: renk }]}>{durum}</Text>
      </View>
      {AKIS.map((a) => (
        <Text key={a} style={styles.akis}>
          {aktif ? '●' : '○'}  {a}
        </Text>
      ))}
      <Text style={styles.kartAlt}>{not}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  karar: {
    borderWidth: 1,
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.lg,
    gap: 6,
    backgroundColor: RenkTokenlari.bgCard,
  },
  kucukEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    letterSpacing: 1.1,
    fontWeight: '700',
  },
  kararBaslik: { ...TipografiTokenlari.title, fontSize: 32 },
  kararYazi: { ...TipografiTokenlari.body, color: RenkTokenlari.text, lineHeight: 22 },
  olcumZaman: { ...TipografiTokenlari.micro, color: RenkTokenlari.textMuted, marginTop: 4 },
  ok: { ...TipografiTokenlari.body, color: RenkTokenlari.mint },
  hata: { ...TipografiTokenlari.caption, color: RenkTokenlari.danger },
  yasak: { color: RenkTokenlari.text, padding: BoslukTokenlari.lg },
  izgara: { flexDirection: 'row', flexWrap: 'wrap', gap: BoslukTokenlari.sm },
  olcu: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    padding: BoslukTokenlari.md,
    gap: 2,
  },
  olcuKucuk: { width: '30%', minWidth: 90 },
  olcuDeger: { ...TipografiTokenlari.title, color: RenkTokenlari.text, fontSize: 26 },
  olcuEtiket: { ...TipografiTokenlari.micro, color: RenkTokenlari.textMuted },
  kart: {
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    padding: BoslukTokenlari.lg,
    gap: 8,
  },
  kartAd: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700', fontSize: 16 },
  kartAlt: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted, lineHeight: 18 },
  bar: {
    height: 10,
    borderRadius: 99,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  barBos: {
    height: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  noktaSatir: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nokta: { width: 8, height: 8, borderRadius: 4 },
  noktaYazi: { ...TipografiTokenlari.micro, color: RenkTokenlari.text },
  tokenSatir: { flexDirection: 'row', gap: BoslukTokenlari.sm },
  saglayici: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.lg,
    gap: 4,
    backgroundColor: RenkTokenlari.bgCard,
  },
  saglayiciAktif: { borderColor: RenkTokenlari.borderAccent },
  saglayiciUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  durum: { ...TipografiTokenlari.caption, fontWeight: '700' },
  akis: { ...TipografiTokenlari.caption, color: RenkTokenlari.text },
  birincil: {
    backgroundColor: RenkTokenlari.primary,
    borderRadius: YaricapTokenlari.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  birincilKapali: { opacity: 0.4 },
  birincilModal: {
    backgroundColor: RenkTokenlari.primary,
    borderRadius: YaricapTokenlari.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    minWidth: 110,
    alignItems: 'center',
  },
  birincilYazi: { color: '#fff', fontWeight: '700' },
  ikincil: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  ikincilYazi: { color: RenkTokenlari.text },
  gecmis: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
    paddingBottom: BoslukTokenlari.sm,
    gap: 2,
  },
  gecmisYol: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '600' },
  perde: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  kutu: {
    backgroundColor: '#16121E',
    borderRadius: YaricapTokenlari.lg,
    padding: BoslukTokenlari.lg,
    gap: 8,
  },
  modalBaslik: { ...TipografiTokenlari.title, color: RenkTokenlari.text, fontSize: 22 },
  modalYol: { ...TipografiTokenlari.body, color: RenkTokenlari.primarySoft, fontWeight: '700' },
  etiket: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted, marginTop: 8 },
  girdi: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    color: RenkTokenlari.text,
    padding: 12,
  },
  satirBtn: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
});
