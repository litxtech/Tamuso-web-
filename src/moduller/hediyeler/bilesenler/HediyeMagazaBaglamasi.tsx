import React from 'react';
import { HediyeMagazaPaneli } from './HediyeMagazaPaneli';
import { HediyeAnimasyonKatmani } from './HediyeAnimasyonKatmani';
import { HesabiTamamlaKarti } from '../../misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useAuth, useWallet } from '../../../contexts/AuthContext';
import type { HediyeMagazaDurumu } from '../islemler/HediyeMagazaTipleri';

type Props = {
  magaza: HediyeMagazaDurumu;
  /** Animasyon katmanı (oda / canlı için true) */
  animasyon?: boolean;
  /** Misafir upgrade kartı (ekran zaten varsa false) */
  misafirKart?: boolean;
};

/** Ortak hediye paneli + misafir kartı + opsiyonel animasyon */
export function HediyeMagazaBaglamasi({
  magaza,
  animasyon = true,
  misafirKart = true,
}: Props) {
  const { refreshProfile } = useAuth();
  const { refreshWallet } = useWallet();
  const yukle = magaza.coinYuklePaneli;

  return (
    <>
      <HediyeMagazaPaneli
        visible={magaza.acik}
        gifts={magaza.gifts}
        coins={magaza.coins}
        coinKaynagi={magaza.coinKaynagi}
        onCoinKaynagiDegis={magaza.setCoinKaynagi}
        coinBakiyeleri={magaza.coinBakiyeleri}
        aliciAdi={magaza.aliciAdi}
        pkAlicilar={magaza.pkAlicilar}
        seciliPkAliciId={magaza.seciliPkAliciId}
        onPkAliciSec={magaza.setSeciliPkAliciId}
        onSend={magaza.gonder}
        onClose={magaza.kapat}
        onCoinYukle={magaza.coinYukle}
        coinPackages={yukle.packages}
        coinLocked={yukle.purchaseLocked}
        onCoinBuy={yukle.satinAl}
        onCoinPaketHazirla={yukle.paketleriYenile}
        gonderiyor={magaza.gonderiyor}
      />
      {animasyon ? <HediyeAnimasyonKatmani /> : null}
      {misafirKart ? (
        <HesabiTamamlaKarti
          visible={magaza.upgradeAcik || yukle.upgradeAcik}
          onClose={() => {
            magaza.upgradeKapat();
            yukle.upgradeKapat();
          }}
          onCompleted={() => {
            void refreshProfile();
            void refreshWallet();
          }}
        />
      ) : null}
    </>
  );
}
