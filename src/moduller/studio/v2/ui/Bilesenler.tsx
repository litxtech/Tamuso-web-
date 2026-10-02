import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RenkTokenlariKoyu as K } from '../../../../tasarim-sistemi/RenkTokenlari';

export const StudioRenk = {
  zemin: '#07080d',
  yuzey: '#12141c',
  yuzey2: '#1a1d28',
  cizgi: 'rgba(255,255,255,0.08)',
  yazi: K.text,
  soluk: K.textMuted,
  vurgu: K.primary,
  basari: '#3DDC97',
  uyari: '#E6B450',
  tehlike: '#E25B5B',
  beyaz: '#fff',
};

export function StudioYuzey(props: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.yuzey, props.style]}>{props.children}</View>;
}

export function StudioDurumRozet(props: { label: string; tone?: 'vurgu' | 'basari' | 'uyari' | 'tehlike' | 'sakin' }) {
  const renk = props.tone === 'basari'
    ? StudioRenk.basari
    : props.tone === 'uyari'
      ? StudioRenk.uyari
      : props.tone === 'tehlike'
        ? StudioRenk.tehlike
        : props.tone === 'sakin'
          ? StudioRenk.soluk
          : StudioRenk.vurgu;
  return (
    <View style={[styles.rozet, { borderColor: renk }]}>
      <View style={[styles.rozetNokta, { backgroundColor: renk }]} />
      <Text style={[styles.rozetYazi, { color: renk }]}>{props.label}</Text>
    </View>
  );
}

export function StudioIlerleme(props: { yuzde: number | null }) {
  const deger = props.yuzde == null ? 0 : Math.max(0, Math.min(100, props.yuzde));
  return (
    <View style={styles.bar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: deger }}>
      <View style={[styles.barDolum, { width: `${deger}%` }, props.yuzde == null && styles.barBelirsiz]} />
    </View>
  );
}

export function StudioBos(props: { baslik: string; alt?: string; aksiyon?: string; onAksiyon?: () => void }) {
  return (
    <View style={styles.bos}>
      <Text style={styles.bosBaslik}>{props.baslik}</Text>
      {props.alt ? <Text style={styles.bosAlt}>{props.alt}</Text> : null}
      {props.aksiyon && props.onAksiyon ? (
        <Pressable style={styles.vurguBtn} onPress={props.onAksiyon} accessibilityRole="button">
          <Text style={styles.vurguYazi}>{props.aksiyon}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function StudioIskelet(props: { boy?: number }) {
  const opak = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(opak, { toValue: 0.7, duration: 700, useNativeDriver: true }),
      Animated.timing(opak, { toValue: 0.35, duration: 700, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [opak]);
  return <Animated.View style={[styles.iskelet, { height: props.boy ?? 148, opacity: opak }]} />;
}

export function StudioKapak(props: { uri?: string | null; boy?: number; children?: React.ReactNode }) {
  return (
    <View style={[styles.kapak, { height: props.boy ?? 168 }]}>
      {props.uri ? (
        <Image source={{ uri: props.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={styles.kapakPlaceholder}>
          <Ionicons name="game-controller-outline" size={28} color={StudioRenk.soluk} />
        </View>
      )}
      {props.children}
    </View>
  );
}

export function StudioSheet(props: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      <KeyboardAvoidingView style={styles.klavye} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.perde} onPress={props.onClose} accessibilityRole="button">
          <Pressable style={[styles.sheet, { paddingBottom: Math.max(24, insets.bottom + 12), maxHeight: '78%' }]} onPress={() => undefined}>
            <View style={styles.tutamac} />
            {props.children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function StudioOnay(props: {
  visible: boolean;
  baslik: string;
  govde: string;
  vazgec: string;
  onay: string;
  tehlike?: boolean;
  onVazgec: () => void;
  onOnay: () => void;
}) {
  return (
    <StudioSheet visible={props.visible} onClose={props.onVazgec}>
      <Text style={styles.sheetBaslik}>{props.baslik}</Text>
      <Text style={styles.sheetGovde}>{props.govde}</Text>
      <View style={styles.sheetSatir}>
        <Pressable style={styles.ikincil} onPress={props.onVazgec} accessibilityRole="button">
          <Text style={styles.ikincilYazi}>{props.vazgec}</Text>
        </Pressable>
        <Pressable
          style={[styles.onay, props.tehlike && styles.tehlike]}
          onPress={props.onOnay}
          accessibilityRole="button"
        >
          <Text style={styles.vurguYazi}>{props.onay}</Text>
        </Pressable>
      </View>
    </StudioSheet>
  );
}

const styles = StyleSheet.create({
  yuzey: {
    backgroundColor: StudioRenk.yuzey,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: StudioRenk.cizgi,
  },
  rozet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rozetNokta: { width: 6, height: 6, borderRadius: 3 },
  rozetYazi: { fontSize: 12, fontWeight: '700' },
  bar: { height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barDolum: { height: 4, borderRadius: 4, backgroundColor: StudioRenk.vurgu },
  barBelirsiz: { width: '18%' },
  bos: { paddingVertical: 28, gap: 8, alignItems: 'flex-start' },
  bosBaslik: { color: StudioRenk.yazi, fontSize: 16, fontWeight: '700' },
  bosAlt: { color: StudioRenk.soluk, fontSize: 13, lineHeight: 18 },
  iskelet: { borderRadius: 18, backgroundColor: StudioRenk.yuzey2 },
  kapak: { borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden', backgroundColor: StudioRenk.yuzey2 },
  kapakPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  perde: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  klavye: { flex: 1 },
  sheet: {
    backgroundColor: '#14161f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: StudioRenk.cizgi,
  },
  tutamac: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  sheetBaslik: { color: StudioRenk.yazi, fontSize: 18, fontWeight: '800' },
  sheetGovde: { color: StudioRenk.soluk, fontSize: 14, lineHeight: 20 },
  sheetSatir: { flexDirection: 'row', gap: 10 },
  vurguBtn: { backgroundColor: StudioRenk.vurgu, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  vurguYazi: { color: StudioRenk.beyaz, fontWeight: '800' },
  ikincil: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: StudioRenk.cizgi, paddingVertical: 12, alignItems: 'center' },
  ikincilYazi: { color: StudioRenk.yazi, fontWeight: '700' },
  onay: { flex: 1, borderRadius: 12, backgroundColor: StudioRenk.vurgu, paddingVertical: 12, alignItems: 'center' },
  tehlike: { backgroundColor: StudioRenk.tehlike },
});
