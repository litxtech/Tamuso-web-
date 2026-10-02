import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  AjansAltEkranKabuk,
  AjansHint,
  AjansKart,
  AjansListeSatir,
} from '../../../src/moduller/ajanslar/bilesenler/AjansAltEkranKabuk';
import { useAjansRouteId } from '../../../src/moduller/ajanslar/kancalar/useAjansRouteId';
import {
  AjansHostBasvurusunuOnayla,
  AjansHostBasvurusunuReddet,
  AjansPanelDetayGetir,
  type AjansHostBasvuru,
} from '../../../src/moduller/ajanslar/islemler/AjansPanelIslemleri';
import { AjansHostBasvuruDurum } from '../../../src/moduller/ajanslar/i18n/AjansEtiketleri';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../src/i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../src/i18n/diller';

export default function AjansBasvurularEkrani() {
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil];
  const id = useAjansRouteId();
  const [liste, setListe] = useState<AjansHostBasvuru[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const d = await AjansPanelDetayGetir(id);
      setListe(d.bekleyen_host_basvurulari ?? []);
    } catch {
      setListe([]);
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  return (
    <AjansAltEkranKabuk
      agencyId={id}
      title={t('ajans.basvurular')}
      subtitle={t('ajans.bekleyenAlt', { count: liste.length })}
      aktif="basvurular"
      yukleniyor={yukleniyor && liste.length === 0}
      refreshing={yukleniyor && liste.length > 0}
      onRefresh={() => void yukle()}
    >
      <AjansKart accent={liste.length > 0}>
        {liste.length === 0 ? (
          <AjansHint>{t('ajans.bekleyenBasvuruYok')}</AjansHint>
        ) : (
          liste.map((b) => (
            <View key={b.id} style={styles.blok}>
              <AjansListeSatir
                title={b.display_name || b.username || t('ajans.basvuruVarsayilan')}
                subtitle={t('ajans.basvuruSatir', {
                  user: b.username || '—',
                  zaman: new Date(b.created_at).toLocaleString(locale),
                  status: AjansHostBasvuruDurum(String(b.status), t),
                })}
                avatarUrl={b.avatar_url}
              />
              <View style={styles.aksiyon}>
                <Pressable
                  style={styles.onay}
                  disabled={busy}
                  onPress={() => {
                    void (async () => {
                      setBusy(true);
                      const r = await AjansHostBasvurusunuOnayla(b.id);
                      setBusy(false);
                      if (!r.ok) Alert.alert(t('ajans.alertBasvuru'), r.hata);
                      else await yukle();
                    })();
                  }}
                >
                  <Text style={styles.onayYazi}>{t('ajans.kabul')}</Text>
                </Pressable>
                <Pressable
                  style={styles.red}
                  disabled={busy}
                  onPress={() => {
                    void (async () => {
                      setBusy(true);
                      const r = await AjansHostBasvurusunuReddet(b.id);
                      setBusy(false);
                      if (!r.ok) Alert.alert(t('ajans.alertBasvuru'), r.hata);
                      else await yukle();
                    })();
                  }}
                >
                  <Text style={styles.redYazi}>{t('ortak.reddet')}</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </AjansKart>
    </AjansAltEkranKabuk>
  );
}

const styles = StyleSheet.create({
  blok: {
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.divider,
    marginBottom: 4,
  },
  aksiyon: { flexDirection: 'row', gap: 8, marginTop: 4, paddingLeft: 50 },
  onay: {
    backgroundColor: RenkTokenlari.mint,
    borderRadius: YaricapTokenlari.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  onayYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textOnPrimary,
    fontWeight: '700',
  },
  red: {
    borderWidth: 1,
    borderColor: RenkTokenlari.danger,
    borderRadius: YaricapTokenlari.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  redYazi: { ...TipografiTokenlari.caption, color: RenkTokenlari.danger, fontWeight: '600' },
});
