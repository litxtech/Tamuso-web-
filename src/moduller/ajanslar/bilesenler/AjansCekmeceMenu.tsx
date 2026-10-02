import React, { useEffect, useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useTemayaAboneOl } from '../../../tasarim-sistemi/tema/useTemayaAboneOl';
import { useCeviri } from '../../../i18n/useCeviri';
import {
  AJANS_MENU_GRUP_BASLIK,
  AjansMenuGruplarinaBol,
  AjansMenuOgeleriniKur,
  type AjansMenuOgesi,
} from '../menu/AjansMenuKatalogu';

type Props = {
  acik: boolean;
  onKapat: () => void;
  agencyId: string;
  agencyName?: string | null;
  aktif?: string;
  onOgeSec: (href: string) => void;
};

const TIMING = { duration: 240, easing: Easing.out(Easing.cubic) } as const;

/**
 * Ajansım hamburger — feed tarzı cam çekmece.
 * Bölüm rayındaki tüm sayfalar gruplu menüde.
 */
export function AjansCekmeceMenu({
  acik,
  onKapat,
  agencyId,
  agencyName,
  aktif = 'ozet',
  onOgeSec,
}: Props) {
  useTemayaAboneOl();
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const { width: ekranW } = useWindowDimensions();
  const drawerW = Math.min(Math.round(ekranW * 0.78), 340);
  const progress = useSharedValue(0);

  const ogeler = useMemo(
    () => AjansMenuOgeleriniKur(agencyId),
    [agencyId],
  );
  const gruplar = useMemo(() => AjansMenuGruplarinaBol(ogeler), [ogeler]);

  useEffect(() => {
    progress.value = withTiming(acik ? 1 : 0, TIMING);
  }, [acik, progress]);

  const panelStil = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.value) * -drawerW }],
  }));

  const perdeStil = useAnimatedStyle(() => ({
    opacity: progress.value * 0.55,
  }));

  const sec = (oge: AjansMenuOgesi) => {
    onKapat();
    // Kısa gecikme: modal kapanırken navigasyon çakışmasın
    requestAnimationFrame(() => onOgeSec(oge.href));
  };

  return (
    <Modal
      visible={acik}
      transparent
      animationType="none"
      onRequestClose={onKapat}
      statusBarTranslucent
    >
      <View style={styles.host} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={onKapat}>
          <Animated.View
            style={[styles.perde, perdeStil]}
            pointerEvents="none"
          />
        </Pressable>

        <Animated.View
          style={[
            styles.panel,
            { width: drawerW, paddingTop: insets.top + 8 },
            panelStil,
          ]}
        >
          <CamArkaplan
            intensity={48}
            hafif
            style={StyleSheet.absoluteFill}
            fallbackColor={RenkTokenlari.bgGlass}
          />
          <View style={styles.panelIc}>
            <View style={styles.ust}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.ustBaslik} numberOfLines={1}>
                  {agencyName?.trim() || t('ajans.ajanslarim')}
                </Text>
                <Text style={styles.ustAlt}>{t('ajans.menuAlt')}</Text>
              </View>
              <Pressable
                onPress={onKapat}
                hitSlop={12}
                style={styles.kapatBtn}
                accessibilityRole="button"
                accessibilityLabel={t('ortak.kapat')}
              >
                <Ionicons name="close" size={20} color={RenkTokenlari.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scroll,
                { paddingBottom: Math.max(insets.bottom, 20) + 16 },
              ]}
            >
              {gruplar.map((g) => (
                <View key={g.id} style={styles.grup}>
                  <Text style={styles.grupBaslik}>
                    {t(AJANS_MENU_GRUP_BASLIK[g.id])}
                  </Text>
                  <View style={styles.liste}>
                    {g.ogeler.map((oge) => {
                      const secili = aktif === oge.key;
                      return (
                        <Pressable
                          key={oge.key}
                          onPress={() => sec(oge)}
                          style={({ pressed }) => [
                            styles.satir,
                            secili && styles.satirAktif,
                            pressed && styles.satirPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: secili }}
                          accessibilityLabel={t(oge.labelKey)}
                        >
                          <View
                            style={[
                              styles.ikonWrap,
                              secili && styles.ikonWrapAktif,
                            ]}
                          >
                            <Ionicons
                              name={oge.icon}
                              size={18}
                              color={
                                secili
                                  ? RenkTokenlari.primarySoft
                                  : RenkTokenlari.text
                              }
                            />
                          </View>
                          <Text
                            style={[
                              styles.satirYazi,
                              secili && styles.satirYaziAktif,
                            ]}
                            numberOfLines={1}
                          >
                            {t(oge.labelKey)}
                          </Text>
                          {secili ? (
                            <View style={styles.aktifNokta} />
                          ) : (
                            <Ionicons
                              name="chevron-forward"
                              size={14}
                              color={RenkTokenlari.textDim}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Üst bar hamburger düğmesi */
export function AjansMenuDugmesi({
  onPress,
}: {
  onPress: () => void;
}) {
  const { t } = useCeviri();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.menuBtn, pressed && styles.menuBtnPressed]}
      accessibilityRole="button"
      accessibilityLabel={t('ajans.menuAc')}
    >
      <CamArkaplan
        intensity={28}
        hafif
        style={StyleSheet.absoluteFill}
        fallbackColor={RenkTokenlari.bgGlass}
      />
      <Ionicons name="menu" size={20} color={RenkTokenlari.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  perde: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    borderLeftWidth: 0,
  },
  panelIc: {
    flex: 1,
  },
  ust: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  ustBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontSize: 18,
    fontWeight: '800',
  },
  ustAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  kapatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.pressFill,
  },
  scroll: {
    paddingHorizontal: BoslukTokenlari.md,
    paddingTop: 12,
    gap: 18,
  },
  grup: {
    gap: 8,
  },
  grupBaslik: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 6,
  },
  liste: {
    gap: 4,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: YaricapTokenlari.md,
  },
  satirAktif: {
    backgroundColor: RenkTokenlari.pressFill,
  },
  satirPressed: {
    backgroundColor: RenkTokenlari.pressFill,
  },
  ikonWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  ikonWrapAktif: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.pressFill,
  },
  satirYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
    flex: 1,
    fontSize: 15,
  },
  satirYaziAktif: {
    color: RenkTokenlari.primarySoft,
  },
  aktifNokta: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: RenkTokenlari.primarySoft,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  menuBtnPressed: {
    opacity: 0.85,
  },
});
