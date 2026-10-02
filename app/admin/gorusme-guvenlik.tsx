import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { KlavyeGuvenliAlan } from '../../src/bilesenler/klavye/KlavyeGuvenliAlan';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import {
  AdminGorusmeGuvenlikListesi,
  AdminGorusmeOlayGoruldu,
  AdminGorusmeUyariGonder,
} from '../../src/moduller/gorusme/islemler/GorusmeIslemleri';
import type { CallSecurityEvent } from '../../src/moduller/gorusme/tipler';
import { AdminStil } from '../../src/moduller/admin/bilesenler/AdminStil';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const OLAY_ETIKET: Record<string, string> = {
  screenshot: 'Ekran görüntüsü',
  screen_record: 'Ekran kaydı',
  capture_blocked: 'Kayıt engellendi',
  capture_attempt: 'Kayıt girişimi',
};

export default function AdminGorusmeGuvenlikEkrani() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const admin = AdminYetkisiVarMi(profile);
  const [liste, setListe] = useState<CallSecurityEvent[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [secili, setSecili] = useState<CallSecurityEvent | null>(null);
  const [uyari, setUyari] = useState('');
  const [busy, setBusy] = useState(false);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      setListe(await AdminGorusmeGuvenlikListesi(60));
    } catch (e) {
      Alert.alert(
        'Güvenlik',
        e instanceof Error ? e.message : 'Liste alınamadı (migration 027?)',
      );
      setListe([]);
    } finally {
      setYukleniyor(false);
    }
  }, []);

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

  const uyarGonder = async () => {
    if (!secili || !uyari.trim()) {
      Alert.alert('Uyarı', 'Mesaj yaz.');
      return;
    }
    setBusy(true);
    const r = await AdminGorusmeUyariGonder(secili.id, uyari.trim());
    setBusy(false);
    if (!r.ok) {
      Alert.alert('Hata', r.hata ?? 'Gönderilemedi');
      return;
    }
    Alert.alert('Tamam', 'Uyarı kullanıcıya gönderildi.');
    setSecili(null);
    setUyari('');
    await yukle();
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title="Görüşme güvenliği"
        subtitle="Kayıt / ekran görüntüsü girişimleri"
        fallbackHref="/admin"
      />
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
        {yukleniyor && !liste.length ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : !liste.length ? (
          <Text style={AdminStil.bos}>Henüz güvenlik olayı yok</Text>
        ) : (
          liste.map((e) => (
            <Pressable
              key={e.id}
              style={[AdminStil.kart, !e.admin_seen && styles.yeni]}
              onPress={async () => {
                setSecili(e);
                setUyari(
                  'Görüşme sırasında ekran kaydı / görüntü almak yasaktır. Tekrarında hesabın kısıtlanabilir.',
                );
                if (!e.admin_seen) await AdminGorusmeOlayGoruldu(e.id);
              }}
            >
              <View style={AdminStil.satir}>
                <Text style={AdminStil.kartBaslik}>
                  {OLAY_ETIKET[e.event_type] ?? e.event_type}
                </Text>
                <View style={AdminStil.chip}>
                  <Text style={AdminStil.chipYazi}>
                    {e.call_type === 'video' ? 'Video' : 'Ses'}
                  </Text>
                </View>
              </View>
              <Text style={AdminStil.kartAlt}>
                {e.user_name} → {e.peer_name}
              </Text>
              <Text style={AdminStil.kartAlt}>
                {e.platform ?? '—'} · {e.call_status ?? '—'} ·{' '}
                {new Date(e.created_at).toLocaleString('tr-TR')}
              </Text>
              {e.warning_sent_at ? (
                <Text style={[AdminStil.kartAlt, { color: RenkTokenlari.mint }]}>
                  Uyarı gönderildi
                </Text>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal visible={!!secili} animationType="slide" transparent>
        <KlavyeGuvenliAlan style={styles.modalPerde}>
          <Pressable style={styles.modalBosluk} onPress={() => setSecili(null)} />
          <View
            style={[
              styles.modalKart,
              { paddingBottom: Math.max(insets.bottom, 12) + 8 },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.modalIcerik}
            >
              <Text style={styles.modalBaslik}>Olay detayı</Text>
              {secili ? (
                <>
                  <Text style={AdminStil.kartAlt}>
                    Tür: {OLAY_ETIKET[secili.event_type] ?? secili.event_type}
                  </Text>
                  <Text style={AdminStil.kartAlt}>
                    Kullanıcı: {secili.user_name}
                  </Text>
                  <Text style={AdminStil.kartAlt}>
                    Karşı taraf: {secili.peer_name}
                  </Text>
                  <Text style={AdminStil.kartAlt}>
                    Görüşme: {secili.call_id ?? '—'}
                  </Text>
                  <Text style={AdminStil.kartAlt}>
                    Platform: {secili.platform ?? '—'} · Durum:{' '}
                    {secili.call_status ?? '—'}
                  </Text>
                  <Text style={[AdminStil.kartAlt, { marginBottom: 8 }]}>
                    {JSON.stringify(secili.details ?? {}, null, 0)}
                  </Text>
                  <Text style={styles.uyariEtiket}>Uyarı mesajı</Text>
                  <TextInput
                    style={[AdminStil.input, styles.uyariInput]}
                    value={uyari}
                    onChangeText={setUyari}
                    multiline
                    textAlignVertical="top"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />
                  <View style={AdminStil.aksiyonSatir}>
                    <Pressable
                      style={AdminStil.aksiyon}
                      onPress={() => setSecili(null)}
                    >
                      <Text style={AdminStil.aksiyonYazi}>Kapat</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        AdminStil.aksiyon,
                        { borderColor: RenkTokenlari.danger },
                      ]}
                      disabled={busy}
                      onPress={() => void uyarGonder()}
                    >
                      <Text
                        style={[
                          AdminStil.aksiyonYazi,
                          { color: RenkTokenlari.danger },
                        ]}
                      >
                        Uyarı gönder
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </KlavyeGuvenliAlan>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  yeni: { borderColor: RenkTokenlari.borderAccent },
  modalPerde: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBosluk: { flex: 1 },
  modalKart: {
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
  },
  modalIcerik: {
    padding: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
  },
  uyariInput: {
    minHeight: 96,
    maxHeight: 160,
  },
  modalBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    marginBottom: 4,
  },
  uyariEtiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
    marginTop: 8,
  },
});
