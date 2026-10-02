import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { FikirDurumRozeti, fikirDurumRenk } from './FikirDurumRozeti';
import type { FikirZamanNoktasi } from '../tipler';
import { useCeviri } from '../../../i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';

function tarihKisa(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function FikirZamanCizelgesi({ items }: { items: FikirZamanNoktasi[] }) {
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil];

  if (!items?.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.baslik}>{t('fikirler.zamanCizelgesi')}</Text>
      {items.map((item, i) => {
        const son = i === items.length - 1;
        const renk = fikirDurumRenk(item.to_status);
        return (
          <View key={item.id} style={styles.satir}>
            <View style={styles.sol}>
              <View
                style={[
                  styles.daire,
                  {
                    backgroundColor: son ? renk : RenkTokenlari.mint,
                    borderColor: renk,
                  },
                ]}
              >
                <Text style={styles.isaret}>{son ? '●' : '✓'}</Text>
              </View>
              {!son ? <View style={styles.cizgi} /> : null}
            </View>
            <View style={styles.sag}>
              <FikirDurumRozeti status={item.to_status} label={item.to_label} />
              <Text style={styles.tarih}>{tarihKisa(item.created_at, locale)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: BoslukTokenlari.sm },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    marginBottom: 4,
  },
  satir: { flexDirection: 'row', gap: 12, minHeight: 48 },
  sol: { alignItems: 'center', width: 22 },
  daire: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  isaret: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cizgi: {
    flex: 1,
    width: 2,
    backgroundColor: RenkTokenlari.border,
    marginVertical: 2,
  },
  sag: { flex: 1, gap: 4, paddingBottom: 12 },
  tarih: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
});
