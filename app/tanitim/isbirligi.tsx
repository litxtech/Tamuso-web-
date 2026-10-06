import { WebTanitimKabuk } from '../../src/moduller/web-tanitim/WebTanitimKabuk';
import { WebTanitimIsbirligi } from '../../src/moduller/web-tanitim/WebTanitimSayfalar';

export default function IsbirligiSayfasi() {
  return (
    <WebTanitimKabuk>
      <WebTanitimIsbirligi />
    </WebTanitimKabuk>
  );
}
