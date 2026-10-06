import { WebTanitimHakkinda } from '../../src/moduller/web-tanitim/WebTanitimSayfalar';
import { WebTanitimKabuk } from '../../src/moduller/web-tanitim/WebTanitimKabuk';

export default function TanitimHakkindaSayfa() {
  return (
    <WebTanitimKabuk>
      <WebTanitimHakkinda />
    </WebTanitimKabuk>
  );
}
