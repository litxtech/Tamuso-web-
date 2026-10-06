import { WebTanitimKabuk } from '../../src/moduller/web-tanitim/WebTanitimKabuk';
import { WebTanitimMeyve } from '../../src/moduller/web-tanitim/WebTanitimSayfalar';

export default function TanitimMeyveSayfa() {
  return (
    <WebTanitimKabuk>
      <WebTanitimMeyve />
    </WebTanitimKabuk>
  );
}
