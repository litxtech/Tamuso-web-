import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { CeviriAnahtari } from '../../../../i18n/useCeviri';
import type { StudioOyun } from '../../StudioApi';
import { OyunCalismaAlani, type CalismaIstatistik } from '../OyunCalismaAlani';
import type { StudioFaz, StudioVarlik, StudioV2Gorunum } from '../StudioV2Api';
import { RenkTokenlariKoyu as K } from '../../../../tasarim-sistemi/RenkTokenlari';
import { BoslukTokenlari } from '../../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { durumAnahtari, isAnahtari } from './studioDurum';
import { StudioDurumRozet, StudioKapak, StudioOnay, StudioSheet } from './Bilesenler';
import { etaMetni } from './etaMetni';
import { durumInsan, varlikAdi, yamaIslemi } from './insanMetni';
import { UretimSahne } from './UretimSahne';
import { StudioRevizyonlar, type Revizyon } from './projeIslem';
import { uretimHaberVerildi } from './uretimKuyrugu';
import i18n from '../../../../i18n';
import { BildirimKuyrugaEkleDev } from '../../../bildirimler/okuma/BildirimKuyrugumuGetir';

type Cevir = (key: CeviriAnahtari, opts?: Record<string, unknown>) => string;
type Sekme = 'oyun' | 'sahne' | 'varlik' | 'mantik' | 'ses' | 'etkinlik';
type FazId = 'design' | 'scene_plan' | 'models' | 'textures' | 'audio' | 'gameplay' | 'preview';

const FAZ: Record<string, CeviriAnahtari> = {
  design: 'studio.asamaTasarim',
  scene_plan: 'studio.asamaSahne',
  models: 'studio.asamaModel',
  textures: 'studio.asamaDoku',
  audio: 'studio.asamaSes',
  gameplay: 'studio.asamaOynanis',
  preview: 'studio.asamaOnizleme',
};

type Ent = {
  id: string;
  name: string;
  parentId: string | null;
  role: string;
  transform?: { position?: number[]; rotation?: number[]; scale?: number[] };
};
type Dugum = { id: string; category: string; action: string; next?: string[] };

function nesneler(sahne: unknown): Ent[] {
  const kok = sahne && typeof sahne === 'object' ? (sahne as { entities?: unknown }).entities : null;
  if (!Array.isArray(kok)) return [];
  return kok.filter((e): e is Ent => !!e && typeof e === 'object' && typeof (e as Ent).id === 'string');
}

function dugumler(graf: unknown): Dugum[] {
  const kok = graf && typeof graf === 'object' ? (graf as { nodes?: unknown }).nodes : null;
  if (!Array.isArray(kok)) return [];
  return kok.filter((n): n is Dugum => !!n && typeof n === 'object' && typeof (n as Dugum).id === 'string');
}

let sesCalar: AudioPlayer | null = null;

export function StudioProje(props: {
  t: Cevir;
  rtl: boolean;
  oyun: StudioOyun;
  akis: StudioV2Gorunum | null;
  adres: { urls: Record<string, string>; allowedHosts: string[] } | null;
  paused: boolean;
  restartKey: number;
  tam: boolean;
  ist: CalismaIstatistik | null;
  hazir: boolean;
  hataMetni: string | null;
  baslamadi: boolean;
  mesaj: string | null;
  calisiyor: boolean;
  onGeri: () => void;
  onDuraklat: () => void;
  onYeniden: () => void;
  onTam: () => void;
  onTekrar: () => void;
  onDurdur: () => void;
  onDevam: () => void;
  onBasarisiz: () => void;
  onYama: (yazi: string) => Promise<{ ok: boolean; summary?: string; operations?: string[] } | void>;
  onArkaPlan: () => void;
  onGeriAl: () => void;
  onYayin: () => void;
  onGorsel: (slot: 'cover' | 'avatar') => void;
  onIssue: (kod: string) => void;
  onStats: (s: CalismaIstatistik) => void;
  onReady: () => void;
}) {
  const { t, rtl, oyun, akis, adres } = props;
  const [sekme, setSekme] = useState<Sekme>('oyun');
  const [yama, setYama] = useState('');
  const [teknik, setTeknik] = useState(false);
  const [filtre, setFiltre] = useState('hepsi');
  const [secili, setSecili] = useState<Ent | null>(null);
  const [runtimeHazir, setRuntimeHazir] = useState(false);
  const [runtimeKod, setRuntimeKod] = useState<string | null>(null);
  const [durdurOnay, setDurdurOnay] = useState(false);
  const [kutlama, setKutlama] = useState(false);
  const [arac, setArac] = useState(false);
  const [surumler, setSurumler] = useState<Revizyon[] | null>(null);
  const [yamaSonuc, setYamaSonuc] = useState<string[] | null>(null);
  const [panel, setPanel] = useState<null | 'ai' | 'sahne' | 'varlik' | 'mantik' | 'ses' | 'ayar' | 'menu' | 'olcum'>(null);
  const [yamaBekliyor, setYamaBekliyor] = useState(false);
  const [sahneAra, setSahneAra] = useState('');
  const [olcu, setOlcu] = useState({ ust: 76, alt: 96 });
  const oncekiDurum = React.useRef(oyun.status);
  const genis = useWindowDimensions().width >= 840;
  const hizala = rtl ? 'right' : 'left';
  const manifest = (akis?.manifest ?? oyun.manifest) as { runtime?: string; economy?: { mode?: string; testBalance?: number }; issues?: string[] } | null;
  const oynanir = props.hazir && manifest?.runtime === 'playcanvas-engine' && !!adres;
  const gorselSeridi = () => (
    <View style={styles.liste}>
      <View style={styles.gorselSatir}>
        {akis?.coverUrl ? <Image source={{ uri: akis.coverUrl }} style={styles.kapakKucuk} /> : null}
        {akis?.avatarUrl ? <Image source={{ uri: akis.avatarUrl }} style={styles.avatarKucuk} /> : null}
      </View>
      <View style={styles.gorselSatir}>
        <Pressable style={styles.gorselBtn} onPress={() => props.onGorsel('cover')} accessibilityRole="button">
          <Text numberOfLines={1} style={styles.ikincilYazi}>{t('studio.kapakDegistir')}</Text>
        </Pressable>
        <Pressable style={styles.gorselBtn} onPress={() => props.onGorsel('avatar')} accessibilityRole="button">
          <Text numberOfLines={1} style={styles.ikincilYazi}>{t('studio.avatarDegistir')}</Text>
        </Pressable>
      </View>
      <Text style={styles.not}>{t('studio.gorselNot')}</Text>
    </View>
  );
  const fazlar: StudioFaz[] = akis?.phases?.length
    ? akis.phases
    : (Object.keys(FAZ) as FazId[]).map((id) => ({
        id,
        state: id === 'design' && props.calisiyor ? 'oluyor' : 'bekliyor',
        detail: '',
      }));
  const biten = fazlar.filter((f) => f.state === 'bitti').length;
  const yuzde = biten > 0 ? Math.round((biten / fazlar.length) * 100) : null;
  const sure = etaMetni(akis?.eta, t);
  const durduruldu = (akis?.status || oyun.status) === 'CANCELLED';
  const suAn = fazlar.find((f) => f.state === 'oluyor') ?? fazlar.find((f) => f.state === 'hata');
  const varliklar = akis?.assets ?? [];
  const sahne = useMemo(() => nesneler(akis?.scene ?? oyun.scene_graph), [akis?.scene, oyun.scene_graph]);
  const graf = useMemo(() => dugumler(akis?.gameplay ?? oyun.gameplay_graph), [akis?.gameplay, oyun.gameplay_graph]);
  const spec = (akis?.specification ?? oyun.specification) as { game?: { title?: string; description?: string; genre?: string; dimension?: string }; gameplay?: { objective?: string } } | null;
  const baslik = spec?.game?.title || akis?.title || oyun.title || t('studio.taslak');

  useEffect(() => {
    const simdi = akis?.status || oyun.status;
    if (oncekiDurum.current !== 'READY_FOR_PREVIEW' && simdi === 'READY_FOR_PREVIEW') {
      setKutlama(true);
      if (!uretimHaberVerildi(oyun.id)) {
        const ad = spec?.game?.title || oyun.title || 'Studio';
        void BildirimKuyrugaEkleDev({
          title: i18n.t('studio.oyununHazir'),
          body: i18n.t('studio.hazirBildirim', { ad }),
          category: 'system',
        });
      }
    }
    oncekiDurum.current = simdi;
  }, [akis?.status, oyun.status]);

  useEffect(() => () => {
    try { sesCalar?.remove(); } catch { /* calar kapanmis olabilir */ }
  }, []);

  const govde = !oynanir || sekme === 'oyun' ? (
    oynanir && adres ? (
      <View style={[styles.sahne, props.tam && styles.sahneTam, genis && styles.sahneGenis]}>
        {props.tam ? <Text style={styles.testEtiket}>{t('studio.testModu')}</Text> : null}
        <OyunCalismaAlani
          manifest={manifest}
          urls={adres.urls}
          allowedHosts={adres.allowedHosts}
          paused={props.paused}
          restartKey={props.restartKey}
          onIssue={(kod) => { setRuntimeHazir(false); setRuntimeKod(kod); props.onIssue(kod); }}
          onStats={props.onStats}
          onReady={() => { setRuntimeHazir(true); setRuntimeKod(null); props.onReady(); }}
        />
      </View>
    ) : (
      <UretimSahne
        t={t}
        hizala={hizala}
        baslik={baslik}
        kapak={akis?.coverUrl}
        suAn={suAn ? t(FAZ[suAn.id] ?? 'studio.asamaTasarim') : t('studio.hazirlaniyorKisa')}
        yuzde={yuzde}
        fazlar={fazlar}
        varliklar={varliklar}
        etkinlik={akis?.activity ?? []}
        teknik={teknik}
        calisiyor={props.calisiyor}
        hata={props.baslamadi ? (props.mesaj === 'AI_DISABLED' ? t('studio.aiKapali') : props.hataMetni || t('studio.onizlemeHata')) : props.hataMetni}
        sure={sure}
        durduruldu={durduruldu}
        onDurdur={() => setDurdurOnay(true)}
        onDevam={props.onDevam}
        onArkaPlan={props.onArkaPlan}
        onTeknik={() => setTeknik((v) => !v)}
        onTekrar={props.onTekrar}
        onBasarisiz={props.onBasarisiz}
      />
    )
  ) : null;

  if (oynanir && adres) return calisma();

  return (
    <View style={styles.kok}>
      <View style={[styles.ust, rtl && styles.ters]}>
        <Pressable onPress={props.onGeri} style={styles.ikon} accessibilityRole="button" accessibilityLabel={t('studio.studyoDon')}>
          <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={22} color={K.text} />
        </Pressable>
        <View style={styles.ustMetin}>
          <Text style={styles.ustBaslik} numberOfLines={1}>{baslik}</Text>
          <Text style={styles.not}>{
            (akis?.status || oyun.status) === 'READY_FOR_PREVIEW' || (akis?.status || oyun.status) === 'PRIVATE_TEST'
              ? (runtimeKod ? t('studio.motorHazirlanamadi') : runtimeHazir ? t('studio.durumOnizleme') : t('studio.runtimeHazirlaniyor'))
              : t(durumAnahtari(akis?.status || oyun.status))
          }</Text>
        </View>
        {oynanir ? (
          <Pressable
            onPress={() => {
              if (!props.tam && props.paused) props.onDuraklat();
              props.onTam();
            }}
            style={styles.testBtn}
            accessibilityRole="button"
            accessibilityLabel={t('studio.testModu')}
          >
            <Text style={styles.testBtnYazi}>{t('studio.testModu')}</Text>
          </Pressable>
        ) : null}
      </View>

      {props.tam ? govde : (
        <ScrollView contentContainerStyle={styles.icerik} keyboardShouldPersistTaps="handled">
          {genis && oynanir && sekme === 'oyun' ? (
            <View style={styles.genisSatir}>
              <View style={styles.yan}>{sahneListe()}</View>
              <View style={styles.orta}>{govde}{kontroller()}</View>
              <View style={styles.yan}>{aiKutu()}</View>
            </View>
          ) : (
            <>
              {gorselSeridi()}
              {sekme === 'oyun' || !oynanir ? govde : null}
              {sekme === 'oyun' && oynanir ? kontroller() : null}
              {sekme === 'sahne' ? sahneListe() : null}
              {sekme === 'varlik' ? varlikListe() : null}
              {sekme === 'mantik' ? mantikListe() : null}
              {sekme === 'ses' ? sesListe() : null}
              {sekme === 'etkinlik' ? etkinlikListe() : null}
              {sekme === 'oyun' && oynanir ? aiKutu() : null}
              {oynanir ? olcum() : null}
              {oynanir && (oyun.status === 'READY_FOR_PREVIEW' || oyun.status === 'PRIVATE_TEST') ? (
                <Pressable style={styles.birincil} onPress={props.onYayin} accessibilityRole="button">
                  <Text style={styles.birincilYazi}>{t('studio.yayinIste')}</Text>
                </Pressable>
              ) : null}
              {oyun.status === 'SUBMITTED' || oyun.status === 'IN_REVIEW' || oyun.status === 'SCANNING' ? (
                <Text style={styles.not}>{t('studio.inceleniyor')}</Text>
              ) : null}
            </>
          )}
        </ScrollView>
      )}

      {!oynanir || props.tam ? null : (
        <View style={styles.altNav}>
          {([
            ['oyun', t('studio.oyunSekme')],
            ['sahne', t('studio.sahne')],
            ['varlik', t('studio.varliklar')],
          ] as const).map(([id, ad]) => (
            <Pressable key={id} onPress={() => setSekme(id)} style={styles.nav} accessibilityRole="button">
              <Text numberOfLines={1} style={[styles.navYazi, sekme === id && styles.navAcik]}>{ad}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setArac(true)} style={styles.nav} accessibilityRole="button" accessibilityLabel={t('studio.araclar')}>
            <Text style={[styles.navYazi, (sekme === 'mantik' || sekme === 'ses' || sekme === 'etkinlik') && styles.navAcik]}>+</Text>
          </Pressable>
        </View>
      )}

      <StudioOnay
        visible={durdurOnay}
        baslik={t('studio.durdurSoru')}
        govde={t('studio.durdurAciklama')}
        vazgec={t('studio.devamEt')}
        onay={t('studio.uretimiDurdur')}
        tehlike
        onVazgec={() => setDurdurOnay(false)}
        onOnay={() => { setDurdurOnay(false); props.onDurdur(); }}
      />
      <StudioSheet visible={kutlama} onClose={() => setKutlama(false)}>
        <Text style={styles.kicker}>{t('studio.oyununHazir')}</Text>
        <StudioKapak uri={akis?.coverUrl} boy={180} />
        <Text style={styles.ustBaslik}>{baslik}</Text>
        <Text style={styles.not}>{spec?.game?.dimension === '2d' ? '2D' : '3D'} · {spec?.game?.genre || t('studio.turBelirsiz')}</Text>
        <StudioDurumRozet label={runtimeHazir ? t('studio.durumOnizleme') : t('studio.runtimeHazirlaniyor')} tone={runtimeHazir ? 'basari' : 'sakin'} />
        <View style={styles.satir}>
          <Pressable
            style={styles.birincil}
            onPress={() => { setKutlama(false); if (props.paused) props.onDuraklat(); }}
            accessibilityRole="button"
          >
            <Text style={styles.birincilYazi}>{t('studio.oyna')}</Text>
          </Pressable>
          <Pressable style={styles.ikincil} onPress={() => setKutlama(false)} accessibilityRole="button">
            <Text style={styles.ikincilYazi}>{t('studio.studyoyuAc')}</Text>
          </Pressable>
        </View>
      </StudioSheet>
      <StudioSheet visible={arac} onClose={() => setArac(false)}>
        <Text style={styles.ustBaslik}>{t('studio.araclar')}</Text>
        <Pressable style={styles.ikincil} onPress={() => { setSekme('mantik'); setArac(false); }} accessibilityRole="button">
          <Text style={styles.ikincilYazi}>{t('studio.mantik')}</Text>
        </Pressable>
        <Pressable style={styles.ikincil} onPress={() => { setSekme('ses'); setArac(false); }} accessibilityRole="button">
          <Text style={styles.ikincilYazi}>{t('studio.ses')}</Text>
        </Pressable>
        <Pressable style={styles.ikincil} onPress={() => { setSekme('etkinlik'); setArac(false); }} accessibilityRole="button">
          <Text style={styles.ikincilYazi}>{t('studio.kayit')}</Text>
        </Pressable>
        <Pressable
          style={styles.ikincil}
          onPress={() => {
            setArac(false);
            void StudioRevizyonlar(oyun.id).then(setSurumler);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.ikincilYazi}>{t('studio.versiyonlar')}</Text>
        </Pressable>
      </StudioSheet>
      <StudioSheet visible={surumler != null} onClose={() => setSurumler(null)}>
        <Text style={styles.ustBaslik}>{t('studio.versiyonlar')}</Text>
        {surumler && surumler.length === 0 ? <Text style={styles.not}>{t('studio.versiyonYok')}</Text> : null}
        {surumler?.map((r, i) => (
          <View key={r.revision} style={styles.satirKart}>
            <Text style={styles.satirAd}>v{r.revision}</Text>
            <Text style={styles.not}>{r.summary}</Text>
            {i === 0 ? (
              <Pressable onPress={() => { setSurumler(null); props.onGeriAl(); }} accessibilityRole="button">
                <Text style={styles.link}>{t('studio.geriAl')}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </StudioSheet>
      <Modal visible={!!secili} transparent animationType="slide" onRequestClose={() => setSecili(null)}>
        <Pressable style={styles.perde} onPress={() => setSecili(null)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.kicker}>{t('studio.secildi')}</Text>
            <Text style={styles.ustBaslik}>{secili?.name}</Text>
            <Text style={styles.not}>{secili?.role}</Text>
            <Sayi ad={t('studio.konum')} d={secili?.transform?.position} />
            <Sayi ad={t('studio.donus')} d={secili?.transform?.rotation} />
            <Sayi ad={t('studio.olcek')} d={secili?.transform?.scale} />
            <Pressable style={styles.ikincil} onPress={() => setSecili(null)} accessibilityRole="button">
              <Text style={styles.ikincilYazi}>{t('studio.kapat')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );

  function calisma() {
    if (!adres) return null;
    const duzenle = props.paused && !props.tam;
    const altYazi = runtimeKod
      ? t('studio.motorHazirlanamadi')
      : !runtimeHazir
        ? t('studio.motorYukleniyor')
        : props.paused
          ? t('studio.durumOnizleme')
          : t('studio.testModu');
    const acikIs = (akis?.activity ?? []).filter((e) => ['QUEUED', 'RUNNING', 'RETRYING'].includes(e.status)).length;
    const sahneFiltre = sahne.filter((e) => e.name.toLocaleLowerCase().includes(sahneAra.trim().toLocaleLowerCase()));
    const gonderYama = (yazi: string) => {
      if (yazi.trim().length < 3 || yamaBekliyor) return;
      setYama('');
      setYamaBekliyor(true);
      setYamaSonuc(null);
      void props.onYama(yazi.trim()).then((sonuc) => {
        setYamaBekliyor(false);
        if (sonuc?.operations?.length) setYamaSonuc(sonuc.operations);
        else if (sonuc?.summary) setYamaSonuc([sonuc.summary]);
      });
    };
    return (
      <View style={styles.sahneKok}>
        <View style={styles.sahneTam}>
          <OyunCalismaAlani
            manifest={manifest}
            urls={adres.urls}
            allowedHosts={adres.allowedHosts}
            paused={props.paused}
            restartKey={props.restartKey}
            guvenliUst={duzenle ? olcu.ust + 12 : 16}
            guvenliAlt={olcu.alt + 8}
            onIssue={(kod) => {
              if (kod === 'ENGINE_MISSING' || kod === 'ENGINE_INIT_FAILED' || kod === 'WEBGL_UNAVAILABLE' || kod === 'RUNTIME_MANIFEST_MISSING' || kod === 'SCENE_GRAPH_MISSING' || kod === 'GAMEPLAY_GRAPH_MISSING') {
                setRuntimeHazir(false);
                setRuntimeKod(kod);
              }
              props.onIssue(kod);
            }}
            onStats={props.onStats}
            onSelect={(id) => {
              const nesne = sahne.find((e) => e.id === id);
              if (nesne && props.paused) setSecili(nesne);
            }}
            onReady={() => { setRuntimeHazir(true); props.onReady(); }}
          />
        </View>
        {duzenle ? (
          <View pointerEvents="box-none" style={styles.ustPerde} onLayout={(e) => {
            const yukseklik = e.nativeEvent?.layout?.height;
            if (!yukseklik) return;
            setOlcu((o) => ({ ...o, ust: yukseklik + 8 }));
          }}>
            <LinearGradient pointerEvents="none" colors={['rgba(7,8,16,0.72)', 'rgba(7,8,16,0)']} style={styles.ustGel} />
            <View style={[styles.ustYuzer, rtl && styles.ters]}>
              <Pressable onPress={props.onGeri} style={styles.daire} accessibilityRole="button" accessibilityLabel={t('studio.studyoDon')}>
                <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={22} color="#fff" />
              </Pressable>
              <View style={styles.ustMetin}>
                <Text style={styles.ustBaslik} numberOfLines={1}>{baslik}</Text>
                <Text style={styles.not}>{altYazi} · {t('studio.kayitKisa')}</Text>
              </View>
              <Pressable onPress={props.onTam} style={styles.testRozet} accessibilityRole="button" accessibilityLabel={t('studio.testModu')}>
                <Text style={styles.testRozetYazi}>TEST</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {genis && duzenle ? (
          <View style={styles.sol}>
            <Text style={styles.aracYazi}>{t('studio.sahne')}</Text>
            <ScrollView>{sahneFiltre.map((e) => (
              <Pressable key={e.id} onPress={() => setSecili(e)} accessibilityRole="button">
                <Text style={styles.not} numberOfLines={1}>{e.name}</Text>
              </Pressable>
            ))}</ScrollView>
          </View>
        ) : null}
        {duzenle ? (
          <View pointerEvents="box-none" style={[styles.aracSutun, rtl && styles.aracSutunRtl, { top: olcu.ust + 8, bottom: olcu.alt + 8 }]}>
            {([
              ['ai', 'sparkles', 'AI'],
              ['sahne', 'layers-outline', t('studio.sahne')],
              ['varlik', 'cube-outline', t('studio.varliklar')],
              ['mantik', 'flash-outline', t('studio.mantik')],
              ['ses', 'musical-notes-outline', t('studio.ses')],
              ['menu', 'ellipsis-horizontal', ''],
            ] as const).map(([id, ikon, ad]) => (
              <Pressable key={id} onPress={() => setPanel(id)} style={styles.aracBtn} accessibilityRole="button" accessibilityLabel={ad || t('studio.daha')}>
                <View style={[styles.daire, panel === id && styles.aracBtnAcik]}>
                  <Ionicons name={ikon} size={20} color={panel === id ? '#fff' : 'rgba(255,255,255,0.88)'} />
                </View>
                {ad ? <Text style={styles.aracYazi} numberOfLines={1}>{ad}</Text> : null}
              </Pressable>
            ))}
          </View>
        ) : null}
        {acikIs > 0 && duzenle ? (
          <Pressable style={styles.isHapi} onPress={() => setPanel('olcum')} accessibilityRole="button">
            <Text style={styles.aracYazi}>{t('studio.isSuruyor', { sayi: acikIs })}</Text>
          </Pressable>
        ) : null}
        <View style={[styles.dock, !duzenle && styles.dockSik]} pointerEvents="box-none" onLayout={(e) => {
          const yukseklik = e.nativeEvent?.layout?.height;
          if (!yukseklik) return;
          setOlcu((o) => ({ ...o, alt: yukseklik + 28 }));
        }}>
          {props.tam ? (
            <Pressable onPress={props.onTam} style={styles.cikis} accessibilityRole="button" accessibilityLabel={t('studio.cikis')}>
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={styles.dockYazi}>{t('studio.cikis')}</Text>
            </Pressable>
          ) : props.paused ? (
            <>
              <Pressable style={styles.oyna} onPress={props.onDuraklat} accessibilityRole="button" accessibilityLabel={t('studio.oyunuBaslat')}>
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={styles.oynaYazi}>{t('studio.oyunuBaslat')}</Text>
              </Pressable>
              <Pressable style={styles.daire} onPress={props.onYeniden} accessibilityRole="button" accessibilityLabel={t('studio.yeniden')}>
                <Ionicons name="refresh" size={18} color="#fff" />
              </Pressable>
              <Pressable style={styles.daire} onPress={props.onTam} accessibilityRole="button" accessibilityLabel={t('studio.tamEkran')}>
                <Ionicons name="expand" size={18} color="#fff" />
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.daire} onPress={props.onDuraklat} accessibilityRole="button" accessibilityLabel={t('studio.duraklat')}>
                <Ionicons name="pause" size={18} color="#fff" />
              </Pressable>
              <Pressable style={styles.daire} onPress={props.onYeniden} accessibilityRole="button" accessibilityLabel={t('studio.yeniden')}>
                <Ionicons name="refresh" size={18} color="#fff" />
              </Pressable>
              <Pressable style={styles.daire} onPress={props.onTam} accessibilityRole="button" accessibilityLabel={t('studio.tamEkran')}>
                <Ionicons name="expand" size={18} color="#fff" />
              </Pressable>
              <Pressable style={styles.cikis} onPress={props.onDuraklat} accessibilityRole="button" accessibilityLabel={t('studio.testiBitir')}>
                <Text style={styles.dockYazi}>{t('studio.testiBitir')}</Text>
              </Pressable>
            </>
          )}
        </View>
        <StudioSheet visible={panel === 'ai'} onClose={() => setPanel(null)}>
          <Text style={styles.ustBaslik}>{t('studio.yama')}</Text>
          <Text style={styles.not}>{t('studio.aiSoru')}</Text>
          <TextInput
            value={yama}
            onChangeText={setYama}
            placeholder={t('studio.aiSoru')}
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={[styles.girdi, { textAlign: hizala }]}
            multiline
          />
          <View style={styles.satir}>
            {[t('studio.nesneEkle'), t('studio.ortamDegistir'), t('studio.oynanisDegistir'), t('studio.isikDuzenle'), t('studio.sesEkle')].map((ad) => (
              <Pressable key={ad} style={styles.cip} onPress={() => setYama(ad)} accessibilityRole="button">
                <Text style={styles.cipYazi}>{ad}</Text>
              </Pressable>
            ))}
          </View>
          {yamaBekliyor ? <Text style={styles.not}>{t('studio.degisiklikHazir')}</Text> : null}
          {yamaSonuc?.map((satir) => <Text key={satir} style={styles.not}>{satir.includes(' ') ? satir : t(yamaIslemi(satir))}</Text>)}
          <View style={styles.satir}>
            <Pressable style={[styles.birincil, (yama.trim().length < 3 || yamaBekliyor) && styles.kapali]} disabled={yama.trim().length < 3 || yamaBekliyor} onPress={() => gonderYama(yama)} accessibilityRole="button">
              <Text style={styles.birincilYazi}>{t('studio.yamaGonder')}</Text>
            </Pressable>
            <Pressable style={styles.ikincil} onPress={() => setPanel(null)} accessibilityRole="button">
              <Text style={styles.ikincilYazi}>{t('studio.vazgec')}</Text>
            </Pressable>
            <Pressable style={styles.ikincil} onPress={props.onGeriAl} accessibilityRole="button">
              <Text style={styles.ikincilYazi}>{t('studio.geriAl')}</Text>
            </Pressable>
          </View>
        </StudioSheet>
        <StudioSheet visible={panel === 'sahne'} onClose={() => setPanel(null)}>
          <Text style={styles.ustBaslik}>{t('studio.sahne')}</Text>
          <TextInput value={sahneAra} onChangeText={setSahneAra} placeholder={t('studio.ara')} placeholderTextColor="rgba(255,255,255,0.35)" style={styles.girdi} />
          <ScrollView style={styles.sayfa}>{sahneFiltre.length ? sahneFiltre.map((e) => (
            <Pressable key={e.id} style={styles.satirKart} onPress={() => setSecili(e)} accessibilityRole="button">
              <Text style={styles.satirAd}>{e.name}</Text>
              <Text style={styles.not}>{e.role}</Text>
            </Pressable>
          )) : <Text style={styles.not}>{t('studio.sahneYok')}</Text>}</ScrollView>
        </StudioSheet>
        <StudioSheet visible={panel === 'varlik'} onClose={() => setPanel(null)}>
          <Text style={styles.ustBaslik}>{t('studio.varliklar')}</Text>
          <ScrollView style={styles.sayfa}>{varlikListe()}</ScrollView>
        </StudioSheet>
        <StudioSheet visible={panel === 'mantik'} onClose={() => setPanel(null)}>
          <Text style={styles.ustBaslik}>{t('studio.mantik')}</Text>
          <ScrollView style={styles.sayfa}>{mantikListe()}</ScrollView>
        </StudioSheet>
        <StudioSheet visible={panel === 'ses'} onClose={() => setPanel(null)}>
          <Text style={styles.ustBaslik}>{t('studio.ses')}</Text>
          <ScrollView style={styles.sayfa}>{sesListe()}</ScrollView>
        </StudioSheet>
        <StudioSheet visible={panel === 'ayar'} onClose={() => setPanel(null)}>
          <Text style={styles.ustBaslik}>{t('studio.ayarlar')}</Text>
          <Text style={styles.not}>{t('studio.testBakiye')}</Text>
          {typeof manifest?.economy?.testBalance === 'number' ? <Text style={styles.satirAd}>{manifest.economy.testBalance}</Text> : <Text style={styles.not}>{t('studio.testEdilmedi')}</Text>}
          {(oyun.status === 'READY_FOR_PREVIEW' || oyun.status === 'PRIVATE_TEST') ? (
            <Pressable style={styles.birincil} onPress={props.onYayin} accessibilityRole="button">
              <Text style={styles.birincilYazi}>{t('studio.yayinIste')}</Text>
            </Pressable>
          ) : null}
        </StudioSheet>
        <StudioSheet visible={panel === 'menu'} onClose={() => setPanel(null)}>
          <Pressable style={styles.ikincil} onPress={() => setPanel('ayar')} accessibilityRole="button"><Text style={styles.ikincilYazi}>{t('studio.ayarlar')}</Text></Pressable>
          <Pressable style={styles.ikincil} onPress={() => { setPanel(null); props.onGorsel('cover'); }} accessibilityRole="button"><Text style={styles.ikincilYazi}>{t('studio.kapakDegistir')}</Text></Pressable>
          <Pressable style={styles.ikincil} onPress={() => { setPanel(null); props.onGorsel('avatar'); }} accessibilityRole="button"><Text style={styles.ikincilYazi}>{t('studio.avatarDegistir')}</Text></Pressable>
          <Pressable style={styles.ikincil} onPress={() => { setPanel(null); void StudioRevizyonlar(oyun.id).then(setSurumler); }} accessibilityRole="button"><Text style={styles.ikincilYazi}>{t('studio.versiyonlar')}</Text></Pressable>
          <Pressable style={styles.ikincil} onPress={() => setPanel('olcum')} accessibilityRole="button"><Text style={styles.ikincilYazi}>{t('studio.olcumGoster')}</Text></Pressable>
        </StudioSheet>
        <StudioSheet visible={panel === 'olcum'} onClose={() => setPanel(null)}>
          <Text style={styles.ustBaslik}>{t('studio.testSaglik')}</Text>
          {props.ist ? <Text style={styles.satirAd}>{t('studio.fps')} {props.ist.fps}</Text> : <Text style={styles.not}>{t('studio.testEdilmedi')}</Text>}
          <ScrollView style={styles.sayfa}>{etkinlikListe()}</ScrollView>
        </StudioSheet>
        <StudioSheet visible={kutlama} onClose={() => setKutlama(false)}>
          <Text style={styles.kicker}>{t('studio.oyununHazir')}</Text>
          <StudioKapak uri={akis?.coverUrl} boy={180} />
          <Text style={styles.ustBaslik}>{baslik}</Text>
          <Pressable style={styles.birincil} onPress={() => { setKutlama(false); if (props.paused) props.onDuraklat(); }} accessibilityRole="button">
            <Text style={styles.birincilYazi}>{t('studio.oyna')}</Text>
          </Pressable>
        </StudioSheet>
        <StudioSheet visible={surumler != null} onClose={() => setSurumler(null)}>
          <Text style={styles.ustBaslik}>{t('studio.versiyonlar')}</Text>
          {surumler && surumler.length === 0 ? <Text style={styles.not}>{t('studio.versiyonYok')}</Text> : null}
          {surumler?.map((r, i) => (
            <View key={r.revision} style={styles.satirKart}>
              <Text style={styles.satirAd}>v{r.revision}</Text>
              <Text style={styles.not}>{r.summary}</Text>
              {i === 0 ? (
                <Pressable onPress={() => { setSurumler(null); props.onGeriAl(); }} accessibilityRole="button">
                  <Text style={styles.link}>{t('studio.geriAl')}</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </StudioSheet>
        <Modal visible={!!secili} transparent animationType="slide" onRequestClose={() => setSecili(null)}>
          <Pressable style={styles.perde} onPress={() => setSecili(null)}>
            <Pressable style={styles.sheet} onPress={() => undefined}>
              <Text style={styles.kicker}>{t('studio.secildi')}</Text>
              <Text style={styles.ustBaslik}>{secili?.name}</Text>
              <Text style={styles.not}>{secili?.id} · {secili?.role}</Text>
              <Sayi ad={t('studio.konum')} d={secili?.transform?.position} />
              <Sayi ad={t('studio.donus')} d={secili?.transform?.rotation} />
              <Sayi ad={t('studio.olcek')} d={secili?.transform?.scale} />
              <Pressable style={styles.ikincil} onPress={() => { setSecili(null); setPanel('ai'); setYama(secili?.name ?? ''); }} accessibilityRole="button">
                <Text style={styles.ikincilYazi}>{t('studio.yama')}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

  function kontroller() {
    if (!oynanir) {
      return (
        <Pressable style={styles.ikincil} onPress={props.onTekrar} accessibilityRole="button">
          <Text style={styles.ikincilYazi}>{t('studio.tekrarDene')}</Text>
        </Pressable>
      );
    }
    return (
      <View style={styles.kontroller}>
        <Pressable style={[styles.mod, props.paused && styles.modAcik]} onPress={props.onDuraklat} accessibilityRole="button">
          <Text style={styles.modYazi}>{props.paused ? t('studio.edit') : t('studio.oynaModu')}</Text>
        </Pressable>
        <Ikon ad={props.paused ? 'play' : 'pause'} onPress={props.onDuraklat} etiket={props.paused ? t('studio.oynaModu') : t('studio.duraklat')} />
        <Ikon ad="refresh" onPress={props.onYeniden} etiket={t('studio.yeniden')} />
        <Ikon ad="expand" onPress={props.onTam} etiket={t('studio.tamEkran')} />
      </View>
    );
  }

  function aiKutu() {
    return (
      <View style={styles.kart}>
        <Text style={styles.kicker}>TAMUSO AI</Text>
        <Text style={[styles.not, { textAlign: hizala }]}>{t('studio.aiNot')}</Text>
        <TextInput
          value={yama}
          onChangeText={setYama}
          placeholder={t('studio.aiSoru')}
          placeholderTextColor={K.textDim}
          style={[styles.girdi, { textAlign: hizala }]}
        />
        <View style={styles.satir}>
          <Pressable
            style={[styles.birincil, yama.trim().length < 3 && styles.kapali]}
            disabled={yama.trim().length < 3}
            onPress={() => {
              const yazi = yama.trim();
              setYama('');
              void props.onYama(yazi).then((sonuc) => {
                if (sonuc?.operations?.length) setYamaSonuc(sonuc.operations);
                else if (sonuc?.summary) setYamaSonuc([sonuc.summary]);
              });
            }}
            accessibilityRole="button"
          >
            <Text style={styles.birincilYazi}>{t('studio.yamaGonder')}</Text>
          </Pressable>
          <Pressable style={styles.ikincil} onPress={props.onGeriAl} accessibilityRole="button">
            <Text style={styles.ikincilYazi}>{t('studio.geriAl')}</Text>
          </Pressable>
        </View>
        {yamaSonuc?.map((satir) => (
          <Text key={satir} style={styles.not}>âœ“ {satir.includes(' ') ? satir : t(yamaIslemi(satir))}</Text>
        ))}
      </View>
    );
  }

  function sahneListe() {
    if (!sahne.length) return <Text style={styles.bos}>{t('studio.sahneYok')}</Text>;
    return (
      <View style={styles.liste}>
        {sahne.map((e) => (
          <Pressable key={e.id} style={styles.satirKart} onPress={() => setSecili(e)} accessibilityRole="button">
            <Text style={styles.satirAd}>{e.name}</Text>
            <Text style={styles.not}>{e.role}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  function varlikListe() {
    const liste = varliklar.filter((v) => filtreUygun(filtre, v.type));
    if (!liste.length) return <Text style={styles.bos}>{t('studio.varlikYok')}</Text>;
    return (
      <View style={styles.liste}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.satir}>
          {['hepsi', 'model', 'texture', 'material', 'animation', 'audio', 'image'].map((id) => (
            <Pressable key={id} onPress={() => setFiltre(id)} style={[styles.cip, filtre === id && styles.cipAcik]}>
              <Text style={styles.cipYazi}>{filtreAd(t, id)}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {liste.map((v) => (
          <View key={v.assetKey} style={styles.satirKart}>
            <Text style={styles.satirAd}>{varlikAdi(v.assetKey)}</Text>
            <Text style={styles.not}>{v.type} · {durumInsan(v.status, t)}{teknik && v.provider ? ` · ${v.provider}` : ''}</Text>
            {v.status === 'FAILED' ? (
              <Pressable onPress={props.onTekrar} accessibilityRole="button"><Text style={styles.link}>{t('studio.tekrarDene')}</Text></Pressable>
            ) : null}
          </View>
        ))}
      </View>
    );
  }

  function mantikListe() {
    if (!graf.length) return <Text style={styles.bos}>{t('studio.mantikYok')}</Text>;
    return (
      <View style={styles.liste}>
        {graf.map((n, i) => (
          <View key={n.id}>
            <View style={styles.satirKart}>
              <Text style={styles.kicker}>{n.category}</Text>
              <Text style={styles.satirAd}>{n.action}</Text>
            </View>
            {i < graf.length - 1 ? <Text style={styles.ok}>â†“</Text> : null}
          </View>
        ))}
      </View>
    );
  }

  function sesListe() {
    const ses = varliklar.filter((v) => v.type === 'audio');
    if (!ses.length) return <Text style={styles.bos}>{t('studio.sesYokListe')}</Text>;
    return (
      <View style={styles.liste}>
        {ses.map((v) => {
          const url = adres?.urls[v.assetKey];
          return (
            <View key={v.assetKey} style={styles.satirKart}>
              <Text style={styles.satirAd}>{varlikAdi(v.assetKey)}</Text>
              <Text style={styles.not}>{sesTuru(t, v)} · {durumInsan(v.status, t)}</Text>
              {url && v.status === 'READY' ? (
                <Pressable onPress={() => sesCal(url)} accessibilityRole="button" accessibilityLabel={t('studio.onizle')}>
                  <Ionicons name="play" size={18} color={K.primary} />
                </Pressable>
              ) : null}
              {v.status === 'FAILED' ? <Text style={styles.hata}>{t('studio.sesHata')}</Text> : null}
            </View>
          );
        })}
      </View>
    );
  }

  function etkinlikListe() {
    const satirlar = akis?.activity ?? [];
    if (!satirlar.length) return <Text style={styles.bos}>{props.calisiyor ? t('studio.hazirlaniyorKisa') : t('studio.canli')}</Text>;
    return (
      <View style={styles.liste}>
        {satirlar.map((e, i) => (
          <Text key={`${e.kind}-${i}`} style={styles.not}>
            {saat(e.at)}{t(isAnahtari(e.kind))} · {durumInsan(e.status, t)}
            {teknik && e.errorCode ? ` · ${e.errorCode}` : ''}
          </Text>
        ))}
      </View>
    );
  }

  function olcum() {
    return (
      <View style={styles.kart}>
        <Text style={styles.kicker}>{t('studio.testSaglik')}</Text>
        <Text style={styles.not}>{t('studio.testBakiye')}</Text>
        {props.ist ? <Text style={styles.satirAd}>{t('studio.fps')} {props.ist.fps}</Text> : <Text style={styles.not}>{t('studio.testEdilmedi')}</Text>}
        <Text style={styles.not}>{runtimeHazir ? t('studio.durumOnizleme') : t('studio.hazirlaniyorKisa')}</Text>
        {manifest?.issues?.length ? <Text style={styles.hata}>{manifest.issues.join(', ')}</Text> : null}
      </View>
    );
  }
}


function Ikon({ ad, onPress, etiket }: { ad: 'play' | 'pause' | 'refresh' | 'expand'; onPress: () => void; etiket: string }) {
  return (
    <Pressable onPress={onPress} style={styles.ikon} accessibilityRole="button" accessibilityLabel={etiket}>
      <Ionicons name={ad} size={18} color={K.text} />
    </Pressable>
  );
}

function Sayi({ ad, d }: { ad: string; d?: number[] }) {
  if (!d?.length) return null;
  return <Text style={styles.not}>{ad} {d.map((n) => Number(n).toFixed(1)).join('  ')}</Text>;
}

function saat(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} `;
}

function filtreAd(t: Cevir, id: string): string {
  switch (id) {
    case 'model': return t('studio.filtre3d');
    case 'texture': return t('studio.filtreDoku');
    case 'material': return t('studio.filtreMalzeme');
    case 'animation': return t('studio.filtreAnim');
    case 'audio': return t('studio.filtreSes');
    case 'image': return t('studio.filtreGorsel');
    default: return t('studio.filtreHepsi');
  }
}

function filtreUygun(filtre: string, type: string): boolean {
  if (filtre === 'hepsi') return true;
  return type === filtre;
}

function sesTuru(t: Cevir, v: StudioVarlik): string {
  const kind = String((v.pipeline as { audioKind?: string } | null)?.audioKind ?? '');
  if (kind === 'music') return t('studio.muzik');
  if (kind === 'voice') return t('studio.konusma');
  if (kind === 'ambience') return t('studio.ortam');
  return t('studio.efekt');
}

function sesCal(url: string) {
  try {
    sesCalar?.remove();
  } catch { /* eski calar kapanmis olabilir */ }
  sesCalar = createAudioPlayer(url);
  sesCalar.play();
}

const styles = StyleSheet.create({
  kok: { flex: 1, backgroundColor: K.bg },
  ust: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: BoslukTokenlari.md, paddingVertical: 8 },
  ters: { flexDirection: 'row-reverse' },
  ustMetin: { flex: 1, minWidth: 0 },
  ustBaslik: { color: K.text, fontWeight: '800', fontSize: 18 },
  icerik: { padding: BoslukTokenlari.md, gap: 12, paddingBottom: 24 },
  sahne: { flex: 1, minHeight: 240, overflow: 'hidden', backgroundColor: '#070810' },
  sahneGenis: { height: 520 },
  testEtiket: { position: 'absolute', zIndex: 2, top: 10, left: 12, color: K.text, fontWeight: '800' },
  kart: { borderRadius: 16, borderWidth: 1, borderColor: K.border, backgroundColor: K.bgCard, padding: 14, gap: 8 },
  liste: { gap: 8 },
  gorselSatir: { flexDirection: 'row', gap: 8 },
  gorselBtn: { flex: 1, minWidth: 0, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: K.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  kapakKucuk: { width: 112, height: 64, borderRadius: 10, backgroundColor: K.bgElevated },
  avatarKucuk: { width: 64, height: 64, borderRadius: 32, backgroundColor: K.bgElevated },
  buyuk: { color: K.text, fontSize: 28, fontWeight: '800' },
  kicker: { color: K.primarySoft, fontWeight: '800', letterSpacing: 0.3 },
  suAn: { color: K.text, fontSize: 20, fontWeight: '700' },
  yuzde: { color: K.text, fontSize: 40, fontWeight: '800' },
  cubukIz: { height: 4, borderRadius: 99, backgroundColor: K.border, overflow: 'hidden' },
  cubuk: { height: 4, backgroundColor: K.primary },
  faz: { color: K.text, fontWeight: '700' },
  not: { color: K.textMuted, lineHeight: 18 },
  hata: { color: K.danger, fontWeight: '700' },
  link: { color: K.primary, fontWeight: '800', minHeight: 44, textAlignVertical: 'center' },
  bolum: { color: K.text, fontWeight: '800', marginTop: 8 },
  bos: { color: K.textMuted, paddingVertical: 24 },
  satirKart: { borderRadius: 14, borderWidth: 1, borderColor: K.border, backgroundColor: K.bgCard, padding: 12, gap: 4 },
  satirAd: { color: K.text, fontWeight: '800' },
  satir: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 99, borderWidth: 1, borderColor: K.border, justifyContent: 'center' },
  cipAcik: { borderColor: K.primary, backgroundColor: K.primary },
  cipYazi: { color: K.text, fontWeight: '700' },
  girdi: { minHeight: 72, color: K.text, borderRadius: 12, borderWidth: 1, borderColor: K.border, padding: 12, backgroundColor: K.bgElevated },
  birincil: { minHeight: 48, borderRadius: 14, backgroundColor: K.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  birincilYazi: { color: K.textOnPrimary, fontWeight: '800' },
  ikincil: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: K.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: K.bgCard },
  ikincilYazi: { color: K.text, fontWeight: '800' },
  kapali: { opacity: 0.4 },
  kontroller: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ikon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: K.bgCard },
  mod: { minHeight: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: K.border, justifyContent: 'center' },
  modAcik: { borderColor: K.primary },
  modYazi: { color: K.text, fontWeight: '800' },
  testBtn: { minHeight: 40, paddingHorizontal: 12, borderRadius: 99, backgroundColor: K.primary, justifyContent: 'center' },
  testBtnYazi: { color: K.textOnPrimary, fontWeight: '800' },
  altNav: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: K.border, backgroundColor: K.bg },
  nav: { flex: 1, minWidth: 0, minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  navYazi: { color: K.textMuted, fontSize: 11, fontWeight: '700' },
  navAcik: { color: K.primary },
  perde: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: K.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, gap: 8 },
  genisSatir: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  yan: { width: 260 },
  orta: { flex: 1, gap: 12 },
  ok: { color: K.textDim, textAlign: 'center' },
  sahneKok: { flex: 1, backgroundColor: '#070810' },
  sahneTam: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#070810' },
  ustPerde: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 },
  ustGel: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  ustYuzer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, paddingHorizontal: 12, paddingBottom: 16 },
  daire: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,13,24,0.72)' },
  testRozet: { minHeight: 32, paddingHorizontal: 12, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,13,24,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  testRozetYazi: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  sol: { position: 'absolute', left: 12, top: 92, bottom: 100, width: 180, borderRadius: 16, backgroundColor: 'rgba(12,13,24,0.72)', padding: 10 },
  aracSutun: { position: 'absolute', right: 8, zIndex: 60, justifyContent: 'center', gap: 14 },
  aracSutunRtl: { right: undefined, left: 10 },
  aracBtn: { width: 64, alignItems: 'center' },
  aracBtnAcik: { borderWidth: 1, borderColor: '#E85CA8' },
  aracYazi: { color: 'rgba(255,255,255,0.78)', fontSize: 10, fontWeight: '700', marginTop: 2 },
  isHapi: { position: 'absolute', left: 16, bottom: 108, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(12,13,24,0.82)' },
  dock: { position: 'absolute', left: 16, right: 16, bottom: 12, zIndex: 70, minHeight: 68, borderRadius: 24, backgroundColor: 'rgba(12,13,25,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 12 },
  dockSik: { minHeight: 56 },
  oyna: { flex: 1, minHeight: 44, borderRadius: 16, backgroundColor: '#E85CA8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  oynaYazi: { color: '#fff', fontWeight: '800' },
  dockYazi: { color: '#fff', fontWeight: '700' },
  cikis: { minHeight: 40, paddingHorizontal: 12, borderRadius: 99, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.08)' },
  fps: { position: 'absolute', left: 16, top: 72, color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  sayfa: { maxHeight: 360 },
});
