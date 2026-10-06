import { WebTanitimCoinler } from '../../src/moduller/web-tanitim/WebTanitimSayfalar';
import { WebTanitimKabuk } from '../../src/moduller/web-tanitim/WebTanitimKabuk';

export default function TanitimCoinlerSayfa() {
  return (
    <WebTanitimKabuk>
      <WebTanitimCoinler />
    </WebTanitimKabuk>
  );
}
