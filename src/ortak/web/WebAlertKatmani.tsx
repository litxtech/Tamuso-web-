import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type WebAlertButton = {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type WebAlertDurum = {
  id: number;
  title: string;
  message: string;
  buttons: WebAlertButton[];
};

const dinleyiciler = new Set<(a: WebAlertDurum | null) => void>();
let sira = 0;
let kuruldu = false;

/** react-native-web Alert.alert boş fonksiyon. Webde gerçek onay kartı açar. */
export function WebAlertKur(): void {
  if (Platform.OS !== 'web' || kuruldu) return;
  kuruldu = true;
  Alert.alert = (title, message, buttons) => {
    const liste: WebAlertButton[] =
      buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
    const durum: WebAlertDurum = {
      id: ++sira,
      title: title ?? '',
      message: typeof message === 'string' ? message : '',
      buttons: liste,
    };
    dinleyiciler.forEach((fn) => fn(durum));
  };
}

function kapat(): void {
  dinleyiciler.forEach((fn) => fn(null));
}

/** Safari / Chrome — odadan çıkış ve diğer onaylar. */
export function WebAlertKatmani() {
  const [durum, setDurum] = useState<WebAlertDurum | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    dinleyiciler.add(setDurum);
    return () => {
      dinleyiciler.delete(setDurum);
    };
  }, []);

  if (Platform.OS !== 'web' || !durum) return null;

  return (
    <View style={styles.perde} accessibilityViewIsModal>
      <View style={styles.kart}>
        {durum.title ? <Text style={styles.baslik}>{durum.title}</Text> : null}
        {durum.message ? <Text style={styles.mesaj}>{durum.message}</Text> : null}
        <View style={styles.butonlar}>
          {durum.buttons.map((btn, i) => {
            const destructive = btn.style === 'destructive';
            const cancel = btn.style === 'cancel';
            return (
              <Pressable
                key={`${durum.id}-${i}`}
                accessibilityRole="button"
                onPress={() => {
                  const fn = btn.onPress;
                  kapat();
                  fn?.();
                }}
                style={[
                  styles.buton,
                  destructive && styles.butonDestructive,
                  cancel && styles.butonCancel,
                ]}
              >
                <Text
                  style={[
                    styles.butonYazi,
                    destructive && styles.yaziDestructive,
                    cancel && styles.yaziCancel,
                  ]}
                >
                  {btn.text || 'OK'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  perde: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    elevation: 10000,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  kart: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#161222',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  baslik: {
    color: '#F7F2E8',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  mesaj: {
    color: 'rgba(247,242,232,0.78)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  butonlar: {
    marginTop: 16,
    gap: 8,
  },
  buton: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E84091',
    paddingHorizontal: 12,
  },
  butonDestructive: {
    backgroundColor: 'rgba(255,59,92,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,92,0.45)',
  },
  butonCancel: {
    backgroundColor: 'transparent',
  },
  butonYazi: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  yaziDestructive: {
    color: '#FF5C7A',
  },
  yaziCancel: {
    color: 'rgba(247,242,232,0.7)',
    fontWeight: '600',
  },
});
