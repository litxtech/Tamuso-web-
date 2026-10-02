import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { useAuth } from '../../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminKycBasvuruSil,
  AdminKycDetayGetir,
  AdminKycDurumGuncelle,
  type AdminKycDetay,
} from '../../../src/moduller/admin/kyc/AdminKycIslemleri';
import { ProfilMedyaBuyutucu } from '../../../src/moduller/kullanici-profili/bilesenler/ProfilMedyaBuyutucu';
import { MedyaUriOnizlemeGuvenli } from '../../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { AdminStil } from '../../../src/moduller/admin/bilesenler/AdminStil';
import { LedgerBirimEtiketi, LedgerSebepEtiketi } from '../../../src/moduller/cuzdan/okuma/CuzdanLedgeriniGetir';
import { AdminLogAnlasilirMetin } from '../../../src/moduller/admin/kullanici/AdminLogAnlasilirMetin';
import {
  BelgePdfPaylas,
  BelgeYazdir,
  WhatsAppBelgeGonder,
} from '../../../src/moduller/belge-paylasim/BelgePaylasimIslemleri';
import {
  KimlikSonrasiAktiviteBelgesiOlustur,
  magazaEtiketi,
  odemeDurumEtiketi,
} from '../../../src/moduller/admin/kyc/KimlikSonrasiAktiviteBelgesi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const DOC_LABEL: Record<string, string> = {
  id_card: 'Kimlik',
  passport: 'Pasaport',
  drivers_license: 'Ehliyet',
  temporary_id: 'Geçici kimlik',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Bekliyor',
  approved: 'Onaylı',
  rejected: 'Reddedildi',
  draft: 'Taslak',
};

function tr(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('tr-TR');
  } catch {
    return iso;
  }
}

function formatCuzdanNo(raw?: string | null) {
  const d = (raw ?? '').replace(/\D/g, '');
  if (d.length < 8) return raw || '—';
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function Satir({ e, d }: { e: string; d: string }) {
  return (
    <View style={styles.satir}>
      <Text style={styles.etiket}>{e}</Text>
      <Text style={styles.deger}>{d || '—'}</Text>
    </View>
  );
}

function Bolum({
  baslik,
  children,
}: {
  baslik: string;
  children: React.ReactNode;
}) {
  return (
    <View style={AdminStil.kart}>
      <Text style={styles.bolumBaslik}>{baslik}</Text>
      {children}
    </View>
  );
}

export default function AdminKycDetayEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const admin = AdminYetkisiVarMi(profile);
  const [detay, setDetay] = useState<AdminKycDetay | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);
  const [belgeBusy, setBelgeBusy] = useState(false);
  const [redNot, setRedNot] = useState('');
  const [buyutUri, setBuyutUri] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      setDetay(await AdminKycDetayGetir(id));
    } catch (e) {
      Alert.alert('KYC', e instanceof Error ? e.message : 'Yüklenemedi');
      setDetay(null);
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

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

  const sil = () => {
    if (!detay) return;
    const r = detay.basvuru;
    Alert.alert(
      'Kimlik onayını sil',
      `${r.first_name} ${r.last_name} kaydı, belgeleri ve cüzdan kimlik durumu kaldırılacak.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await AdminKycBasvuruSil(r.id);
                Alert.alert('Tamam', 'Kimlik onayı silindi.');
                router.replace('/admin/kyc' as any);
              } catch (e) {
                Alert.alert(
                  'Hata',
                  e instanceof Error ? e.message : 'Silinemedi',
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  const karar = (status: 'approved' | 'rejected') => {
    if (!detay) return;
    const r = detay.basvuru;
    const not =
      status === 'rejected' ? redNot.trim() || undefined : undefined;
    Alert.alert(
      status === 'approved' ? 'Onayla' : 'Reddet',
      `${r.first_name} ${r.last_name}${not ? `\nNot: ${not}` : ''}`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: status === 'approved' ? 'Onayla' : 'Reddet',
          style: status === 'rejected' ? 'destructive' : 'default',
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await AdminKycDurumGuncelle(r.id, status, not);
                setRedNot('');
                await yukle();
                Alert.alert(
                  'Tamam',
                  status === 'approved'
                    ? 'Kimlik onaylandı.'
                    : 'Başvuru reddedildi.',
                );
              } catch (e) {
                Alert.alert(
                  'Hata',
                  e instanceof Error ? e.message : 'İşlem başarısız',
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  const b = detay?.basvuru;
  const p = detay?.dosya?.profil;
  const c = detay?.cuzdan;
  const d = detay?.dosya;
  const pending = b?.status === 'pending';

  // KYC sonrası aktivite: başvuru tarihinden sonraki hareketler
  const basvuruMs = b ? new Date(b.created_at).getTime() : 0;
  const hareketlerSonrasi = (d?.hareketler ?? []).filter(
    (h) => new Date(h.created_at).getTime() >= basvuruMs,
  );
  const hediyelerSonrasi = (d?.hediye_akis ?? []).filter(
    (h) => new Date(h.created_at).getTime() >= basvuruMs,
  );
  const yuklemelerSonrasi = (d?.yuklemeler ?? []).filter(
    (y) => new Date(y.tarih).getTime() >= basvuruMs,
  );
  const adminLogSonrasi = (d?.admin_loglari ?? []).filter(
    (l) => new Date(l.created_at).getTime() >= basvuruMs,
  );

  const belgeIslem = async (tur: 'yazdir' | 'pdf' | 'whatsapp') => {
    if (!b) return;
    const ad =
      p?.display_name ||
      b.profiles?.display_name ||
      (b.profiles?.username ? `@${b.profiles.username}` : 'Kullanıcı');
    const icerik = KimlikSonrasiAktiviteBelgesiOlustur({
      basvuru: b,
      ad,
      yuklemeler: yuklemelerSonrasi,
      hareketler: hareketlerSonrasi,
      hediyeler: hediyelerSonrasi,
      loglar: adminLogSonrasi,
    });
    const telefon = b.phone_e164 || p?.phone_e164;
    setBelgeBusy(true);
    try {
      const sonuc =
        tur === 'yazdir'
          ? await BelgeYazdir(icerik)
          : tur === 'pdf'
            ? await BelgePdfPaylas(icerik)
            : await WhatsAppBelgeGonder(icerik, telefon);
      if (!sonuc.ok) {
        Alert.alert('Belge', sonuc.hata);
      }
    } finally {
      setBelgeBusy(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Kimlik başvuru detayı"
        subtitle={
          b
            ? `${b.first_name} ${b.last_name} · ${STATUS_LABEL[b.status] ?? b.status}`
            : 'Yükleniyor…'
        }
        fallbackHref="/admin/kyc"
      />

      {yukleniyor && !detay ? (
        <ActivityIndicator
          color={RenkTokenlari.primarySoft}
          style={{ marginTop: 40 }}
        />
      ) : !detay || !b ? (
        <Text style={[AdminStil.bos, { marginTop: 24 }]}>
          Başvuru bulunamadı
        </Text>
      ) : (
        <ScrollView
          contentContainerStyle={AdminStil.content}
          refreshControl={
            <RefreshControl
              refreshing={yukleniyor}
              onRefresh={() => void yukle()}
              tintColor={RenkTokenlari.primarySoft}
            />
          }
        >
          <Bolum baslik="Kimlik başvurusu">
            <Satir e="Durum" d={STATUS_LABEL[b.status] ?? b.status} />
            <Satir e="Ad" d={b.first_name} />
            <Satir e="Soyad" d={b.last_name} />
            <Satir e="Doğum" d={b.birth_date} />
            <Satir e="Memleket" d={b.hometown ?? '—'} />
            <Satir e="Telefon" d={b.phone_e164 ?? '—'} />
            <Satir e="E-posta" d={b.email ?? '—'} />
            <Satir e="Ülke" d={b.country ?? '—'} />
            <Satir e="Uyruk" d={b.nationality ?? '—'} />
            <Satir e="Belge" d={DOC_LABEL[b.doc_type] ?? b.doc_type} />
            <Satir
              e="Canlılık"
              d={b.liveness_passed ? 'Geçti' : 'Yok / başarısız'}
            />
            <Satir e="Başvuru" d={tr(b.created_at)} />
            <Satir e="İnceleme" d={tr(b.reviewed_at)} />
            {b.admin_note ? <Satir e="Admin notu" d={b.admin_note} /> : null}
          </Bolum>

          <Bolum baslik="Belgeler (uygulama içi)">
            <Text style={styles.ipucu}>
              Küçük önizlemeye dokun → tam ekran açılır
            </Text>
            <View style={styles.belgeGrid}>
              {[
                { id: 'on', etiket: 'Ön yüz', uri: detay.belgeler.on },
                { id: 'arka', etiket: 'Arka yüz', uri: detay.belgeler.arka },
                { id: 'selfie', etiket: 'Selfie', uri: detay.belgeler.selfie },
              ].map((item) => {
                const belgeUri = MedyaUriOnizlemeGuvenli(item.uri);
                return belgeUri ? (
                  <Pressable
                    key={item.id}
                    style={styles.belgeKart}
                    onPress={() => setBuyutUri(belgeUri)}
                  >
                    <Image
                      source={{ uri: belgeUri }}
                      style={styles.belgeImg}
                      resizeMode="cover"
                    />
                    <Text style={styles.belgeEtiket}>{item.etiket}</Text>
                  </Pressable>
                ) : item.etiket === 'Arka yüz' && !b.doc_back_path ? null : (
                  <View key={item.id} style={styles.belgeKart}>
                    <View style={[styles.belgeImg, styles.belgeBos]}>
                      <Text style={AdminStil.kartAlt}>Yok</Text>
                    </View>
                    <Text style={styles.belgeEtiket}>{item.etiket}</Text>
                  </View>
                );
              })}
            </View>
          </Bolum>

          <Bolum baslik="Hesap bilgileri">
            <Satir
              e="Görünen ad"
              d={
                p?.display_name ||
                b.profiles?.display_name ||
                '—'
              }
            />
            <Satir
              e="Kullanıcı adı"
              d={
                p?.username
                  ? `@${p.username}`
                  : b.profiles?.username
                    ? `@${b.profiles.username}`
                    : '—'
              }
            />
            <Satir
              e="Public ID"
              d={
                p?.public_user_id ||
                b.profiles?.public_user_id ||
                '—'
              }
            />
            <Satir e="Telefon (profil)" d={p?.phone_e164 ?? '—'} />
            <Satir e="Ülke (profil)" d={p?.country ?? '—'} />
            <Satir e="Dil" d={p?.language ?? '—'} />
            <Satir e="Seviye / XP" d={p ? `${p.level} / ${p.xp}` : '—'} />
            <Satir
              e="Roller"
              d={
                [
                  p?.is_admin ? 'Admin' : null,
                  p?.is_host ? 'Host' : null,
                  p?.is_verified ? 'Doğrulanmış' : null,
                  p?.is_guest ? 'Misafir' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Üye'
              }
            />
            <Satir e="Kayıt" d={tr(p?.created_at)} />
            <Satir e="Ban" d={p?.banned_at ? tr(p.banned_at) : 'Yok'} />
            {p?.ban_reason ? <Satir e="Ban sebebi" d={p.ban_reason} /> : null}
            <Pressable
              style={{ marginTop: 8 }}
              onPress={() =>
                router.push(`/admin/kullanicilar/${b.user_id}` as any)
              }
            >
              <Text style={AdminStil.aksiyonYazi}>Tam kullanıcı dosyası →</Text>
            </Pressable>
          </Bolum>

          <Bolum baslik="MUTA PAY cüzdan">
            <Satir e="Marka" d={c?.wallet_brand_name ?? 'MUTA PAY'} />
            <Satir e="Cüzdan no" d={formatCuzdanNo(c?.wallet_number)} />
            <Satir
              e="Yasal ad"
              d={
                c?.legal_first_name || c?.legal_last_name
                  ? `${c?.legal_first_name ?? ''} ${c?.legal_last_name ?? ''}`.trim()
                  : '—'
              }
            />
            <Satir e="KYC durumu" d={c?.kyc_status ?? '—'} />
            <Satir
              e="Coin"
              d={(d?.cuzdan.coins ?? 0).toLocaleString('tr-TR')}
            />
            <Satir
              e="Elmas"
              d={(d?.cuzdan.diamonds ?? 0).toLocaleString('tr-TR')}
            />
          </Bolum>

          {d ? (
            <Bolum baslik="Risk & ihtar">
              <Satir
                e="Risk"
                d={`${d.risk.skor}/100 · ${d.risk.seviye}`}
              />
              {(d.risk.notlar ?? []).map((n, i) => (
                <Text key={`${n}-${i}`} style={AdminStil.kartAlt}>
                  · {n}
                </Text>
              ))}
              <Satir e="Aktif ihtar" d={String(d.ihtar.aktif_adet)} />
              <Satir e="Açık rapor" d={String(d.risk.acik_rapor)} />
            </Bolum>
          ) : null}

          <Bolum baslik="Kimlik sonrası aktivite">
            <Text style={styles.ipucu}>
              Başvuru tarihinden ({tr(b.created_at)}) itibaren hesap hareketleri
            </Text>
            <View style={styles.paylasSatir}>
              <Pressable
                style={[styles.paylasBtn, belgeBusy && { opacity: 0.5 }]}
                disabled={belgeBusy}
                onPress={() => void belgeIslem('yazdir')}
              >
                <Text style={styles.paylasYazi}>Yazdır</Text>
              </Pressable>
              <Pressable
                style={[styles.paylasBtn, belgeBusy && { opacity: 0.5 }]}
                disabled={belgeBusy}
                onPress={() => void belgeIslem('pdf')}
              >
                <Text style={styles.paylasYazi}>PDF</Text>
              </Pressable>
              <Pressable
                style={[styles.paylasBtn, styles.waBtn, belgeBusy && { opacity: 0.5 }]}
                disabled={belgeBusy}
                onPress={() => void belgeIslem('whatsapp')}
              >
                <Text style={[styles.paylasYazi, { color: '#25D366' }]}>WhatsApp</Text>
              </Pressable>
            </View>

            <Text style={styles.altBaslik}>
              Yüklemeler ({yuklemelerSonrasi.length})
            </Text>
            {yuklemelerSonrasi.length === 0 ? (
              <Text style={AdminStil.kartAlt}>Yükleme yok</Text>
            ) : (
              yuklemelerSonrasi.slice(0, 20).map((y) => (
                <Satir
                  key={y.id}
                  e={tr(y.tarih)}
                  d={`${y.coin.toLocaleString('tr-TR')} coin · ${magazaEtiketi(y.store ?? y.provider)} · ${odemeDurumEtiketi(y.status)}`}
                />
              ))
            )}

            <Text style={styles.altBaslik}>
              Cüzdan hareketleri ({hareketlerSonrasi.length})
            </Text>
            {hareketlerSonrasi.length === 0 ? (
              <Text style={AdminStil.kartAlt}>Hareket yok</Text>
            ) : (
              hareketlerSonrasi.slice(0, 30).map((h) => (
                <Satir
                  key={h.id}
                  e={tr(h.created_at)}
                  d={`${h.delta > 0 ? '+' : ''}${h.delta.toLocaleString('tr-TR')} ${LedgerBirimEtiketi(h.currency)} · ${LedgerSebepEtiketi(h.reason)} · bakiye ${h.balance_after.toLocaleString('tr-TR')}`}
                />
              ))
            )}

            <Text style={styles.altBaslik}>
              Hediyeler ({hediyelerSonrasi.length})
            </Text>
            {hediyelerSonrasi.length === 0 ? (
              <Text style={AdminStil.kartAlt}>Hediye yok</Text>
            ) : (
              hediyelerSonrasi.slice(0, 20).map((h) => (
                <Satir
                  key={h.id}
                  e={`${h.yon === 'gonderilen' ? '→' : '←'} ${h.karsi_ad}`}
                  d={
                    h.yon === 'gonderilen'
                      ? `−${h.coins_spent} coin · ${tr(h.created_at)}`
                      : `+${h.diamonds_earned} elmas · ${tr(h.created_at)}`
                  }
                />
              ))
            )}

            <Text style={styles.altBaslik}>
              Yönetim logları ({adminLogSonrasi.length})
            </Text>
            {adminLogSonrasi.length === 0 ? (
              <Text style={AdminStil.kartAlt}>Log yok</Text>
            ) : (
              adminLogSonrasi.slice(0, 20).map((l) => (
                <Satir
                  key={l.id}
                  e={tr(l.created_at)}
                  d={AdminLogAnlasilirMetin(l.action, l.summary)}
                />
              ))
            )}

            {d?.oturum ? (
              <>
                <Text style={styles.altBaslik}>Oturum / cihaz</Text>
                <Satir
                  e="Aktif süre"
                  d={d.oturum.tahmini_aktif_metin}
                />
                <Satir e="Platformlar" d={d.oturum.platformlar} />
                {(d.oturum.cihazlar ?? []).slice(0, 8).map((cihaz) => (
                  <Satir
                    key={cihaz.device_id}
                    e={cihaz.platform ?? 'cihaz'}
                    d={`${cihaz.model ?? '?'} · ${cihaz.sure_metin} · ${tr(cihaz.son_gorulme)}`}
                  />
                ))}
              </>
            ) : null}
          </Bolum>

          {pending ? (
            <Bolum baslik="Karar">
              <TextInput
                style={styles.notInput}
                value={redNot}
                onChangeText={setRedNot}
                placeholder="Red notu (opsiyonel)"
                placeholderTextColor={RenkTokenlari.textDim}
              />
              <View style={styles.kararSatir}>
                <Pressable
                  style={[styles.kararBtn, styles.onayBtn, busy && { opacity: 0.5 }]}
                  disabled={busy}
                  onPress={() => karar('approved')}
                >
                  <Text style={styles.onayYazi}>Onayla</Text>
                </Pressable>
                <Pressable
                  style={[styles.kararBtn, styles.redBtn, busy && { opacity: 0.5 }]}
                  disabled={busy}
                  onPress={() => karar('rejected')}
                >
                  <Text style={styles.redYazi}>Reddet</Text>
                </Pressable>
              </View>
            </Bolum>
          ) : (
            <Bolum baslik="Karar">
              <Text style={AdminStil.kartAlt}>
                Bu başvuru zaten işlendi ({STATUS_LABEL[b.status] ?? b.status}).
              </Text>
            </Bolum>
          )}

          <Pressable
            style={[styles.silBtn, busy && { opacity: 0.5 }]}
            disabled={busy}
            onPress={sil}
          >
            <Text style={styles.redYazi}>Kimlik onayını sil</Text>
          </Pressable>
        </ScrollView>
      )}

      <ProfilMedyaBuyutucu
        uri={buyutUri}
        onKapat={() => setBuyutUri(null)}
        tur="cover"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bolumBaslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  satir: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  etiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    width: 110,
    fontWeight: '700',
  },
  deger: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    flex: 1,
    fontWeight: '600',
  },
  ipucu: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginBottom: 8,
  },
  altBaslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 4,
  },
  belgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  belgeKart: {
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    gap: 6,
  },
  belgeImg: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgElevated,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  belgeBos: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  belgeEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    fontWeight: '700',
  },
  notInput: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: RenkTokenlari.bgElevated,
    marginBottom: 10,
  },
  kararSatir: {
    flexDirection: 'row',
    gap: 10,
  },
  paylasSatir: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  paylasBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  waBtn: {
    borderColor: 'rgba(37, 211, 102, 0.45)',
  },
  paylasYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  kararBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
  },
  onayBtn: {
    borderColor: `${RenkTokenlari.mint}66`,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
  },
  redBtn: {
    borderColor: `${RenkTokenlari.danger}66`,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  onayYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.mint,
    fontWeight: '800',
  },
  redYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.danger,
    fontWeight: '800',
  },
  silBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: `${RenkTokenlari.danger}66`,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
});
