type Props = {
  locked?: boolean;
  onPaketleriYenile?: () => void;
};

/** iOS: coin yalnızca App Store uygulama içi satın alma ile yüklenir; ajans satış kanalı gösterilmez. */
export function YetkiliAjansYukleSeridi(_props: Props) {
  return null;
}
