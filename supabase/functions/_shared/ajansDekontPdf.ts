/** Tamuso ajans ödeme dekontu — sade / profesyonel */
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

function asciiSafe(s: string): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/[^\x20-\x7E]/g, '?');
}

export type DekontPdfGirdi = {
  agencyName: string;
  agencyPublicId?: string;
  agencyId?: string;
  packageTitle: string;
  amountTry: number;
  coins: number;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerUsername?: string;
  buyerPublicId?: string;
  buyerId?: string;
  saleId: string;
  saleCode?: string;
  stripePi?: string;
  stripeSession?: string;
  sellingPlatform?: string;
  paidAtIso: string;
};

const INK = rgb(0.12, 0.12, 0.14);
const MUTED = rgb(0.45, 0.45, 0.48);
const RULE = rgb(0.88, 0.88, 0.9);
const ACCENT = rgb(0.15, 0.15, 0.17);

/** Şablon sürümü — değişince PDF yeniden üretilir */
export const DEKONT_PDF_VERSION = 3;

export async function AjansDekontPdfBytes(g: DekontPdfGirdi): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const left = 56;
  const labelW = 150;
  let y = 780;

  page.drawText('TAMUSO', {
    x: left,
    y,
    size: 11,
    font: fontBold,
    color: ACCENT,
  });
  y -= 22;
  page.drawText('Odeme Dekontu', {
    x: left,
    y,
    size: 22,
    font: fontBold,
    color: INK,
  });
  y -= 14;
  page.drawText('Odeme alindi', {
    x: left,
    y,
    size: 10,
    font,
    color: MUTED,
  });
  y -= 18;
  page.drawRectangle({
    x: left,
    y,
    width: 595 - left * 2,
    height: 0.75,
    color: RULE,
  });
  y -= 28;

  const tarih = asciiSafe(g.paidAtIso).slice(0, 19).replace('T', ' ');
  const dekontNo = String(g.saleId || '').replace(/-/g, '').slice(0, 10).toUpperCase();

  const bolum = (baslik: string) => {
    page.drawText(asciiSafe(baslik).toUpperCase(), {
      x: left,
      y,
      size: 8,
      font: fontBold,
      color: MUTED,
    });
    y -= 16;
  };

  const satir = (etiket: string, deger: string) => {
    page.drawText(asciiSafe(etiket), {
      x: left,
      y,
      size: 9,
      font,
      color: MUTED,
    });
    page.drawText(asciiSafe(deger || '-').slice(0, 62), {
      x: left + labelW,
      y,
      size: 10,
      font: fontBold,
      color: INK,
    });
    y -= 17;
  };

  bolum('Alici');
  satir('Ad', g.buyerName || '-');
  if (g.buyerUsername) satir('Kullanici adi', `@${g.buyerUsername}`);
  satir('Kullanici no', g.buyerPublicId || '-');
  if (g.buyerEmail) satir('E-posta', g.buyerEmail);
  if (g.buyerPhone) satir('Telefon', g.buyerPhone);

  y -= 8;
  bolum('Satan ajans');
  satir('Ajans', g.agencyName || '-');
  satir('Ajans no', g.agencyPublicId || '-');

  y -= 8;
  bolum('Islem');
  satir('Paket', g.packageTitle || '-');
  satir('Tutar', `${Number(g.amountTry).toFixed(2)} TL`);
  satir('Coin', String(Number(g.coins) || 0));
  if (g.sellingPlatform) satir('Platform', g.sellingPlatform);
  if (g.saleCode) satir('Satis kodu', g.saleCode);
  satir('Dekont no', dekontNo);
  satir('Tarih', tarih);

  y -= 24;
  page.drawRectangle({
    x: left,
    y,
    width: 595 - left * 2,
    height: 0.75,
    color: RULE,
  });
  y -= 18;
  page.drawText('Tamuso  ·  Guvenli odeme belgesi', {
    x: left,
    y,
    size: 8,
    font,
    color: MUTED,
  });

  return await doc.save();
}
