type Props = {
  visible: boolean;
  catalog: 'coin' | 'ai_music' | 'agency_package';
  packageId?: string;
  productId?: string;
  offerId?: string;
  baslik?: string;
  onClose: () => void;
  onBasarili: () => void;
  onHata?: (mesaj: string) => void;
};

/** iOS: harici ödeme sayfası yok; dijital içerik yalnızca App Store ile satılır. */
export function StripeCheckoutWebSheet(_props: Props) {
  return null;
}
