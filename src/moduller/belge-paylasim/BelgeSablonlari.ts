import i18n from '../../i18n';
import { AktifSayiLocale } from '../../i18n/diller';

export type BelgeSatiri = {
  etiket: string;
  deger: string;
};

export type BelgeBolum = {
  baslik: string;
  ozet?: string;
  satirlar?: BelgeSatiri[];
};

export type BelgeIcerik = {
  baslik: string;
  altBaslik?: string;
  ozet?: string;
  satirlar?: BelgeSatiri[];
  bolumler?: BelgeBolum[];
  not?: string;
  platformAdi?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function satirTablosu(satirlar: BelgeSatiri[]): string {
  return `
    <table style="width:100%;border-collapse:collapse;">
      ${satirlar
        .map(
          (s) => `
        <tr>
          <td style="padding:9px 0;color:#6b6475;font-size:12px;border-bottom:1px solid #ece8f0;width:42%;">${escapeHtml(s.etiket)}</td>
          <td style="padding:9px 0;color:#1a1224;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #ece8f0;">${escapeHtml(s.deger)}</td>
        </tr>`,
        )
        .join('')}
    </table>`;
}

/** PDF / yazıcı için modern HTML şablon */
export function BelgeHtmlSablonOlustur(icerik: BelgeIcerik): string {
  const marka = escapeHtml(icerik.platformAdi ?? 'Tamuso');
  const bolumlerHtml = (icerik.bolumler ?? [])
    .map(
      (b) => `
      <div style="margin-top:18px;padding-top:14px;border-top:1px solid #eadff0;">
        <div style="font-size:13px;font-weight:800;letter-spacing:0.4px;color:#E84091;margin-bottom:8px;">${escapeHtml(b.baslik)}</div>
        ${b.ozet ? `<div style="color:#6b6475;font-size:12px;margin-bottom:8px;">${escapeHtml(b.ozet)}</div>` : ''}
        ${b.satirlar?.length ? satirTablosu(b.satirlar) : ''}
      </div>`,
    )
    .join('');

  const satirlarHtml = icerik.satirlar?.length
    ? satirTablosu(icerik.satirlar)
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:24px;background:linear-gradient(180deg,#faf7fb 0%,#ffffff 40%);color:#1a1224;">
  <div style="max-width:720px;margin:0 auto;border:1px solid #eadff0;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(60,20,80,0.06);">
    <div style="background:linear-gradient(120deg,#E84091,#C43BFF 55%,#8B5CF6);padding:22px 24px;color:#fff;">
      <div style="font-size:11px;letter-spacing:2.2px;font-weight:800;opacity:0.92;">${marka}</div>
      <div style="font-size:24px;font-weight:800;margin-top:8px;">${escapeHtml(icerik.baslik)}</div>
      ${icerik.altBaslik ? `<div style="opacity:0.9;font-size:13px;margin-top:4px;">${escapeHtml(icerik.altBaslik)}</div>` : ''}
      <div style="margin-top:12px;font-size:11px;opacity:0.85;">${escapeHtml(new Date().toLocaleString(AktifSayiLocale(i18n.language)))}</div>
    </div>
    <div style="padding:22px 24px 26px;">
      ${icerik.ozet ? `<div style="background:#f7f2f8;border-radius:14px;padding:14px 16px;font-size:14px;margin-bottom:8px;border:1px solid #f0e6f4;">${escapeHtml(icerik.ozet)}</div>` : ''}
      ${satirlarHtml}
      ${bolumlerHtml}
      ${icerik.not ? `<p style="margin-top:20px;color:#6b6475;font-size:11px;line-height:1.5;">${escapeHtml(icerik.not)}</p>` : ''}
    </div>
  </div>
</body>
</html>`;
}

/** WhatsApp / paylaşım metni */
export function BelgeMetinOlustur(icerik: BelgeIcerik): string {
  const marka = icerik.platformAdi ?? 'Tamuso';
  const satirlar = (icerik.satirlar ?? [])
    .map((s) => `• ${s.etiket}: ${s.deger}`)
    .join('\n');
  const bolumler = (icerik.bolumler ?? [])
    .map((b) => {
      const ic = (b.satirlar ?? [])
        .map((s) => `  • ${s.etiket}: ${s.deger}`)
        .join('\n');
      return `*${b.baslik}*\n${b.ozet ?? ''}\n${ic}`.trim();
    })
    .join('\n\n');

  return [
    `*${marka} — ${icerik.baslik}*`,
    icerik.altBaslik ?? '',
    icerik.ozet ?? '',
    satirlar,
    bolumler,
    icerik.not ?? '',
    '',
    `${i18n.t('belge.tarih')}: ${new Date().toLocaleString(AktifSayiLocale(i18n.language))}`,
  ]
    .filter((x) => x.trim().length > 0)
    .join('\n');
}
