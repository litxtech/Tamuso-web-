import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CeviriAnahtari } from '../../../../i18n/useCeviri';
import type { StudioDurum, StudioOyun } from '../../StudioApi';
import { durumAnahtari } from './studioDurum';
import { StudioBos, StudioDurumRozet, StudioIlerleme, StudioKapak, StudioSheet, StudioYuzey } from './Bilesenler';
import { hazirMi, olusuyorMu, projeAra, projeFiltresi, projeSirala, type ProjeFiltre, type ProjeSira } from './projeIslem';
import { etaKisa } from './etaMetni';
import { uretimeAboneOl, uretimOzet } from './uretimKuyrugu';

type Cevir = (key: CeviriAnahtari, opts?: Record<string, unknown>) => string;
type Secim = { kind: string; dimension: 'auto' | '2d' | '3d'; players: 'auto' | '1' | '4' };

const SABLON: { ad: CeviriAnahtari; alt: CeviriAnahtari; yazi: CeviriAnahtari; ton: string }[] = [
  { ad: 'studio.s3d', alt: 'studio.s3dAlt', yazi: 'studio.s3dP', ton: '#243044' },
  { ad: 'studio.sYaris', alt: 'studio.sYarisAlt', yazi: 'studio.sYarisP', ton: '#3a2a22' },
  { ad: 'studio.sHayat', alt: 'studio.sHayatAlt', yazi: 'studio.sHayatP', ton: '#1e3328' },
  { ad: 'studio.sArcade', alt: 'studio.sArcadeAlt', yazi: 'studio.sArcadeP', ton: '#2a2440' },
  { ad: 'studio.sBulmaca', alt: 'studio.sBulmacaAlt', yazi: 'studio.sBulmacaP', ton: '#332818' },
  { ad: 'studio.sKule', alt: 'studio.sKuleAlt', yazi: 'studio.sKuleP', ton: '#1c3040' },
  { ad: 'studio.sDunya', alt: 'studio.sDunyaAlt', yazi: 'studio.sDunyaP', ton: '#2c2438' },
  { ad: 'studio.sCoklu', alt: 'studio.sCokluAlt', yazi: 'studio.sCokluP', ton: '#243028' },
  { ad: 'studio.sSes', alt: 'studio.sSesAlt', yazi: 'studio.sSesP', ton: '#2a2030' },
  { ad: 'studio.sBos', alt: 'studio.sBosAlt', yazi: 'studio.sBosP', ton: '#1a1d28' },
];

const FILTRE: { id: ProjeFiltre; ad: CeviriAnahtari }[] = [
  { id: 'hepsi', ad: 'studio.filtreHepsi' },
  { id: 'olusuyor', ad: 'studio.filtreOlusuyor' },
  { id: 'hazir', ad: 'studio.filtreHazir' },
  { id: 'taslak', ad: 'studio.filtreTaslak' },
  { id: 'inceleme', ad: 'studio.filtreInceleme' },
  { id: 'yayin', ad: 'studio.filtreYayin' },
  { id: 'arsiv', ad: 'studio.filtreArsiv' },
];

export function StudioEv(props: {
  t: Cevir;
  rtl: boolean;
  prompt: string;
  setPrompt: (v: string) => void;
  secim: Secim;
  setSecim: React.Dispatch<React.SetStateAction<Secim>>;
  hata: string | null;
  busy: boolean;
  durum: StudioDurum;
  oyunlar: StudioOyun[];
  kapaklar: Record<string, string>;
  onOlustur: () => void;
  onGeri: () => void;
  onProfil: () => void;
  onAyar: () => void;
  onAc: (id: string) => void;
  onAdKaydet: (oyun: StudioOyun, title: string, description: string) => void;
  onCogalt: (oyun: StudioOyun) => void;
  onArsiv: (oyun: StudioOyun) => void;
  onSil: (oyun: StudioOyun) => void;
  onTopluSil: (idler: string[]) => void;
  onTopluArsiv: (idler: string[]) => void;
  onDede?: () => void;
}) {
  const { t, rtl, prompt, setPrompt, secim, setSecim } = props;
  const insets = useSafeAreaInsets();
  const [gelismis, setGelismis] = useState(false);
  const [filtre, setFiltre] = useState<ProjeFiltre>('hepsi');
  const [sira, setSira] = useState<ProjeSira>('duzenlenen');
  const [arama, setArama] = useState('');
  const [araAcik, setAraAcik] = useState(false);
  const [menu, setMenu] = useState<StudioOyun | null>(null);
  const [duzenle, setDuzenle] = useState<StudioOyun | null>(null);
  const [ad, setAd] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [secili, setSecili] = useState<string[]>([]);
  const [, setNesil] = useState(0);
  const hizala = rtl ? 'right' : 'left';
  const hazirYazi = prompt.trim().length >= 3 && props.durum.new_game && !props.busy;
  const secimModu = secili.length > 0;

  const liste = useMemo(
    () => projeSirala(projeAra(props.oyunlar.filter((o) => projeFiltresi(o, filtre)), arama), sira),
    [props.oyunlar, filtre, arama, sira],
  );

  const uzunBas = (oyun: StudioOyun) => {
    void Haptics.selectionAsync();
    setSecili((once) => (once.includes(oyun.id) ? once.filter((id) => id !== oyun.id) : [...once, oyun.id]));
  };

  useEffect(() => {
    return uretimeAboneOl(() => setNesil((n) => n + 1));
  }, []);

  return (
    <ScrollView
      contentContainerStyle={[styles.icerik, { paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.markaSatir, rtl && styles.ters]}>
        <View style={styles.markaSol}>
          <Pressable onPress={props.onGeri} accessibilityRole="button" accessibilityLabel={t('ortak.geri')} style={styles.ikon}>
            <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={20} color="#fff" />
          </Pressable>
          <View>
            <Text style={styles.marka}>TAMUSO</Text>
            <Text style={styles.markaAlt}>STUDIO</Text>
          </View>
        </View>
        <View style={styles.markaSol}>
          <Pressable
            onPress={() => setAraAcik((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={t('studio.ara')}
            style={styles.ikon}
          >
            <Ionicons name="search" size={18} color="#fff" />
          </Pressable>
          <Pressable onPress={props.onProfil} accessibilityRole="button" accessibilityLabel={t('studio.profil')} style={styles.ikon}>
            <Ionicons name="person-outline" size={18} color="#fff" />
          </Pressable>
          <Pressable onPress={props.onAyar} accessibilityRole="button" accessibilityLabel={t('studio.ayarlar')} style={styles.ikon}>
            <Ionicons name="settings-outline" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      <Text style={[styles.kicker, { textAlign: hizala }]}>{t('studio.olusturAi')}</Text>
      <Text style={[styles.soru, { textAlign: hizala }]}>{t('studio.fikrinVar')}</Text>
      <Text style={[styles.alt, { textAlign: hizala }]}>{t('studio.fikriniAnlat')}</Text>

      <View style={styles.composer}>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder={t('studio.composerPh')}
          placeholderTextColor="rgba(255,255,255,0.35)"
          multiline
          style={[styles.girdi, { textAlign: hizala, writingDirection: rtl ? 'rtl' : 'ltr' }]}
          accessibilityLabel={t('studio.fikrinVar')}
        />
        <View style={[styles.composerAlt, rtl && styles.ters]}>
          <Pressable
            onPress={() => setGelismis((v) => !v)}
            style={[styles.hafif, gelismis && styles.hafifAcik]}
            accessibilityRole="button"
            accessibilityLabel={t('studio.gelismis')}
          >
            <Ionicons name="options-outline" size={16} color={gelismis ? '#E85CA8' : 'rgba(255,255,255,0.6)'} />
            <Text style={[styles.hafifYazi, gelismis && styles.vurgu]}>{t('studio.gelismis')}</Text>
          </Pressable>
          {prompt ? (
            <Pressable onPress={() => setPrompt('')} accessibilityRole="button" accessibilityLabel={t('studio.temizle')}>
              <Text style={styles.hafifYazi}>{t('studio.temizle')}</Text>
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={props.onOlustur}
            disabled={!hazirYazi}
            style={[styles.gonder, !hazirYazi && styles.kapali]}
            accessibilityRole="button"
            accessibilityLabel={t('studio.olustur')}
          >
            {props.busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="arrow-up" size={20} color="#fff" />}
          </Pressable>
        </View>
      </View>

      {gelismis ? (
        <View style={styles.cipSatir}>
          <Cip ad={t('studio.otomatik')} secili={secim.dimension === 'auto'} onPress={() => setSecim((s) => ({ ...s, dimension: 'auto' }))} />
          <Cip ad="2D" secili={secim.dimension === '2d'} onPress={() => setSecim((s) => ({ ...s, dimension: '2d' }))} />
          <Cip ad="3D" secili={secim.dimension === '3d'} onPress={() => setSecim((s) => ({ ...s, dimension: '3d' }))} />
          <Cip ad={t('studio.tekKisi')} secili={secim.players === '1'} onPress={() => setSecim((s) => ({ ...s, players: '1' }))} />
          <Cip ad={t('studio.cokKisi')} secili={secim.players === '4'} onPress={() => setSecim((s) => ({ ...s, players: '4' }))} />
          <Cip ad={t('studio.mobil')} secili onPress={() => undefined} />
        </View>
      ) : null}
      {props.hata ? <Text style={styles.hata}>{props.hata}</Text> : null}
      {!props.durum.ai ? <Text style={[styles.not, { textAlign: hizala }]}>{t('studio.aiKapali')}</Text> : null}

      <Text style={[styles.bolum, { textAlign: hizala }]}>{t('studio.sablonlar')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sablonSatir}>
        {SABLON.map((s) => (
          <Pressable key={s.ad} style={styles.sablon} onPress={() => setPrompt(t(s.yazi))} accessibilityRole="button">
            <View style={[styles.sablonGorsel, { backgroundColor: s.ton }]}>
              <View style={styles.sablonSerit} />
              <Text style={styles.sablonHarf}>{t(s.ad).slice(0, 1)}</Text>
            </View>
            <Text style={styles.sablonAd} numberOfLines={1}>{t(s.ad)}</Text>
            <Text style={styles.not} numberOfLines={2}>{t(s.alt)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {props.onDede ? (
        <Pressable style={styles.dedeKart} onPress={props.onDede} accessibilityRole="button" accessibilityLabel="DEDE oynat">
          <Image source={require('../../../../../assets/dede/cover.jpg')} style={styles.dedeKapak} />
          <View style={styles.dedeYazi}>
            <Text style={styles.sablonAd}>DEDE</Text>
            <Text style={styles.not}>Playable · TEST</Text>
            <Text style={styles.dedeOyna}>▶ OYNAT</Text>
          </View>
        </Pressable>
      ) : null}

      <View style={[styles.bolumSatir, rtl && styles.ters]}>
        <Text style={styles.bolum}>{t('studio.projelerin')}</Text>
        <Pressable
          onPress={() => setSira((v) => (v === 'duzenlenen' ? 'yeni' : v === 'yeni' ? 'ad' : v === 'ad' ? 'durum' : 'duzenlenen'))}
          accessibilityRole="button"
          accessibilityLabel={t('studio.sirala')}
        >
          <Text style={styles.hafifYazi}>{t('studio.sirala')}</Text>
        </Pressable>
      </View>

      {araAcik ? (
        <TextInput
          value={arama}
          onChangeText={setArama}
          placeholder={t('studio.araProje')}
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={[styles.arama, { textAlign: hizala }]}
          accessibilityLabel={t('studio.araProje')}
          autoFocus
        />
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtreSatir}>
        {FILTRE.map((f) => (
          <Pressable key={f.id} onPress={() => setFiltre(f.id)} style={[styles.filtre, filtre === f.id && styles.filtreAcik]} accessibilityRole="button">
            <Text style={[styles.hafifYazi, filtre === f.id && styles.filtreYaziAcik]}>{t(f.ad)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {secimModu ? (
        <View style={[styles.secimBar, rtl && styles.ters]}>
          <Text style={styles.yazi}>{t('studio.secildiSayi', { sayi: secili.length })}</Text>
          <Pressable onPress={() => props.onTopluArsiv(secili)} accessibilityRole="button">
            <Text style={styles.hafifYazi}>{t('studio.arsivle')}</Text>
          </Pressable>
          <Pressable onPress={() => props.onTopluSil(secili)} accessibilityRole="button">
            <Text style={styles.tehlike}>{t('studio.sil')}</Text>
          </Pressable>
          <Pressable onPress={() => setSecili([])} accessibilityRole="button">
            <Text style={styles.hafifYazi}>{t('studio.vazgec')}</Text>
          </Pressable>
        </View>
      ) : null}

      {liste.length === 0 ? (
        <StudioBos baslik={t('studio.bosProje')} alt={t('studio.bosProjeAlt')} />
      ) : (
        liste.map((o) => (
          <ProjeKarti
            key={o.id}
            oyun={o}
            kapak={props.kapaklar[o.id]}
            t={t}
            hizala={hizala}
            secili={secili.includes(o.id)}
            onAc={() => (secimModu ? uzunBas(o) : props.onAc(o.id))}
            onUzun={() => uzunBas(o)}
            onMenu={() => setMenu(o)}
            onArsiv={() => props.onArsiv(o)}
            onSil={() => props.onSil(o)}
          />
        ))
      )}

      {menu ? (
        <View style={styles.menuKatman}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(null)} />
          <StudioYuzey style={styles.menu}>
            <MenuSatir ad={t('studio.ac')} onPress={() => { const id = menu.id; setMenu(null); props.onAc(id); }} />
            <MenuSatir ad={t('studio.yenidenAd')} onPress={() => {
              const oyun = menu;
              setMenu(null);
              setAd(oyun.title || '');
              setAciklama('');
              setDuzenle(oyun);
            }} />
            <MenuSatir ad={t('studio.cogalt')} onPress={() => { const oyun = menu; setMenu(null); props.onCogalt(oyun); }} />
            <MenuSatir ad={menu.status === 'ARCHIVED' ? t('studio.arsivdenCikar') : t('studio.arsivle')} onPress={() => { const oyun = menu; setMenu(null); props.onArsiv(oyun); }} />
            <MenuSatir ad={t('studio.sil')} tehlike onPress={() => { const oyun = menu; setMenu(null); props.onSil(oyun); }} />
          </StudioYuzey>
        </View>
      ) : null}
      <StudioSheet visible={!!duzenle} onClose={() => setDuzenle(null)}>
        <Text style={styles.yazi}>{t('studio.yenidenAd')}</Text>
        <TextInput
          value={ad}
          onChangeText={setAd}
          placeholder={t('studio.oyunAdi')}
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={[styles.arama, { textAlign: hizala }]}
        />
        <TextInput
          value={aciklama}
          onChangeText={setAciklama}
          placeholder={t('studio.aciklama')}
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={[styles.arama, { textAlign: hizala }]}
        />
        <Pressable
          style={styles.gonderGenis}
          onPress={() => {
            if (!duzenle || ad.trim().length < 1) return;
            props.onAdKaydet(duzenle, ad.trim(), aciklama.trim());
            setDuzenle(null);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.swipeYazi}>{t('ortak.kaydet')}</Text>
        </Pressable>
      </StudioSheet>
    </ScrollView>
  );
}

function ProjeKarti(props: {
  oyun: StudioOyun;
  kapak?: string;
  t: Cevir;
  hizala: 'left' | 'right';
  secili: boolean;
  onAc: () => void;
  onUzun: () => void;
  onMenu: () => void;
  onArsiv: () => void;
  onSil: () => void;
}) {
  const { oyun, t } = props;
  const uretim = olusuyorMu(oyun.status);
  const ozet = uretimOzet(oyun.id);
  const oran = ozet?.yuzde ?? (oyun.assets_total ? Math.round(((oyun.assets_ready ?? 0) / oyun.assets_total) * 100) : null);
  const sure = uretim ? etaKisa(ozet?.eta, props.t) : null;
  const hazir = hazirMi(oyun.status);
  const tone = hazir ? 'basari' : oyun.status === 'FAILED' ? 'tehlike' : oyun.status === 'CANCELLED' ? 'uyari' : uretim ? 'vurgu' : 'sakin';
  return (
    <Swipeable
      renderLeftActions={() => (
        <Pressable style={styles.swipe} onPress={props.onArsiv} accessibilityRole="button">
          <Text style={styles.swipeYazi}>{t('studio.arsivle')}</Text>
        </Pressable>
      )}
      renderRightActions={() => (
        <Pressable style={[styles.swipe, styles.swipeSil]} onPress={props.onSil} accessibilityRole="button">
          <Text style={styles.swipeYazi}>{t('studio.sil')}</Text>
        </Pressable>
      )}
    >
      <Pressable onPress={props.onAc} onLongPress={props.onUzun} accessibilityRole="button">
        <StudioYuzey style={props.secili ? styles.kartSecili : undefined}>
          <StudioKapak uri={props.kapak}>
            {uretim && oran != null ? (
              <View style={styles.kapakAlt}>
                <StudioIlerleme yuzde={oran} />
              </View>
            ) : null}
          </StudioKapak>
          <View style={styles.kartGovde}>
            <View style={styles.kartUst}>
              <Text style={[styles.kartBaslik, { textAlign: props.hizala, flex: 1 }]} numberOfLines={1}>
                {oyun.title || t('studio.taslak')}
              </Text>
              <Pressable onPress={props.onMenu} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('studio.daha')}>
                <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>
            <Text style={[styles.not, { textAlign: props.hizala }]}>
              {(oyun.dimension === '2d' ? '2D' : '3D')} · {oyun.genre || t('studio.turBelirsiz')}
            </Text>
            <StudioDurumRozet
              label={uretim && oran != null ? `${t(durumAnahtari(oyun.status))} ${oran}%` : t(durumAnahtari(oyun.status))}
              tone={tone}
            />
            {uretim ? <Text style={styles.vurgu}>{t('studio.canliRozet')}</Text> : null}
            {sure ? <Text style={[styles.not, { textAlign: props.hizala }]}>{sure}</Text> : null}
          </View>
        </StudioYuzey>
      </Pressable>
    </Swipeable>
  );
}

function Cip(props: { ad: string; secili: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} style={[styles.cip, props.secili && styles.cipSecili]} accessibilityRole="button">
      <Text style={[styles.hafifYazi, props.secili && styles.cipYaziSecili]}>{props.ad}</Text>
    </Pressable>
  );
}

function MenuSatir(props: { ad: string; tehlike?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} style={styles.menuSatir} accessibilityRole="button">
      <Text style={props.tehlike ? styles.tehlike : styles.yazi}>{props.ad}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: 20, gap: 12 },
  ters: { flexDirection: 'row-reverse' },
  markaSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  markaSol: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  marka: { color: '#fff', fontSize: 13, letterSpacing: 3, fontWeight: '700' },
  markaAlt: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 1 },
  ikon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#161822' },
  kicker: { color: '#E85CA8', fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginTop: 12 },
  soru: { color: '#fff', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  alt: { color: 'rgba(255,255,255,0.62)', fontSize: 15, lineHeight: 22 },
  composer: { backgroundColor: '#12141c', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14, gap: 10 },
  girdi: { minHeight: 88, color: '#fff', fontSize: 16, lineHeight: 22 },
  composerAlt: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hafif: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 99 },
  hafifAcik: { backgroundColor: 'rgba(232,92,168,0.12)' },
  hafifYazi: { color: 'rgba(255,255,255,0.62)', fontSize: 13, fontWeight: '600' },
  vurgu: { color: '#E85CA8' },
  gonder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E85CA8', alignItems: 'center', justifyContent: 'center' },
  gonderGenis: { minHeight: 48, borderRadius: 14, backgroundColor: '#E85CA8', alignItems: 'center', justifyContent: 'center' },
  kapali: { opacity: 0.35 },
  cipSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cip: { borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 7 },
  cipSecili: { backgroundColor: '#E85CA8', borderColor: '#E85CA8' },
  cipYaziSecili: { color: '#fff' },
  hata: { color: '#E25B5B', fontSize: 13 },
  not: { color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 16 },
  bolum: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1.4 },
  bolumSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  sablonSatir: { gap: 10, paddingRight: 12 },
  sablon: { width: 132, gap: 4 },
  sablonGorsel: { height: 96, borderRadius: 14, backgroundColor: '#1a1d28', alignItems: 'flex-start', justifyContent: 'flex-end', padding: 10, overflow: 'hidden' },
  sablonSerit: { position: 'absolute', right: -12, top: -18, width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.08)' },
  sablonHarf: { color: '#fff', fontSize: 22, fontWeight: '800' },
  sablonAd: { color: '#fff', fontWeight: '700', fontSize: 13 },
  dedeKart: { flexDirection: 'row', gap: 12, backgroundColor: '#1a1028', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(230,197,106,0.35)', padding: 10, alignItems: 'center' },
  dedeKapak: { width: 72, height: 96, borderRadius: 12 },
  dedeYazi: { flex: 1, gap: 4 },
  dedeOyna: { color: '#f0d78a', fontWeight: '800', letterSpacing: 0.6 },
  arama: { backgroundColor: '#12141c', borderRadius: 12, color: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  filtreSatir: { gap: 8 },
  filtre: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#12141c' },
  filtreAcik: { backgroundColor: 'rgba(232,92,168,0.18)' },
  filtreYaziAcik: { color: '#fff' },
  secimBar: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#161822', borderRadius: 14, padding: 12 },
  kartGovde: { padding: 12, gap: 6 },
  kartUst: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kartBaslik: { color: '#fff', fontSize: 16, fontWeight: '800' },
  kartSecili: { borderColor: '#E85CA8' },
  kapakAlt: { position: 'absolute', left: 10, right: 10, bottom: 10 },
  yazi: { color: '#fff', fontWeight: '700' },
  tehlike: { color: '#E25B5B', fontWeight: '800' },
  swipe: { justifyContent: 'center', paddingHorizontal: 18, backgroundColor: '#2a2e3d', borderRadius: 18, marginBottom: 12 },
  swipeSil: { backgroundColor: '#5a2430' },
  swipeYazi: { color: '#fff', fontWeight: '800' },
  menuKatman: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end', padding: 20 },
  menu: { paddingVertical: 6 },
  menuSatir: { paddingHorizontal: 16, paddingVertical: 14 },
});
