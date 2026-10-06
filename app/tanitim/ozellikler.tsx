import { WebTanitimKabuk } from '../../src/moduller/web-tanitim/WebTanitimKabuk';
import { WebTanitimOzellikler } from '../../src/moduller/web-tanitim/WebTanitimSayfalar';

export default function TanitimOzelliklerSayfa() {
  return (
    <WebTanitimKabuk>
      <WebTanitimOzellikler />
    </WebTanitimKabuk>
  );
}
