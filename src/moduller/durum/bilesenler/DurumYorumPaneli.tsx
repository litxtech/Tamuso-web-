import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKlavyeYuksekligi } from '../../../bilesenler/klavye/useKlavyeYuksekligi';
import { ProfilAvatarKucuk } from '../../canli-sohbet/bilesenler/ProfilAvatarKucuk';
import {
  DurumYorumBegeniToggle,
  DurumYorumEkle,
  DurumYorumSil,
  DurumYorumlariGetir,
  type DurumYorum,
} from '../islemler/DurumIslemleri';
import { DurumMedyasiSecVeYukle } from '../islemler/DurumMedyasiYukle';
import { DurumTarihSaat } from '../islemler/DurumZaman';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { MesajBaglantiliMetin } from '../../mesajlasma/bilesenler/MesajBaglantiliMetin';
import { MesajComposerLinkOnizleme } from '../../mesajlasma/bilesenler/MesajComposerLinkOnizleme';
import { BaglantiOnizlemeBlok } from '../../baglanti/bilesenler/BaglantiOnizlemeBlok';
import { DurumResimLightbox } from './DurumResimLightbox';
import { KullaniciGuvenlikMenusu } from '../../moderasyon/bilesenler/KullaniciGuvenlikMenusu';
import { DogrulanmisTik } from '../../kullanici-profili/bilesenler/DogrulanmisTik';
import { UserIdentityRow } from '../../unvanlar/bilesenler/UserIdentityRow';
import { useUnvanKatalog } from '../../unvanlar/kancalar/useUnvanKatalog';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  visible: boolean;
  statusId: string;
  canModerate?: boolean;
  onClose: () => void;
  onChanged?: () => void;
  onProfil?: (userId: string) => void;
};

type Satir =
  | { kind: 'root'; yorum: DurumYorum; yanitlar: DurumYorum[] }
  | { kind: 'reply'; yorum: DurumYorum; rootId: string };

export function DurumYorumPaneli({
  visible,
  statusId,
  canModerate,
  onClose,
  onChanged,
  onProfil,
}: Props) {
  const { t } = useCeviri();
  useUnvanKatalog();
  const insets = useSafeAreaInsets();
  const { yukseklik: klavyeH, acik: klavyeAcik } = useKlavyeYuksekligi(0);
  const [yorumlar, setYorumlar] = useState<DurumYorum[]>([]);
  const [metin, setMetin] = useState('');
  const [medyaUrl, setMedyaUrl] = useState<string | null>(null);
  const [yanitHedef, setYanitHedef] = useState<DurumYorum | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [medyaBusy, setMedyaBusy] = useState(false);
  const [bildirYorum, setBildirYorum] = useState<DurumYorum | null>(null);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  const yukle = async () => {
    setYukleniyor(true);
    try {
      setYorumlar(await DurumYorumlariGetir(statusId));
    } catch {
      setYorumlar([]);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    if (visible) void yukle();
  }, [visible, statusId]);

  const satirlar = useMemo(() => {
    const roots = yorumlar.filter((y) => !y.parent_id);
    const byParent = new Map<string, DurumYorum[]>();
    for (const y of yorumlar) {
      if (!y.parent_id) continue;
      const list = byParent.get(y.parent_id) ?? [];
      list.push(y);
      byParent.set(y.parent_id, list);
    }
    const out: Satir[] = [];
    for (const root of roots) {
      out.push({ kind: 'root', yorum: root, yanitlar: byParent.get(root.id) ?? [] });
      for (const r of byParent.get(root.id) ?? []) {
        out.push({ kind: 'reply', yorum: r, rootId: root.id });
      }
    }
    return out;
  }, [yorumlar]);

  const gonderilebilir = !!metin.trim() || !!medyaUrl;

  const gonder = async () => {
    if (!gonderilebilir || busy) return;
    setBusy(true);
    const r = await DurumYorumEkle(statusId, metin.trim(), {
      parentId: yanitHedef?.parent_id ?? yanitHedef?.id ?? null,
      mediaUrl: medyaUrl,
    });
    setBusy(false);
    if (!r.ok) {
      Alert.alert(t('durumX.yorum'), r.hata ?? t('durumX.gonderilemedi'));
      return;
    }
    setMetin('');
    setMedyaUrl(null);
    setYanitHedef(null);
    await yukle();
    onChanged?.();
  };

  const resimSec = async () => {
    if (medyaBusy) return;
    setMedyaBusy(true);
    const r = await DurumMedyasiSecVeYukle('image');
    setMedyaBusy(false);
    if (!r.ok) {
      if (!r.iptal) Alert.alert(t('ortak.medya'), r.hata);
      return;
    }
    setMedyaUrl(MedyaUriGuvenli(r.url));
  };

  const sil = (y: DurumYorum) => {
    if (!y.is_mine && !canModerate) return;
    Alert.alert(t('durumX.yorumuSil'), t('durumX.yorumuSilBody'), [
      { text: t('ortak.vazgec'), style: 'cancel' },
      {
        text: t('ortak.sil'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const r = await DurumYorumSil(y.id);
            if (!r.ok) {
              Alert.alert(t('durumX.yorum'), r.hata ?? t('durum.silinemedi'));
            } else {
              await yukle();
              onChanged?.();
            }
          })();
        },
      },
    ]);
  };

  const begen = (y: DurumYorum) => {
    void (async () => {
      const r = await DurumYorumBegeniToggle(y.id);
      if (!r.ok) {
        Alert.alert(t('durum.begeni'), r.hata ?? t('durum.basarisiz'));
        return;
      }
      setYorumlar((prev) =>
        prev.map((item) =>
          item.id === y.id
            ? {
                ...item,
                liked_by_me: !!r.liked,
                like_count: r.like_count ?? item.like_count,
              }
            : item,
        ),
      );
    })();
  };

  const renderYorum = (item: Satir) => {
    const y = item.yorum;
    const yanitMi = item.kind === 'reply';

    return (
      <View style={[styles.satir, yanitMi && styles.satirYanit]}>
        <Pressable onPress={() => onProfil?.(y.user_id)} hitSlop={4}>
          <ProfilAvatarKucuk
            size={yanitMi ? 28 : 36}
            displayName={y.display_name}
            username={y.username}
            avatarUrl={y.avatar_url}
          />
        </Pressable>

        <View style={styles.satirGovde}>
          <View style={styles.balon}>
            <Pressable
              onPress={() => onProfil?.(y.user_id)}
              style={styles.isimSatir}
            >
              <UserIdentityRow
                displayName={y.display_name}
                verified={!!y.is_verified}
                titleId={y.selected_title_id}
                size="COMPACT"
                nameStyle={styles.satirIsim}
              />
            </Pressable>
            {y.body ? (
              <>
                <MesajBaglantiliMetin
                  text={y.body}
                  style={styles.satirBody}
                />
                <BaglantiOnizlemeBlok
                  metin={y.body}
                  style={styles.yorumLink}
                />
              </>
            ) : null}
            {y.media_url && /^https?:\/\//i.test(y.media_url.trim()) ? (
              <Pressable
                onPress={() => setLightboxUri(y.media_url!.trim())}
                style={styles.yorumResimHit}
              >
                <Image
                  source={{ uri: y.media_url.trim() }}
                  style={styles.yorumResim}
                  resizeMode="cover"
                />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.metaSatir}>
            <Text style={styles.zaman}>{DurumTarihSaat(y.created_at)}</Text>

            <Pressable style={styles.metaBtn} onPress={() => begen(y)} hitSlop={8}>
              <Ionicons
                name={y.liked_by_me ? 'heart' : 'heart-outline'}
                size={14}
                color={y.liked_by_me ? RenkTokenlari.danger : RenkTokenlari.textDim}
              />
              {y.like_count > 0 ? (
                <Text
                  style={[
                    styles.metaYazi,
                    y.liked_by_me && { color: RenkTokenlari.danger },
                  ]}
                >
                  {y.like_count}
                </Text>
              ) : (
                <Text style={styles.metaYazi}>{t('durumX.begen')}</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.metaBtn}
              onPress={() => setYanitHedef(y)}
              hitSlop={8}
            >
              <Text style={styles.metaYazi}>{t('durumX.yanitla')}</Text>
            </Pressable>

            {!y.is_mine ? (
              <Pressable
                style={styles.metaBtn}
                onPress={() => setBildirYorum(y)}
                hitSlop={8}
              >
                <Ionicons
                  name="flag-outline"
                  size={13}
                  color={RenkTokenlari.textDim}
                />
                <Text style={styles.metaYazi}>{t('profil.bildir')}</Text>
              </Pressable>
            ) : null}

            {y.is_mine || canModerate ? (
              <Pressable style={styles.metaBtn} onPress={() => sil(y)} hitSlop={8}>
                <Text style={[styles.metaYazi, { color: RenkTokenlari.danger }]}>
                  {t('ortak.sil')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View
            style={[
              styles.sheet,
              {
                marginBottom:
                  Platform.OS === 'android' && klavyeAcik ? klavyeH : 0,
                paddingBottom: klavyeAcik
                  ? Platform.OS === 'android'
                    ? BoslukTokenlari.md
                    : Math.max(BoslukTokenlari.md, klavyeH)
                  : Math.max(BoslukTokenlari.lg, insets.bottom + 8),
              },
            ]}
          >
            <View style={styles.handle} />
            <View style={styles.baslikSatir}>
              <Text style={styles.baslik}>{t('durumX.yorumlar')}</Text>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                style={styles.kapatBtn}
                accessibilityLabel={t('ortak.kapat')}
              >
                <Ionicons name="close" size={22} color={RenkTokenlari.textMuted} />
              </Pressable>
            </View>

            {yukleniyor && !yorumlar.length ? (
              <ActivityIndicator
                color={RenkTokenlari.primarySoft}
                style={{ marginTop: 24 }}
              />
            ) : (
              <FlatList
                data={satirlar}
                keyExtractor={(i) => i.yorum.id}
                contentContainerStyle={styles.list}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ListEmptyComponent={
                  <Text style={styles.bos}>{t('durumX.henuzYorumYok')}</Text>
                }
                renderItem={({ item }) => renderYorum(item)}
              />
            )}

            {yanitHedef ? (
              <View style={styles.yanitBar}>
                <Text style={styles.yanitBarYazi} numberOfLines={1}>
                  {t('durumX.yanitlaniyor', { ad: yanitHedef.display_name })}
                </Text>
                <Pressable onPress={() => setYanitHedef(null)} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={RenkTokenlari.textDim} />
                </Pressable>
              </View>
            ) : null}

            {medyaUrl ? (
              <View style={styles.onizlemeSatir}>
                <Pressable onPress={() => setLightboxUri(medyaUrl)}>
                  <Image
                    source={{ uri: medyaUrl }}
                    style={styles.onizleme}
                    resizeMode="cover"
                  />
                </Pressable>
                <Pressable
                  style={styles.onizlemeSil}
                  onPress={() => setMedyaUrl(null)}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ) : null}

            <MesajComposerLinkOnizleme metin={metin} />

            <View style={styles.inputSatir}>
              <Pressable
                style={styles.medyaBtn}
                onPress={() => void resimSec()}
                disabled={medyaBusy}
                hitSlop={6}
                accessibilityLabel={t('durumX.yorumaResimEkle')}
              >
                {medyaBusy ? (
                  <ActivityIndicator size="small" color={RenkTokenlari.primarySoft} />
                ) : (
                  <Ionicons
                    name="image-outline"
                    size={22}
                    color={RenkTokenlari.textMuted}
                  />
                )}
              </Pressable>
              <TextInput
                style={styles.input}
                value={metin}
                onChangeText={setMetin}
                placeholder={
                  yanitHedef
                    ? t('durumX.yanitYaz', { ad: yanitHedef.display_name })
                    : t('durumX.yorumYaz')
                }
                placeholderTextColor={RenkTokenlari.textDim}
                maxLength={500}
                multiline
              />
              <Pressable
                style={[styles.gonder, !gonderilebilir && { opacity: 0.4 }]}
                onPress={() => void gonder()}
                disabled={!gonderilebilir || busy}
              >
                <Ionicons name="send" size={18} color="#12040C" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {bildirYorum ? (
        <KullaniciGuvenlikMenusu
          visible
          targetUserId={bildirYorum.user_id}
          targetName={bildirYorum.display_name}
          contentType="status_comment"
          contentId={bildirYorum.id}
          contentPreview={bildirYorum.body}
          contentMediaUrl={bildirYorum.media_url}
          onClose={() => setBildirYorum(null)}
          onReported={() => setBildirYorum(null)}
        />
      ) : null}

      <DurumResimLightbox
        uri={lightboxUri}
        onClose={() => setLightboxUri(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 1,
    elevation: 1,
  },
  sheet: {
    maxHeight: '82%',
    minHeight: '52%',
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    zIndex: 3,
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginTop: 10,
    marginBottom: 4,
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: BoslukTokenlari.lg,
    marginBottom: 4,
    minHeight: 40,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    textAlign: 'center',
    flex: 1,
  },
  kapatBtn: {
    position: 'absolute',
    right: BoslukTokenlari.md,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: 12,
    paddingTop: 4,
    gap: 14,
    flexGrow: 1,
  },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 22,
  },
  satir: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  satirYanit: {
    marginLeft: 36,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: RenkTokenlari.border,
  },
  satirGovde: { flex: 1, minWidth: 0, gap: 6 },
  balon: {
    backgroundColor: RenkTokenlari.bgCard,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  satirIsim: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
    fontSize: 13,
    flexShrink: 1,
  },
  isimSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  satirBody: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontSize: 15,
    lineHeight: 22,
  },
  yorumLink: {
    marginTop: 6,
    maxWidth: '100%',
  },
  yorumResimHit: {
    marginTop: 6,
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  yorumResim: {
    width: 160,
    height: 160,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  metaSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 4,
  },
  zaman: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  metaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 28,
  },
  metaYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
  },
  yanitBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingVertical: 6,
    backgroundColor: RenkTokenlari.bgCard,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
  },
  yanitBarYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    flex: 1,
  },
  onizlemeSatir: {
    position: 'relative',
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: 8,
    alignSelf: 'flex-start',
  },
  onizleme: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  onizlemeSil: {
    position: 'absolute',
    top: 2,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputSatir: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
    alignItems: 'flex-end',
  },
  medyaBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: RenkTokenlari.text,
    ...TipografiTokenlari.body,
    fontSize: 15,
    lineHeight: 20,
  },
  gonder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: RenkTokenlari.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
