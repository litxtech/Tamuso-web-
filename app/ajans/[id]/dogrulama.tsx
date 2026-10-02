import React, { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import {
  AjansAltEkranKabuk,
  AjansKart,
} from '../../../src/moduller/ajanslar/bilesenler/AjansAltEkranKabuk';
import { useAjansRouteId } from '../../../src/moduller/ajanslar/kancalar/useAjansRouteId';
import {
  AjansBelgeYukleVeGonder,
  AjansDogrulamaMerkeziGetir,
} from '../../../src/moduller/ajanslar/islemler/AjansIslemleri';
import {
  BelgeDurumEtiket,
  PROFIL_DURUM_ETIKET,
} from '../../../src/moduller/admin/dogrulama/DogrulamaDurumEtiketleri';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { useCeviri } from '../../../src/i18n/useCeviri';

type Kart = {
  key: string;
  baslik: string;
  ok: boolean | null;
  durum: string;
};

export default function AjansDogrulamaEkrani() {
  const { t } = useCeviri();
  const agencyId = useAjansRouteId();
  const [yukleniyor, setYukleniyor] = useState(true);
  const [progress, setProgress] = useState(0);
  const [overall, setOverall] = useState('NOT_STARTED');
  const [kartlar, setKartlar] = useState<Kart[]>([]);
  const [belgeler, setBelgeler] = useState<
    Awaited<ReturnType<typeof AjansDogrulamaMerkeziGetir>>['documents']
  >([]);
  const [noticeOk, setNoticeOk] = useState(false);

  const yukle = useCallback(async () => {
    if (!agencyId) return;
    setYukleniyor(true);
    try {
      const data = await AjansDogrulamaMerkeziGetir(agencyId);
      const p = data.profile;
      setProgress(p?.progress_pct ?? 0);
      setOverall(p?.overall_status ?? 'NOT_STARTED');
      setBelgeler(data.documents ?? []);
      setKartlar([
        {
          key: 'identity',
          baslik: t('ajans.verKimlik'),
          ok: p?.identity_verified ?? false,
          durum: p?.identity_verified ? t('ajans.verDurumOk') : t('ajans.verDurumBekliyor'),
        },
        {
          key: 'address',
          baslik: t('ajans.verAdres'),
          ok: p?.address_verified ?? false,
          durum: p?.address_verified ? t('ajans.verDurumOk') : t('ajans.verDurumBekliyor'),
        },
        {
          key: 'company',
          baslik: t('ajans.verSirket'),
          ok: p?.company_verified ?? null,
          durum: p?.company_verified
            ? t('ajans.verDurumOk')
            : t('ajans.verDurumInceleniyor'),
        },
        {
          key: 'extra',
          baslik: t('ajans.verEkBelge'),
          ok: p?.extra_docs_reviewed ?? null,
          durum: p?.extra_docs_reviewed
            ? t('ajans.verDurumOk')
            : t('ajans.verDurumYeniden'),
        },
      ]);
    } catch (e) {
      Alert.alert(
        t('ajans.verMerkez'),
        e instanceof Error ? e.message : t('ajans.verYuklenemedi'),
      );
    } finally {
      setYukleniyor(false);
    }
  }, [agencyId, t]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const belgeSecVeYukle = async (kaynak: 'camera' | 'gallery' | 'file') => {
    if (!agencyId) return;
    if (!noticeOk) {
      Alert.alert(t('ajans.verBelgeBildirim'), t('ajans.verBelgeBildirimBody'));
      setNoticeOk(true);
      return;
    }
    try {
      let uri: string | null = null;
      let mime = 'image/jpeg';
      let size = 0;

      if (kaynak === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(t('ajans.verMerkez'), t('ajans.verIzinKamera'));
          return;
        }
        const r = await ImagePicker.launchCameraAsync({
          quality: 0.85,
          allowsEditing: false,
        });
        if (r.canceled || !r.assets[0]) return;
        uri = r.assets[0].uri;
        mime = r.assets[0].mimeType ?? 'image/jpeg';
        size = r.assets[0].fileSize ?? 0;
      } else if (kaynak === 'gallery') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(t('ajans.verMerkez'), t('ajans.verIzinGaleri'));
          return;
        }
        const r = await ImagePicker.launchImageLibraryAsync({
          quality: 0.85,
          mediaTypes: ['images'],
        });
        if (r.canceled || !r.assets[0]) return;
        uri = r.assets[0].uri;
        mime = r.assets[0].mimeType ?? 'image/jpeg';
        size = r.assets[0].fileSize ?? 0;
      } else {
        const r = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          copyToCacheDirectory: true,
        });
        if (r.canceled || !r.assets[0]) return;
        uri = r.assets[0].uri;
        mime = r.assets[0].mimeType ?? 'application/pdf';
        size = r.assets[0].size ?? 0;
      }

      if (!uri) return;

      Alert.alert(t('ajans.verOnizleme'), t('ajans.verOnizlemeBody'), [
        { text: t('ortak.iptal'), style: 'cancel' },
        {
          text: t('ajans.gonder'),
          onPress: () => {
            void (async () => {
              const out = await AjansBelgeYukleVeGonder({
                subjectType: 'AGENCY',
                subjectId: agencyId,
                verificationType: 'IDENTITY',
                documentType: 'NATIONAL_ID',
                localUri: uri!,
                mimeType: mime,
                fileSizeBytes: size || 1,
                idempotencyKey: `doc-${agencyId}-${Date.now()}`,
              });
              if (!out.ok) {
                Alert.alert(t('ajans.verMerkez'), out.hata ?? t('ajans.verYuklenemedi'));
              } else {
                Alert.alert(t('ajans.verMerkez'), t('ajans.verBelgeAlindi'));
                void yukle();
              }
            })();
          },
        },
      ]);
    } catch (e) {
      Alert.alert(
        t('ajans.verMerkez'),
        e instanceof Error ? e.message : t('ajans.verYuklenemedi'),
      );
    }
  };

  return (
    <AjansAltEkranKabuk
      agencyId={agencyId}
      title={t('ajans.verMerkez')}
      aktif="dogrulama"
      yukleniyor={yukleniyor && kartlar.length === 0}
      refreshing={yukleniyor}
      onRefresh={() => void yukle()}
    >
      <AjansKart>
        <Text style={{ color: RenkTokenlari.text, fontSize: 18, fontWeight: '700' }}>
          {t('ajans.verAjansDogrulama')}
        </Text>
        <Text style={{ color: RenkTokenlari.textDim, marginTop: 4 }}>
          {PROFIL_DURUM_ETIKET[overall] ?? overall} · {progress}%
        </Text>
        <View
          style={{
            height: 8,
            backgroundColor: RenkTokenlari.surface,
            borderRadius: 99,
            marginTop: 12,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: 8,
              width: `${Math.min(100, Math.max(0, progress))}%` as `${number}%`,
              backgroundColor: RenkTokenlari.primarySoft,
            }}
          />
        </View>
      </AjansKart>

      {kartlar.map((k) => (
        <AjansKart key={k.key}>
          <Text style={{ color: RenkTokenlari.text, fontWeight: '700' }}>{k.baslik}</Text>
          <Text
            style={{
              color: k.ok ? RenkTokenlari.mint : RenkTokenlari.textDim,
              marginTop: 4,
            }}
          >
            {k.ok ? '✓ ' : ''}
            {k.durum}
          </Text>
        </AjansKart>
      ))}

      <Text style={{ color: RenkTokenlari.text, fontWeight: '700' }}>
        {t('ajans.verBelgeYukle')}
      </Text>
      <Text style={{ color: RenkTokenlari.textDim, fontSize: 12 }}>
        {t('ajans.verBelgeBildirimBody')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(
          [
            ['camera', t('ajans.verKamera')],
            ['gallery', t('ajans.verGaleri')],
            ['file', t('ajans.verDosya')],
          ] as const
        ).map(([k, label]) => (
          <Pressable key={k} onPress={() => void belgeSecVeYukle(k)}>
            <AjansKart>
              <Text style={{ color: RenkTokenlari.primarySoft }}>{label}</Text>
            </AjansKart>
          </Pressable>
        ))}
      </View>

      {belgeler.map((d) => (
        <AjansKart key={d.id}>
          <Text style={{ color: RenkTokenlari.text }}>
            {d.verification_type} / {d.document_type}
          </Text>
          <Text style={{ color: RenkTokenlari.textDim, fontSize: 12 }}>
            {BelgeDurumEtiket(d.status)}
          </Text>
          {d.user_message ? (
            <Text style={{ color: RenkTokenlari.text, marginTop: 4 }}>{d.user_message}</Text>
          ) : null}
        </AjansKart>
      ))}
    </AjansAltEkranKabuk>
  );
}
