import type { DirektMesaj } from '../okuma/MesajlariGetir';

type Props = {
  item: DirektMesaj;
  gonderildi: boolean;
};

export function AjansPaketTalebiMi(item: DirektMesaj): boolean {
  return item.message_type === 'text' && item.media_meta?.kind === 'agency_package_request';
}

/** iOS: harici ödemeli coin paketi teklifi oluşturulmaz. */
export function MesajAjansPaketTalepDugmesi(_props: Props) {
  return null;
}
