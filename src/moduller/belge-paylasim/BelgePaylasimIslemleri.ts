import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import {
  BelgeHtmlSablonOlustur,
  BelgeMetinOlustur,
  type BelgeIcerik,
} from './BelgeSablonlari';
import { HesapHareketExcelCsvOlustur } from './HesapHareketleriBelgesi';
import type { HesapHareketleriBelgeGirdi } from './HesapHareketleriBelgesi';
import i18n from '../../i18n';

export type BelgeIslemSonucu =
  | { ok: true; uri?: string; iptal?: boolean }
  | { ok: false; hata: string };

async function PrintModulu() {
  try {
    return await import('expo-print');
  } catch {
    return null;
  }
}

async function SharingModulu() {
  try {
    return await import('expo-sharing');
  } catch {
    return null;
  }
}

async function FileSystemLegacy() {
  try {
    return await import('expo-file-system/legacy');
  } catch {
    return null;
  }
}

/** HTML → PDF dosyası (cache) */
export async function PdfDosyasiOlustur(
  icerik: BelgeIcerik,
): Promise<BelgeIslemSonucu> {
  try {
    const Print = await PrintModulu();
    if (!Print) {
      return {
        ok: false,
        hata: i18n.t('belge.pdfBuildGerekli'),
      };
    }
    const html = BelgeHtmlSablonOlustur(icerik);
    const { uri } = await Print.printToFileAsync({ html });
    return { ok: true, uri };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('belge.pdfOlusturulamadi'),
    };
  }
}

/** Sistem yazıcı diyaloğu */
export async function BelgeYazdir(icerik: BelgeIcerik): Promise<BelgeIslemSonucu> {
  try {
    const Print = await PrintModulu();
    if (!Print) {
      return {
        ok: false,
        hata: i18n.t('belge.yazdirBuildGerekli'),
      };
    }
    const html = BelgeHtmlSablonOlustur(icerik);
    await Print.printAsync({ html });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('belge.yazdirBaslatilamadi'),
    };
  }
}

/** PDF oluştur + genel paylaşım (WhatsApp dahil) */
export async function BelgePdfPaylas(
  icerik: BelgeIcerik,
): Promise<BelgeIslemSonucu> {
  const pdf = await PdfDosyasiOlustur(icerik);
  if (!pdf.ok || !pdf.uri) return pdf;

  try {
    const Sharing = await SharingModulu();
    if (!Sharing) {
      return { ok: false, hata: i18n.t('belge.paylasimYuklenemedi') };
    }
    const uygun = await Sharing.isAvailableAsync();
    if (!uygun) {
      return { ok: false, hata: i18n.t('belge.paylasimDesteklenmiyor') };
    }
    await Sharing.shareAsync(pdf.uri, {
      mimeType: 'application/pdf',
      dialogTitle: icerik.baslik,
      UTI: 'com.adobe.pdf',
    });
    return { ok: true, uri: pdf.uri };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('belge.paylasimBasarisiz'),
    };
  }
}

/**
 * WhatsApp'a gönder.
 * Önce PDF + paylaşım paneli; metin derin bağlantısı yedek.
 */
export async function WhatsAppBelgeGonder(
  icerik: BelgeIcerik,
  telefonE164?: string | null,
): Promise<BelgeIslemSonucu> {
  const metin = BelgeMetinOlustur(icerik);
  const pdf = await PdfDosyasiOlustur(icerik);

  if (pdf.ok && pdf.uri) {
    try {
      const Sharing = await SharingModulu();
      if (Sharing) {
        const uygun = await Sharing.isAvailableAsync();
        if (uygun) {
          await Sharing.shareAsync(pdf.uri, {
            mimeType: 'application/pdf',
            dialogTitle: i18n.t('belge.whatsappGonder'),
            UTI: 'com.adobe.pdf',
          });
          return { ok: true, uri: pdf.uri };
        }
      }
    } catch {
      // metin yoluna düş
    }
  }

  const tel = (telefonE164 ?? '').replace(/[^\d]/g, '');
  const encoded = encodeURIComponent(metin);
  const url = tel
    ? `https://wa.me/${tel}?text=${encoded}`
    : Platform.select({
        ios: `whatsapp://send?text=${encoded}`,
        android: `whatsapp://send?text=${encoded}`,
        default: `https://wa.me/?text=${encoded}`,
      })!;

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return { ok: true };
    }
    await Linking.openURL(`https://wa.me/${tel ? tel : ''}?text=${encoded}`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('belge.whatsappAcilamadi'),
    };
  }
}

/** Sadece metin WhatsApp */
export async function WhatsAppMetinGonder(
  metin: string,
  telefonE164?: string | null,
): Promise<BelgeIslemSonucu> {
  const tel = (telefonE164 ?? '').replace(/[^\d]/g, '');
  const encoded = encodeURIComponent(metin);
  const url = tel
    ? `https://wa.me/${tel}?text=${encoded}`
    : `whatsapp://send?text=${encoded}`;
  try {
    await Linking.openURL(url);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('belge.whatsappAcilamadi'),
    };
  }
}

function paylasimIptalMi(e: unknown): boolean {
  const msg = (
    e instanceof Error ? e.message : typeof e === 'string' ? e : ''
  ).toLowerCase();
  return (
    msg.includes('cancel') ||
    msg.includes('dismiss') ||
    msg.includes('iptal') ||
    msg.includes('user did not share') ||
    msg.includes('sharing dismissed')
  );
}

/** UTF-8 string → base64 (BOM dahil Excel uyumu için) */
function utf8Base64(metin: string): string {
  const btoaFn =
    typeof globalThis.btoa === 'function'
      ? globalThis.btoa.bind(globalThis)
      : null;
  if (btoaFn) {
    try {
      return btoaFn(unescape(encodeURIComponent(metin)));
    } catch {
      /* fallback below */
    }
  }
  const bytes: number[] = [];
  for (let i = 0; i < metin.length; i++) {
    const c = metin.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else {
      bytes.push(
        0xe0 | (c >> 12),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f),
      );
    }
  }
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += alphabet[a >> 2];
    out += alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? '=' : alphabet[(((b ?? 0) & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? '=' : alphabet[(c ?? 0) & 63];
  }
  return out;
}

/**
 * Hesap hareketleri → Excel'in açtığı CSV dosyası + paylaşım.
 * Sütunlar i18n; Excel TR için ; ayırıcı + UTF-8 BOM.
 */
export async function HesapHareketExcelPaylas(
  girdi: HesapHareketleriBelgeGirdi,
): Promise<BelgeIslemSonucu> {
  try {
    const FS = await FileSystemLegacy();
    if (!FS?.cacheDirectory) {
      return {
        ok: false,
        hata: i18n.t('belge.dosyaSistemiYok'),
      };
    }
    const csv = HesapHareketExcelCsvOlustur(girdi);
    const ad = `Tamuso_Hesap_Hareketleri_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    const uri = `${FS.cacheDirectory}${ad}`;

    try {
      await FS.writeAsStringAsync(uri, csv, {
        encoding: FS.EncodingType?.UTF8 ?? 'utf8',
      });
    } catch {
      await FS.writeAsStringAsync(uri, utf8Base64(csv), {
        encoding: FS.EncodingType?.Base64 ?? 'base64',
      });
    }

    const Sharing = await SharingModulu();
    if (Sharing && (await Sharing.isAvailableAsync())) {
      try {
        await Sharing.shareAsync(uri, {
          // Android Excel uygulamaları text/csv'yi bazen açmaz
          mimeType:
            Platform.OS === 'android'
              ? 'application/vnd.ms-excel'
              : 'text/csv',
          dialogTitle: i18n.t('belge.excelPaylasDialog'),
          UTI: 'public.comma-separated-values-text',
        });
        return { ok: true, uri };
      } catch (e) {
        if (paylasimIptalMi(e)) return { ok: true, uri, iptal: true };
        // RN Share yedeğine düş
      }
    }

    try {
      const { Share } = await import('react-native');
      await Share.share(
        Platform.OS === 'ios'
          ? { url: uri, message: i18n.t('belge.excelPaylasDialog') }
          : { message: uri, title: ad },
      );
      return { ok: true, uri };
    } catch (e) {
      if (paylasimIptalMi(e)) return { ok: true, uri, iptal: true };
      return {
        ok: false,
        hata:
          e instanceof Error ? e.message : i18n.t('belge.excelOlusturulamadi'),
      };
    }
  } catch (e) {
    if (paylasimIptalMi(e)) return { ok: true, iptal: true };
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('belge.excelOlusturulamadi'),
    };
  }
}
