import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  ADMIN_MODULLER,
  AdminModulleriAra,
  type AdminAramaSonuc,
  type AdminModul,
} from './AdminModulKatalogu';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

type Props = {
  /** Arama değişince üst ekran grid’i filtreleyebilir */
  onSonuc?: (sonuclar: AdminAramaSonuc[], sorgu: string) => void;
  /** İzin filtrelenmiş katalog (yoksa tüm modüller) */
  moduller?: AdminModul[];
};

export function AdminAramaKutusu({ onSonuc, moduller }: Props) {
  const [sorgu, setSorgu] = useState('');
  const havuz = moduller ?? ADMIN_MODULLER;

  const sonuclar = useMemo(() => AdminModulleriAra(sorgu, 10, havuz), [sorgu, havuz]);

  const guncelle = (t: string) => {
    setSorgu(t);
    const s = AdminModulleriAra(t, 10, havuz);
    onSonuc?.(s, t);
  };

  const git = (href: string) => {
    setSorgu('');
    onSonuc?.([], '');
    router.push(href as any);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.kutu}>
        <Ionicons name="search" size={18} color={RenkTokenlari.textDim} />
        <TextInput
          style={styles.input}
          value={sorgu}
          onChangeText={guncelle}
          placeholder="Sayfa ara… (ajans, coin, ceza, kyc…)"
          placeholderTextColor={RenkTokenlari.textDim}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          onSubmitEditing={() => {
            if (sonuclar[0]) git(sonuclar[0].href);
          }}
        />
        {sorgu.length > 0 ? (
          <Pressable
            onPress={() => guncelle('')}
            hitSlop={10}
            accessibilityLabel="Temizle"
          >
            <Ionicons name="close-circle" size={18} color={RenkTokenlari.textDim} />
          </Pressable>
        ) : null}
      </View>

      {sorgu.trim().length > 0 ? (
        <View style={styles.liste}>
          {sonuclar.length === 0 ? (
            <Text style={styles.bos}>Sonuç yok</Text>
          ) : (
            sonuclar.map((s, i) => (
              <Pressable
                key={s.href}
                style={[styles.satir, i === 0 && styles.satirIlk]}
                onPress={() => git(s.href)}
              >
                <View
                  style={[styles.ikon, { backgroundColor: `${s.tint}28` }]}
                >
                  <Ionicons name={s.icon} size={16} color={s.tint} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.baslik} numberOfLines={1}>
                    {s.label}
                  </Text>
                  <Text style={styles.alt} numberOfLines={1}>
                    {s.bolum} · {s.alt}
                  </Text>
                </View>
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={RenkTokenlari.textDim}
                />
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: BoslukTokenlari.sm },
  kutu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.md,
    minHeight: 48,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  input: {
    flex: 1,
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    paddingVertical: BoslukTokenlari.sm,
  },
  liste: {
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    overflow: 'hidden',
  },
  bos: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    paddingVertical: BoslukTokenlari.lg,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: BoslukTokenlari.sm,
    borderTopWidth: 1,
    borderTopColor: RenkTokenlari.border,
  },
  satirIlk: { borderTopWidth: 0 },
  ikon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  alt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
});
