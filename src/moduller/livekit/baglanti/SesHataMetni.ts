import i18n from '../../../i18n';

/** Kullanıcıya gösterilen ses hatası. Teknik metin, paket adı ve build uyarısı dönmez. */
export function SesHataMetni(msg?: string | null): string {
  const ham = msg ?? '';
  if (/permission|NotAllowed|NotAllowedError/i.test(ham)) {
    return i18n.t('sesOda.mikrofonIzniGerekli');
  }
  if (/oturum gerekli|unauthorized|401/i.test(ham)) {
    return i18n.t('sesOda.tekrarGirisGerekli');
  }
  if (
    /network|timeout|ECONNRESET|Failed to fetch|Load failed|Could not fetch region/i.test(
      ham,
    )
  ) {
    return i18n.t('sesOda.sesInternetKontrol');
  }
  return i18n.t('sesOda.sesSuAnBaglanamadi');
}
