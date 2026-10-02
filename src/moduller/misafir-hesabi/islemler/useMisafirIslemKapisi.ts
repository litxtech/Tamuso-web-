import { useCallback, useState } from 'react';
import { MisafirIslemEngellendiMi, type MisafirEngelliIslem } from '../islemler/MisafirIslemIzniKontrolu';

/**
 * Guest engelli islemde upgrade kartini acar.
 */
export function useMisafirIslemKapisi(isGuest: boolean) {
  const [upgradeAcik, setUpgradeAcik] = useState(false);

  const islemiDene = useCallback(
    (islem: MisafirEngelliIslem, devam: () => void) => {
      if (typeof devam !== 'function') return;
      if (MisafirIslemEngellendiMi(isGuest, islem)) {
        setUpgradeAcik(true);
        return;
      }
      devam();
    },
    [isGuest],
  );

  return {
    upgradeAcik,
    upgradeKapat: () => setUpgradeAcik(false),
    upgradeAc: () => setUpgradeAcik(true),
    islemiDene,
  };
}
