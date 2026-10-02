import i18n from '../../../i18n';
import { AktifDil } from '../../../i18n';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { CuzdanNoQrPayload } from '../takas/CuzdanTakasIslemleri';
import {
  MesajGonder,
  OzelSohbetAcVeyaGetir,
} from '../../mesajlasma/islemler/MesajGonder';

function formatCuzdanNo(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 18);
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function yeniUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** QR / alıcı önizleme: yalnızca ad ve soyadın ilk harfi */
export function CuzdanAdSoyadMaskele(
  first?: string | null,
  last?: string | null,
): string {
  const locale = DIL_LOCALE_MAP[AktifDil()];
  const a = (first ?? '').trim();
  const b = (last ?? '').trim();
  const ha = a ? `${a.charAt(0).toLocaleUpperCase(locale)}.` : '';
  const hb = b ? `${b.charAt(0).toLocaleUpperCase(locale)}.` : '';
  const out = [ha, hb].filter(Boolean).join(' ');
  return out || (i18n.t('cuzdan.tire') as string);
}

export function CuzdanNoQrGorselUri(
  walletNumber: string,
  size = 320,
): string {
  const payload = CuzdanNoQrPayload(walletNumber);
  // Yüksek kontrast + margin — modern banka QR plakası
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    data: payload,
    color: '1A0A12',
    bgcolor: 'FFFEFB',
    margin: '14',
    qzone: '2',
    format: 'png',
  });
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

export function CuzdanKartPaylasimMetni(walletNumber: string): string {
  const no = walletNumber.replace(/\D/g, '');
  const payload = CuzdanNoQrPayload(no);
  return [
    i18n.t('cuzdanX.kartPaylasBaslik'),
    formatCuzdanNo(no),
    '',
    i18n.t('cuzdanX.kartPaylasBaglanti', { payload }),
    i18n.t('cuzdanX.kartPaylasAlt'),
    i18n.t('cuzdanX.kartPaylasTakas'),
  ].join('\n');
}

/** Uygulama içi mesaj: cüzdan kartı paylaş */
export async function CuzdanKartiniMesajlaPaylas(input: {
  otherUserId: string;
  walletNumber: string;
}): Promise<{ ok: true; threadId: string } | { ok: false; hata: string }> {
  const no = input.walletNumber.replace(/\D/g, '');
  if (no.length !== 18) {
    return { ok: false, hata: i18n.t('cuzdanX.cuzdanNoHazirDegil') };
  }
  const sohbet = await OzelSohbetAcVeyaGetir(input.otherUserId);
  if (!sohbet.ok) return sohbet;

  const body = CuzdanKartPaylasimMetni(no);
  const qrUrl = CuzdanNoQrGorselUri(no, 240);

  // Metin — client_id UUID olmalı (mesaj_gonder uuid bekler)
  const msg = await MesajGonder({
    threadId: sohbet.threadId,
    body,
    clientId: yeniUuid(),
  });
  if (!msg.ok) return { ok: false, hata: msg.hata };

  // QR görseli — başarısız olsa metin yeterli
  const img = await MesajGonder({
    threadId: sohbet.threadId,
    body: i18n.t('cuzdanX.cuzdanQr'),
    messageType: 'image',
    mediaUrl: qrUrl,
    clientId: yeniUuid(),
  });
  if (!img.ok) {
    // Harici QR URL bazı ortamlarda reddedilebilir; metin zaten gitti
    console.warn('[CuzdanKartPaylas] QR mesaj:', img.hata);
  }

  return { ok: true, threadId: sohbet.threadId };
}

/**
 * WhatsApp: QR görseli + metin.
 * Görsel paylaşılamazsa metin (no + deep link + QR URL) gönderilir.
 */
export async function CuzdanKartiniWhatsAppPaylas(
  walletNumber: string,
): Promise<{ ok: true } | { ok: false; hata: string }> {
  const no = walletNumber.replace(/\D/g, '');
  if (no.length !== 18) {
    return { ok: false, hata: i18n.t('cuzdanX.cuzdanNoHazirDegil') };
  }

  const metin = CuzdanKartPaylasimMetni(no);
  const qrRemote = CuzdanNoQrGorselUri(no, 400);

  try {
    const FS = await import('expo-file-system/legacy');
    const Sharing = await import('expo-sharing');
    if (FS.cacheDirectory && (await Sharing.isAvailableAsync())) {
      const yerel = `${FS.cacheDirectory}mutapay_cuzdan_qr_${no.slice(-6)}.png`;
      const indir = await FS.downloadAsync(qrRemote, yerel);
      if (indir?.uri) {
        await Sharing.shareAsync(indir.uri, {
          mimeType: 'image/png',
          dialogTitle: i18n.t('cuzdanX.waQrDialog'),
          UTI: 'public.png',
        });
        return { ok: true };
      }
    }
  } catch {
    /* metin yedeği */
  }

  const encoded = encodeURIComponent(`${metin}\n\nQR: ${qrRemote}`);
  const url = Platform.select({
    ios: `whatsapp://send?text=${encoded}`,
    android: `whatsapp://send?text=${encoded}`,
    default: `https://wa.me/?text=${encoded}`,
  })!;

  try {
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
      return { ok: true };
    }
    await Linking.openURL(`https://wa.me/?text=${encoded}`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('cuzdanX.whatsappAcilamadi'),
    };
  }
}
