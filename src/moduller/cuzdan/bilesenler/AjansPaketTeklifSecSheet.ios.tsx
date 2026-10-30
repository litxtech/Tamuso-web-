type Props = {
  visible: boolean;
  agencyId: string;
  threadId: string;
  talepMi?: boolean;
  onClose: () => void;
  onGonderildi?: () => void;
};

/** iOS: harici ödemeli coin paketi teklifi oluşturulmaz. */
export function AjansPaketTeklifSecSheet(_props: Props) {
  return null;
}
