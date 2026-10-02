/** Toplam saniyeyi okunaklı süreye çevirir */
import i18n from '../../../i18n';

export function KullanimSuresiniFormatla(
  totalSeconds: number,
  opts?: { kisa?: boolean },
): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const gun = Math.floor(s / 86400);
  const saat = Math.floor((s % 86400) / 3600);
  const dk = Math.floor((s % 3600) / 60);

  if (opts?.kisa) {
    if (gun > 0) {
      return i18n.t('kullanimSuresiFmt.gunSaatKisa', { gun, saat });
    }
    if (saat > 0) {
      return i18n.t('kullanimSuresiFmt.saatDkKisa', { saat, dk });
    }
    if (dk > 0) return i18n.t('kullanimSuresiFmt.dkKisa', { dk });
    return i18n.t('kullanimSuresiFmt.snKisa', { sn: s });
  }

  const parcalar: string[] = [];
  if (gun > 0) parcalar.push(i18n.t('kullanimSuresiFmt.gun', { n: gun }));
  if (saat > 0) parcalar.push(i18n.t('kullanimSuresiFmt.saat', { n: saat }));
  if (dk > 0 || parcalar.length === 0) {
    parcalar.push(i18n.t('kullanimSuresiFmt.dk', { n: dk }));
  }
  return parcalar.join(' ');
}
