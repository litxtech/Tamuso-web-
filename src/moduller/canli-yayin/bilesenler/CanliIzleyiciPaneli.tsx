import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TamusoModal } from '../../../bilesenler/yuzey/TamusoModal';
import { ProfilAvatarKucuk } from '../../canli-sohbet/bilesenler/ProfilAvatarKucuk';
import { SeviyeTaci } from '../../ses-odalari/bilesenler/SeviyeTaci';
import { DogrulanmisTik } from '../../kullanici-profili/bilesenler/DogrulanmisTik';
import {
  CanliYayinIzleyicileriniGetir,
  type CanliIzleyici,
} from '../okuma/CanliYayinIzleyicileriniGetir';
import { supabase } from '../../../lib/supabase';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  sessionId: string;
  visible: boolean;
  onClose: () => void;
  currentUserId?: string | null;
  onProfil?: (userId: string) => void;
};

const EKRAN_H = Dimensions.get('window').height;
const LISTE_MAX = Math.round(EKRAN_H * 0.5);

function adAl(d: CanliIzleyici): string {
  return (
    d.profile?.display_name?.trim() ||
    d.profile?.username?.trim() ||
    d.user_id.slice(0, 8)
  );
}

/** Canlı yayın — anlık izleyenler listesi (bottom sheet). */
export function CanliIzleyiciPaneli({
  sessionId,
  visible,
  onClose,
  currentUserId,
  onProfil,
}: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const [liste, setListe] = useState<CanliIzleyici[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      setListe(await CanliYayinIzleyicileriniGetir(sessionId));
    } catch {
      setListe([]);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!visible) return;
    setYukleniyor(true);
    void yukle().finally(() => setYukleniyor(false));
  }, [visible, yukle]);

  useEffect(() => {
    if (!visible) return;
    const imza = `canli-izleyici-${sessionId}`;
    const kanal = supabase
      .channel(`${imza}-${Date.now().toString(36)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_session_viewers',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          void yukle();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [visible, sessionId, yukle]);

  const sayi = liste.length;

  return (
    <TamusoModal
      visible={visible}
      onClose={onClose}
      placement="bottom"
      animationType="fade"
    >
      <View
        style={[
          styles.kart,
          { paddingBottom: Math.max(insets.bottom, BoslukTokenlari.lg) },
        ]}
      >
        <View style={styles.tutamak} />
        <View style={styles.kartBaslik}>
          <View style={styles.baslikSol}>
            <Ionicons
              name="eye"
              size={18}
              color={RenkTokenlari.primarySoft}
            />
            <Text style={styles.baslik}>{t('canliYayin.izleyenler')}</Text>
          </View>
          <View style={styles.baslikSag}>
            <Text style={styles.sayiEtiket}>{sayi}</Text>
            <Pressable
              onPress={onClose}
              style={styles.kapatBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('ortak.kapat')}
            >
              <Ionicons name="close" size={18} color={RenkTokenlari.textMuted} />
            </Pressable>
          </View>
        </View>
        <Text style={styles.altBaslik}>{t('canliYayin.izleyenAciklama')}</Text>

        {yukleniyor && sayi === 0 ? (
          <ActivityIndicator
            color={RenkTokenlari.accent}
            style={styles.yukleniyor}
          />
        ) : sayi === 0 ? (
          <View style={styles.bosKutu}>
            <Ionicons
              name="eye-outline"
              size={28}
              color={RenkTokenlari.textDim}
            />
            <Text style={styles.bos}>{t('canliYayin.izleyenYok')}</Text>
          </View>
        ) : (
          <FlatList
            data={liste}
            keyExtractor={(item) => item.user_id}
            style={styles.liste}
            contentContainerStyle={styles.listeIcerik}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const ad = adAl(item);
              const ben = !!currentUserId && item.user_id === currentUserId;
              const kullaniciAdi = item.profile?.username?.trim();
              return (
                <Pressable
                  onPress={() => {
                    onClose();
                    onProfil?.(item.user_id);
                  }}
                  style={styles.profilKart}
                  accessibilityRole="button"
                  accessibilityLabel={t('kisilerX.profilA11y', { isim: ad })}
                >
                  <View style={styles.avatarKutu}>
                    <SeviyeTaci
                      level={item.profile?.level ?? 0}
                      size="sm"
                      avatarBoy={48}
                    >
                      <ProfilAvatarKucuk
                        size={48}
                        displayName={item.profile?.display_name}
                        username={item.profile?.username}
                        avatarUrl={item.profile?.avatar_url}
                      />
                    </SeviyeTaci>
                    {item.profile?.is_verified ? (
                      <View style={styles.onayRozeti} pointerEvents="none">
                        <DogrulanmisTik size={14} />
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.metin}>
                    <Text style={styles.ad} numberOfLines={1}>
                      {ad}
                      {ben ? ` · ${t('gorusme.sen')}` : ''}
                    </Text>
                    {kullaniciAdi ? (
                      <Text style={styles.kullaniciAdi} numberOfLines={1}>
                        @{kullaniciAdi}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={RenkTokenlari.textDim}
                  />
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </TamusoModal>
  );
}

const styles = StyleSheet.create({
  kart: {
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    paddingTop: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.lg,
    maxHeight: Math.round(EKRAN_H * 0.72),
  },
  tutamak: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: RenkTokenlari.border,
    marginBottom: BoslukTokenlari.md,
  },
  kartBaslik: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  baslikSol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  baslikSag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sayiEtiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  kapatBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.pressFill,
  },
  altBaslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginBottom: BoslukTokenlari.md,
  },
  yukleniyor: { marginVertical: 28 },
  bosKutu: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 28,
  },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  liste: { maxHeight: LISTE_MAX },
  listeIcerik: { paddingBottom: BoslukTokenlari.md, gap: 6 },
  profilKart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
  },
  avatarKutu: { position: 'relative' },
  onayRozeti: {
    position: 'absolute',
    right: -2,
    bottom: -2,
  },
  metin: { flex: 1, minWidth: 0, gap: 2 },
  ad: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  kullaniciAdi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
});
