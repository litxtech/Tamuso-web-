import i18n from '../../../i18n';
import type { AjansSertifikaDurum } from '../islemler/AjansSertifikaIslemleri';

function kacis(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function html(d: AjansSertifikaDurum, tarih: string): string {
  const metin = i18n.t('ajans.sertifikaMetin', {
    ad: d.owner_name,
    ajans: d.agency_name,
  });
  const hediye = i18n.t('ajans.sertifikaHediye', { tutar: String(d.gift_usd) });
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  body { margin: 0; background: #120c18; color: #f6efe2; font-family: Georgia, serif; }
  .cerceve { margin: 28px; padding: 36px 32px; border: 2px solid #e2b657; }
  .marka { letter-spacing: 6px; font-size: 13px; color: #e2b657; text-align: center; }
  .baslik { text-align: center; font-size: 28px; margin: 18px 0 6px; }
  .alt { text-align: center; color: #cbb892; font-size: 13px; margin-bottom: 28px; }
  .ad { text-align: center; font-size: 26px; margin: 0; }
  .ajans { text-align: center; color: #e2b657; font-size: 16px; margin: 8px 0 24px; }
  .metin { font-size: 15px; line-height: 1.6; text-align: center; }
  .hediye { text-align: center; margin-top: 18px; font-size: 15px; color: #f8e7a2; }
  .tarih { text-align: center; margin-top: 28px; font-size: 12px; color: #cbb892; }
</style></head>
<body><div class="cerceve">
  <div class="marka">TAMUSO</div>
  <div class="baslik">${kacis(i18n.t('ajans.sertifikaBaslik'))}</div>
  <div class="alt">${kacis(i18n.t('ajans.sertifikaAlt'))}</div>
  <p class="ad">${kacis(d.owner_name)}</p>
  <p class="ajans">${kacis(d.agency_name)}</p>
  <p class="metin">${kacis(metin)}</p>
  <p class="hediye">${kacis(hediye)}</p>
  <div class="tarih">${kacis(tarih)}</div>
</div></body></html>`;
}

export async function AjansSertifikaPaylas(
  d: AjansSertifikaDurum,
): Promise<{ ok: true } | { ok: false; hata: string }> {
  try {
    const Print = await import('expo-print');
    const Sharing = await import('expo-sharing');
    const tarih = d.issued_at
      ? new Date(d.issued_at).toLocaleDateString()
      : new Date().toLocaleDateString();
    const { uri } = await Print.printToFileAsync({ html: html(d, tarih) });
    const paylasilabilir = await Sharing.isAvailableAsync();
    if (!paylasilabilir) return { ok: false, hata: i18n.t('ajans.sertifikaHata') };
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: i18n.t('ajans.sertifikaBaslik'),
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('ajans.sertifikaHata'),
    };
  }
}
