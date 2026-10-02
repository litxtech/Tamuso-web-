import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { AdminStil } from '../../../src/moduller/admin/bilesenler/AdminStil';
import {
  AdminDuyuruDurum,
  AdminDuyuruGet,
  AdminDuyuruKategoriler,
  AdminDuyuruKategoriKaydet,
  AdminDuyuruKaydet,
  AdminDuyuruKopyala,
  AdminDuyuruMedyaSil,
  AdminDuyuruMedyaYukle,
  type DuyuruKayit,
} from '../../../src/moduller/duyurular/islemler/DuyuruAdminIslemleri';
import { DuyuruZenginMetin } from '../../../src/moduller/duyurular/bilesenler/DuyuruZenginMetin';
import { DUYURU_DILLERI, type DuyuruBelge, type DuyuruBlok, type DuyuruDili } from '../../../src/moduller/duyurular/tipler';
import {
  SesliMesajKayitBaslat,
  SesliMesajKayitBitir,
  SesliMesajKayitIptal,
} from '../../../src/moduller/mesajlasma/ses/SesliMesajKayit';
import { createVideoPlayer } from 'expo-video';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';

const BOS: DuyuruBelge = { blocks: [] };

export default function AdminDuyuruDuzenle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dil, setDil] = useState<DuyuruDili>('tr');
  const [baslik, setBaslik] = useState<Record<string, string>>({});
  const [ozet, setOzet] = useState<Record<string, string>>({});
  const [belge, setBelge] = useState<Record<string, DuyuruBelge>>({});
  const [onizleme, setOnizleme] = useState(false);
  const [severity, setSeverity] = useState<DuyuruKayit['severity']>('NORMAL');
  const [publishAt, setPublishAt] = useState('');
  const [expireAt, setExpireAt] = useState('');
  const [pinned, setPinned] = useState(false);
  const [pinPriority, setPinPriority] = useState('0');
  const [showHome, setShowHome] = useState(false);
  const [homeDisplay, setHomeDisplay] = useState<'CARD' | 'BANNER' | 'CAROUSEL'>('CARD');
  const [showLaunch, setShowLaunch] = useState(false);
  const [launchFreq, setLaunchFreq] = useState<'ONCE_PER_USER' | 'EVERY_APP_OPEN_UNTIL_READ'>('ONCE_PER_USER');
  const [dismissible, setDismissible] = useState(true);
  const [untilRead, setUntilRead] = useState(false);
  const [reactions, setReactions] = useState(false);
  const [comments, setComments] = useState(false);
  const [viewCount, setViewCount] = useState(false);
  const [sendPush, setSendPush] = useState(false);
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [targetMode, setTargetMode] = useState<'all' | 'targeted'>('all');
  const [targetLogic, setTargetLogic] = useState<'AND' | 'OR'>('AND');
  const [ulke, setUlke] = useState('');
  const [platform, setPlatform] = useState('all');
  const [surum, setSurum] = useState('');
  const [kullanicilar, setKullanicilar] = useState('');
  const [sehir, setSehir] = useState('');
  const [dilHedef, setDilHedef] = useState('');
  const [hesapTuru, setHesapTuru] = useState('');
  const [ajans, setAjans] = useState('');
  const [vipMin, setVipMin] = useState('');
  const [seviyeMin, setSeviyeMin] = useState('');
  const [dogrulanmis, setDogrulanmis] = useState('');
  const [yaratici, setYaratici] = useState(false);
  const [ajansUyesi, setAjansUyesi] = useState(false);
  const [kategoriId, setKategoriId] = useState<string | null>(null);
  const [kategoriler, setKategoriler] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [yeniKategori, setYeniKategori] = useState('');
  const [butonMetin, setButonMetin] = useState<Record<string, string>>({});
  const [ctas, setCtas] = useState<Array<{ destination_type: string; hedef: string; etiket: string }>>([]);
  const [medyaBuDil, setMedyaBuDil] = useState(false);
  const [medya, setMedya] = useState<Array<Record<string, unknown>>>([]);
  const [ilerleme, setIlerleme] = useState(0);
  const [kayit, setKayit] = useState(false);

  const yukle = useCallback(async () => {
    if (!id) return;
    const data = await AdminDuyuruGet(id);
    const a = (data.announcement ?? {}) as Record<string, unknown>;
    setSeverity((a.severity as DuyuruKayit['severity']) ?? 'NORMAL');
    setPublishAt(a.publish_at ? String(a.publish_at).slice(0, 16) : '');
    setExpireAt(a.expire_at ? String(a.expire_at).slice(0, 16) : '');
    setPinned(Boolean(a.pinned));
    setPinPriority(String(a.pin_priority ?? 0));
    setShowHome(Boolean(a.show_on_home));
    setHomeDisplay((a.home_display as 'CARD') ?? 'CARD');
    setShowLaunch(Boolean(a.show_on_launch));
    setLaunchFreq((a.launch_frequency as 'ONCE_PER_USER') ?? 'ONCE_PER_USER');
    setDismissible(a.dismissible !== false);
    setUntilRead(Boolean(a.show_until_read));
    setReactions(Boolean(a.allow_reactions));
    setComments(Boolean(a.allow_comments));
    setViewCount(Boolean(a.show_view_count));
    setSendPush(Boolean(a.send_push));
    setPushTitle(String(a.push_title ?? ''));
    setPushBody(String(a.push_body ?? ''));
    setTargetMode(a.target_mode === 'targeted' ? 'targeted' : 'all');
    setTargetLogic(a.target_logic === 'OR' ? 'OR' : 'AND');
    setKategoriId(a.category_id ? String(a.category_id) : null);
    setMedya((data.media as Array<Record<string, unknown>>) ?? []);
    const hedefler = (data.targets as Array<{ dimension: string; values: unknown }>) ?? [];
    const deger = (boyut: string) => {
      const row = hedefler.find((h) => h.dimension === boyut);
      const vals = row?.values;
      if (Array.isArray(vals)) return vals.map(String).join(',');
      if (vals && typeof vals === 'object' && 'min' in (vals as object)) {
        return String((vals as { min?: number }).min ?? '');
      }
      return '';
    };
    setUlke(deger('country'));
    setSehir(deger('city'));
    setDilHedef(deger('language'));
    setSurum(deger('app_version'));
    setKullanicilar(deger('user_ids'));
    setHesapTuru(deger('account_type'));
    setAjans(deger('agency'));
    setVipMin(deger('vip_level'));
    setSeviyeMin(deger('user_level'));
    setDogrulanmis(deger('verified'));
    const plat = deger('platform');
    setPlatform(plat === 'ios' || plat === 'android' ? plat : 'all');
    setYaratici(hedefler.some((h) => h.dimension === 'creator'));
    setAjansUyesi(hedefler.some((h) => h.dimension === 'agency_member'));
    const aksiyonlar = (data.ctas as Array<Record<string, unknown>>) ?? [];
    setCtas(
      aksiyonlar.map((c) => {
        const dest = (c.destination ?? {}) as { id?: string; url?: string; path?: string };
        const labels = (c.labels ?? {}) as Record<string, string>;
        return {
          destination_type: String(c.destination_type ?? 'INTERNAL_ROUTE'),
          hedef: dest.path || dest.id || dest.url || '',
          etiket: labels.tr || labels.en || '',
        };
      }),
    );
    const ceviriler = (data.translations as Array<Record<string, unknown>>) ?? [];
    const b: Record<string, string> = {};
    const o: Record<string, string> = {};
    const d: Record<string, DuyuruBelge> = {};
    const bm: Record<string, string> = {};
    for (const c of ceviriler) {
      const loc = String(c.locale);
      b[loc] = String(c.title ?? '');
      o[loc] = String(c.summary ?? '');
      d[loc] = (c.body_doc as DuyuruBelge) ?? BOS;
      bm[loc] = String(c.button_text ?? '');
    }
    setBaslik(b);
    setOzet(o);
    setBelge(d);
    setButonMetin(bm);
    try {
      setKategoriler(await AdminDuyuruKategoriler());
    } catch {
      setKategoriler([]);
    }
  }, [id]);

  React.useEffect(() => {
    void yukle();
  }, [yukle]);

  const blokEkle = (blok: DuyuruBlok) => {
    setBelge((once) => {
      const mevcut = once[dil] ?? BOS;
      return { ...once, [dil]: { blocks: [...mevcut.blocks, blok] } };
    });
  };

  const payload = (action: 'draft' | 'publish'): DuyuruKayit => {
    const targets = [];
    if (ulke.trim()) targets.push({ dimension: 'country', values: ulke.split(',').map((s) => s.trim()).filter(Boolean) });
    if (platform && platform !== 'all') targets.push({ dimension: 'platform', values: [platform] });
    if (surum.trim()) targets.push({ dimension: 'app_version', values: [surum.trim()] });
    if (kullanicilar.trim()) {
      targets.push({ dimension: 'user_ids', values: kullanicilar.split(',').map((s) => s.trim()).filter(Boolean) });
    }
    const liste = (ham: string) => ham.split(',').map((s) => s.trim()).filter(Boolean);
    if (sehir.trim()) targets.push({ dimension: 'city', values: liste(sehir) });
    if (dilHedef.trim()) targets.push({ dimension: 'language', values: liste(dilHedef) });
    if (hesapTuru.trim()) targets.push({ dimension: 'account_type', values: liste(hesapTuru) });
    if (ajans.trim()) targets.push({ dimension: 'agency', values: liste(ajans) });
    if (vipMin.trim()) targets.push({ dimension: 'vip_level', values: { min: Number(vipMin) || 0 } });
    if (seviyeMin.trim()) targets.push({ dimension: 'user_level', values: { min: Number(seviyeMin) || 1 } });
    if (dogrulanmis === 'true' || dogrulanmis === 'false') {
      targets.push({ dimension: 'verified', values: [dogrulanmis] });
    }
    if (yaratici) targets.push({ dimension: 'creator', values: ['yes'] });
    if (ajansUyesi) targets.push({ dimension: 'agency_member', values: ['yes'] });
    return {
      action,
      category_id: kategoriId,
      severity,
      publish_at: publishAt ? new Date(publishAt).toISOString() : null,
      expire_at: expireAt ? new Date(expireAt).toISOString() : null,
      dismissible,
      show_until_read: untilRead,
      pinned,
      pin_priority: Number(pinPriority) || 0,
      show_on_home: showHome,
      home_display: homeDisplay,
      show_on_launch: showLaunch,
      launch_frequency: launchFreq,
      allow_reactions: reactions,
      allow_comments: comments,
      show_view_count: viewCount,
      send_push: sendPush,
      push_title: pushTitle,
      push_body: pushBody,
      target_mode: targetMode,
      target_logic: targetLogic,
      targets,
      translations: DUYURU_DILLERI.filter((d) => baslik[d] || ozet[d] || belge[d]).map((d) => ({
        locale: d,
        title: baslik[d] ?? '',
        summary: ozet[d] ?? '',
        body_doc: belge[d] ?? BOS,
        button_text: butonMetin[d] ?? '',
      })),
      ctas: ctas
        .filter((c) => c.etiket.trim() && c.hedef.trim())
        .map((c, i) => {
          const hedef = c.hedef.trim();
          const destination =
            c.destination_type === 'EXTERNAL_URL' || c.destination_type === 'WEBVIEW'
              ? { url: hedef }
              : c.destination_type === 'INTERNAL_ROUTE'
                ? { path: hedef.startsWith('/') ? hedef : `/${hedef}` }
                : { id: hedef };
          return {
            sort_order: i,
            destination_type: c.destination_type,
            destination,
            labels: { tr: c.etiket.trim(), en: c.etiket.trim() },
          };
        }),
    };
  };

  const kaydet = async (action: 'draft' | 'publish') => {
    if (!id) return;
    const r = await AdminDuyuruKaydet(id, payload(action));
    Alert.alert(r.ok ? 'Kaydedildi' : 'Hata', r.ok ? r.status : r.hata);
    if (r.ok) void yukle();
  };

  const medyaSec = async (kind: 'IMAGE' | 'VIDEO' | 'AUDIO') => {
    if (!id) return;
    let uri = '';
    let mime: string | null = null;
    let durationMs: number | null = null;
    if (kind === 'AUDIO') {
      const doc = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/x-m4a'],
        copyToCacheDirectory: true,
      });
      if (doc.canceled || !doc.assets[0]) return;
      uri = doc.assets[0].uri;
      mime = doc.assets[0].mimeType ?? 'audio/mpeg';
    } else {
      const secim = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: kind === 'IMAGE' ? ['images'] : ['videos'],
        quality: 0.8,
      });
      if (secim.canceled || !secim.assets[0]) return;
      uri = secim.assets[0].uri;
      mime = secim.assets[0].mimeType ?? null;
      durationMs = secim.assets[0].duration ? Math.round(secim.assets[0].duration) : null;
    }
    let thumb: string | null = null;
    if (kind === 'VIDEO') {
      try {
        const player = createVideoPlayer(uri);
        const frames = await player.generateThumbnailsAsync([0]);
        thumb = (frames[0] as { uri?: string } | undefined)?.uri ?? null;
        player.release();
      } catch {
        thumb = null;
      }
    }
    setIlerleme(0.05);
    const r = await AdminDuyuruMedyaYukle({
      announcementId: id,
      uri,
      kind,
      mime,
      durationMs,
      thumbnailUri: thumb,
      locale: medyaBuDil ? dil : null,
      onProgress: setIlerleme,
    });
    if (!r.ok) Alert.alert('Medya', r.hata);
    else void yukle();
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi title="Duyuru" subtitle={id} />
      <ScrollView contentContainerStyle={AdminStil.content}>
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
          {DUYURU_DILLERI.map((d) => (
            <Pressable key={d} onPress={() => setDil(d)}>
              <Text style={{ color: dil === d ? RenkTokenlari.accent : RenkTokenlari.text, fontWeight: '700' }}>
                {d.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <TextInput
          style={styles.girdi}
          placeholder="Başlık"
          placeholderTextColor={RenkTokenlari.textMuted}
          value={baslik[dil] ?? ''}
          onChangeText={(v) => setBaslik((o) => ({ ...o, [dil]: v }))}
        />
        <TextInput
          style={styles.girdi}
          placeholder="Kısa açıklama"
          placeholderTextColor={RenkTokenlari.textMuted}
          value={ozet[dil] ?? ''}
          onChangeText={(v) => setOzet((o) => ({ ...o, [dil]: v }))}
        />
        <TextInput
          style={styles.girdi}
          placeholder="Buton metni (bu dil)"
          placeholderTextColor={RenkTokenlari.textMuted}
          value={butonMetin[dil] ?? ''}
          onChangeText={(v) => setButonMetin((o) => ({ ...o, [dil]: v }))}
        />
        <View style={styles.araclar}>
          {(
            [
              ['Başlık', () => blokEkle({ type: 'heading', text: 'Başlık', level: 2 })],
              ['Paragraf', () => blokEkle({ type: 'paragraph', text: '' })],
              ['Kalın', () => blokEkle({ type: 'paragraph', text: '', bold: true })],
              ['İtalik', () => blokEkle({ type: 'paragraph', text: '', italic: true })],
              ['Liste', () => blokEkle({ type: 'list', items: [''] })],
              ['Bağlantı', () => blokEkle({ type: 'link', text: 'Bağlantı', url: 'https://' })],
              ['Alıntı', () => blokEkle({ type: 'quote', text: '' })],
              ['Ayraç', () => blokEkle({ type: 'divider' })],
            ] as const
          ).map(([ad, fn]) => (
            <Pressable key={ad} onPress={fn} style={styles.arac}>
              <Text style={styles.aracYazi}>{ad}</Text>
            </Pressable>
          ))}
        </View>
        {(belge[dil]?.blocks ?? []).map((blok, i) =>
          blok.type === 'divider' ? null : (
            <TextInput
              key={i}
              style={styles.girdi}
              multiline
              value={'text' in blok ? blok.text : (blok.items ?? []).join('\n')}
              onChangeText={(v) => {
                setBelge((once) => {
                  const blocks = [...(once[dil]?.blocks ?? [])];
                  const mevcut = blocks[i];
                  if (!mevcut) return once;
                  if (mevcut.type === 'list') blocks[i] = { ...mevcut, items: v.split('\n') };
                  else if (mevcut.type !== 'divider') blocks[i] = { ...mevcut, text: v };
                  return { ...once, [dil]: { blocks } };
                });
              }}
            />
          ),
        )}
        <Pressable onPress={() => setOnizleme((v) => !v)}>
          <Text style={{ color: RenkTokenlari.accent }}>Önizleme {onizleme ? 'kapat' : 'aç'}</Text>
        </Pressable>
        {onizleme ? <DuyuruZenginMetin belge={belge[dil]} rtl={dil === 'ar'} /> : null}

        <Text style={TipografiTokenlari.caption}>Kategori</Text>
        <View style={styles.satir}>
          {kategoriler.filter((k) => k.id).map((k) => (
            <Pressable key={k.id} onPress={() => setKategoriId(k.id)}>
              <Text style={{ color: kategoriId === k.id ? RenkTokenlari.accent : RenkTokenlari.text }}>
                {k.name}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.satir}>
          <TextInput
            style={[styles.girdi, { flex: 1 }]}
            placeholder="Yeni kategori adı"
            placeholderTextColor={RenkTokenlari.textMuted}
            value={yeniKategori}
            onChangeText={setYeniKategori}
          />
          <Pressable
            onPress={() => {
              const ad = yeniKategori.trim();
              if (ad.length < 2) return;
              void AdminDuyuruKategoriKaydet({ name: ad }).then(async (r) => {
                if (!r.ok) {
                  Alert.alert('Kategori', r.hata);
                  return;
                }
                setYeniKategori('');
                setKategoriId(r.id);
                setKategoriler(await AdminDuyuruKategoriler());
              });
            }}
          >
            <Text style={{ color: RenkTokenlari.accent }}>Ekle</Text>
          </Pressable>
        </View>
        <Text style={TipografiTokenlari.caption}>Önem</Text>
        <View style={styles.satir}>
          {(['NORMAL', 'IMPORTANT', 'CRITICAL'] as const).map((s) => (
            <Pressable key={s} onPress={() => setSeverity(s)}>
              <Text style={{ color: severity === s ? RenkTokenlari.accent : RenkTokenlari.text }}>{s}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput style={styles.girdi} placeholder="Yayın ISO veya boş = şimdi" value={publishAt} onChangeText={setPublishAt} placeholderTextColor={RenkTokenlari.textMuted} />
        <TextInput style={styles.girdi} placeholder="Bitiş" value={expireAt} onChangeText={setExpireAt} placeholderTextColor={RenkTokenlari.textMuted} />
        <Anahtar ad="Sabitle" deger={pinned} onChange={setPinned} />
        <TextInput style={styles.girdi} placeholder="Pin önceliği" value={pinPriority} onChangeText={setPinPriority} placeholderTextColor={RenkTokenlari.textMuted} />
        <Anahtar ad="Ana sayfada göster" deger={showHome} onChange={setShowHome} />
        <View style={styles.satir}>
          {(['CARD', 'BANNER', 'CAROUSEL'] as const).map((d) => (
            <Pressable key={d} onPress={() => setHomeDisplay(d)}>
              <Text style={{ color: homeDisplay === d ? RenkTokenlari.accent : RenkTokenlari.text }}>{d}</Text>
            </Pressable>
          ))}
        </View>
        <Anahtar ad="Uygulama açılışında göster" deger={showLaunch} onChange={setShowLaunch} />
        <View style={styles.satir}>
          <Pressable onPress={() => setLaunchFreq('ONCE_PER_USER')}><Text>ONCE_PER_USER</Text></Pressable>
          <Pressable onPress={() => setLaunchFreq('EVERY_APP_OPEN_UNTIL_READ')}><Text>UNTIL_READ</Text></Pressable>
        </View>
        <Anahtar ad="Kapatılabilir" deger={dismissible} onChange={setDismissible} />
        <Anahtar ad="Okuyana kadar göster" deger={untilRead} onChange={setUntilRead} />
        <Anahtar ad="Tepkilere izin ver" deger={reactions} onChange={setReactions} />
        <Anahtar ad="Yorumlara izin ver" deger={comments} onChange={setComments} />
        <Anahtar ad="Görüntülenme sayısını göster" deger={viewCount} onChange={setViewCount} />
        <Anahtar ad="Push bildirimi gönder" deger={sendPush} onChange={setSendPush} />
        <TextInput style={styles.girdi} placeholder="Push başlık" value={pushTitle} onChangeText={setPushTitle} placeholderTextColor={RenkTokenlari.textMuted} />
        <TextInput style={styles.girdi} placeholder="Push kısa metin" value={pushBody} onChangeText={setPushBody} placeholderTextColor={RenkTokenlari.textMuted} />

        <Text style={TipografiTokenlari.caption}>Hedef kitle</Text>
        <View style={styles.satir}>
          <Pressable onPress={() => setTargetMode('all')}><Text>Tüm kullanıcılar</Text></Pressable>
          <Pressable onPress={() => setTargetMode('targeted')}><Text>Hedefli</Text></Pressable>
          <Pressable onPress={() => setTargetLogic(targetLogic === 'AND' ? 'OR' : 'AND')}><Text>{targetLogic}</Text></Pressable>
        </View>
        <TextInput style={styles.girdi} placeholder="Ülke kodları TR,DE" value={ulke} onChangeText={setUlke} placeholderTextColor={RenkTokenlari.textMuted} />
        <View style={styles.satir}>
          {(['all', 'ios', 'android'] as const).map((p) => (
            <Pressable key={p} onPress={() => setPlatform(p)}>
              <Text style={{ color: platform === p ? RenkTokenlari.accent : RenkTokenlari.text }}>{p}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput style={styles.girdi} placeholder="Uygulama sürümü 1.2.4" value={surum} onChangeText={setSurum} placeholderTextColor={RenkTokenlari.textMuted} />
        <TextInput style={styles.girdi} placeholder="Kullanıcı id veya Tamuso ID" value={kullanicilar} onChangeText={setKullanicilar} placeholderTextColor={RenkTokenlari.textMuted} />
        <TextInput style={styles.girdi} placeholder="Şehir id" value={sehir} onChangeText={setSehir} placeholderTextColor={RenkTokenlari.textMuted} />
        <TextInput style={styles.girdi} placeholder="Dil tr,en" value={dilHedef} onChangeText={setDilHedef} placeholderTextColor={RenkTokenlari.textMuted} />
        <TextInput style={styles.girdi} placeholder="Hesap türü user,creator,agency,agency_member,guest" value={hesapTuru} onChangeText={setHesapTuru} placeholderTextColor={RenkTokenlari.textMuted} />
        <TextInput style={styles.girdi} placeholder="Ajans id" value={ajans} onChangeText={setAjans} placeholderTextColor={RenkTokenlari.textMuted} />
        <TextInput style={styles.girdi} placeholder="VIP minimum" value={vipMin} onChangeText={setVipMin} placeholderTextColor={RenkTokenlari.textMuted} />
        <TextInput style={styles.girdi} placeholder="Seviye minimum" value={seviyeMin} onChangeText={setSeviyeMin} placeholderTextColor={RenkTokenlari.textMuted} />
        <View style={styles.satir}>
          {(['', 'true', 'false'] as const).map((v) => (
            <Pressable key={v || 'any'} onPress={() => setDogrulanmis(v)}>
              <Text style={{ color: dogrulanmis === v ? RenkTokenlari.accent : RenkTokenlari.text }}>
                {v === '' ? 'Doğrulama: fark etmez' : v === 'true' ? 'Doğrulanmış' : 'Doğrulanmamış'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Anahtar ad="İçerik üretici" deger={yaratici} onChange={setYaratici} />
        <Anahtar ad="Ajans üyesi" deger={ajansUyesi} onChange={setAjansUyesi} />
        <Text style={TipografiTokenlari.caption}>Aksiyonlar</Text>
        {ctas.map((c, i) => (
          <View key={i} style={styles.satir}>
            <TextInput
              style={[styles.girdi, { flex: 1 }]}
              placeholder="Etiket"
              placeholderTextColor={RenkTokenlari.textMuted}
              value={c.etiket}
              onChangeText={(v) =>
                setCtas((once) => once.map((x, n) => (n === i ? { ...x, etiket: v } : x)))
              }
            />
            <TextInput
              style={[styles.girdi, { flex: 1 }]}
              placeholder="Hedef id veya yol"
              placeholderTextColor={RenkTokenlari.textMuted}
              value={c.hedef}
              onChangeText={(v) =>
                setCtas((once) => once.map((x, n) => (n === i ? { ...x, hedef: v } : x)))
              }
            />
            <Pressable
              onPress={() => {
                const sirali = [
                  'INTERNAL_ROUTE',
                  'PROFILE',
                  'VOICE_ROOM',
                  'LIVE',
                  'STATUS',
                  'AGENCY',
                  'CREATOR',
                  'GAME',
                  'WEBVIEW',
                  'EXTERNAL_URL',
                ];
                const sonraki = sirali[(sirali.indexOf(c.destination_type) + 1) % sirali.length] ?? 'INTERNAL_ROUTE';
                setCtas((once) => once.map((x, n) => (n === i ? { ...x, destination_type: sonraki } : x)));
              }}
            >
              <Text style={{ color: RenkTokenlari.accent }}>{c.destination_type}</Text>
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={() =>
            setCtas((once) => [...once, { destination_type: 'INTERNAL_ROUTE', hedef: '', etiket: '' }])
          }
        >
          <Text style={{ color: RenkTokenlari.accent }}>Aksiyon ekle</Text>
        </Pressable>

        <Text style={TipografiTokenlari.caption}>Medya {ilerleme > 0 && ilerleme < 1 ? `${Math.round(ilerleme * 100)}%` : ''}</Text>
        <Anahtar ad={`Medyayı yalnız ${dil.toUpperCase()} çevirisine bağla`} deger={medyaBuDil} onChange={setMedyaBuDil} />
        <View style={styles.satir}>
          <Pressable onPress={() => void medyaSec('IMAGE')}><Text>Görsel</Text></Pressable>
          <Pressable onPress={() => void medyaSec('VIDEO')}><Text>Video</Text></Pressable>
          <Pressable onPress={() => void medyaSec('AUDIO')}><Text>Ses</Text></Pressable>
          <Pressable
            onPress={() => {
              if (kayit) {
                void SesliMesajKayitBitir().then(async (r) => {
                  setKayit(false);
                  if (!r.ok || !id) return;
                  const y = await AdminDuyuruMedyaYukle({
                    announcementId: id,
                    uri: r.uri,
                    kind: 'VOICE_RECORDING',
                    mime: 'audio/m4a',
                    durationMs: r.durationMs,
                    locale: medyaBuDil ? dil : null,
                    onProgress: setIlerleme,
                  });
                  if (!y.ok) Alert.alert('Ses', y.hata);
                  else void yukle();
                });
              } else {
                void SesliMesajKayitBaslat().then((r) => {
                  if (!r.ok) Alert.alert('Mikrofon', r.hata);
                  else setKayit(true);
                });
              }
            }}
          >
            <Text>{kayit ? 'Kaydı bitir' : 'Ses kaydet'}</Text>
          </Pressable>
          {kayit ? (
            <Pressable onPress={() => void SesliMesajKayitIptal().then(() => setKayit(false))}>
              <Text>İptal</Text>
            </Pressable>
          ) : null}
        </View>
        {medya.map((m) => (
          <View key={String(m.id)} style={styles.satir}>
            <Text>{String(m.kind)}</Text>
            <Pressable onPress={() => void AdminDuyuruMedyaSil(String(m.id)).then(() => yukle())}>
              <Text style={{ color: RenkTokenlari.danger }}>Sil</Text>
            </Pressable>
          </View>
        ))}

        <Pressable style={AdminStil.aksiyon} onPress={() => void kaydet('draft')}>
          <Text style={styles.beyaz}>Taslak kaydet</Text>
        </Pressable>
        <Pressable style={AdminStil.aksiyon} onPress={() => void kaydet('publish')}>
          <Text style={styles.beyaz}>Yayınla / planla</Text>
        </Pressable>
        <Pressable onPress={() => id && void AdminDuyuruDurum(id, 'unpublish').then(() => yukle())}>
          <Text>Yayından kaldır</Text>
        </Pressable>
        <Pressable onPress={() => id && void AdminDuyuruDurum(id, 'archive').then(() => yukle())}>
          <Text>Arşivle</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            id &&
            void AdminDuyuruKopyala(id).then((r) => {
              if (r.ok) router.push(`/admin/duyurular/${r.id}` as never);
            })
          }
        >
          <Text>Kopyala</Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/admin/duyurular/${id}/analitik` as never)}>
          <Text>Analitik</Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/admin/duyurular/${id}/izleyiciler` as never)}>
          <Text>Görüntüleyen kullanıcılar</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Anahtar({ ad, deger, onChange }: { ad: string; deger: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.satir}>
      <Text style={{ color: RenkTokenlari.text, flex: 1 }}>{ad}</Text>
      <Switch value={deger} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  girdi: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: 10,
    padding: 10,
    color: RenkTokenlari.text,
  },
  satir: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  araclar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  arac: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: RenkTokenlari.border, borderRadius: 8 },
  aracYazi: { color: RenkTokenlari.text, fontSize: 12 },
  beyaz: { color: '#fff', fontWeight: '700' },
});
