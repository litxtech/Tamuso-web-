import { WebTanitimKabuk } from '../../src/moduller/web-tanitim/WebTanitimKabuk';
import { WebTanitimYatirim } from '../../src/moduller/web-tanitim/WebTanitimSayfalar';

export default function YatirimSayfasi() {
  return (
    <WebTanitimKabuk>
      <WebTanitimYatirim />
    </WebTanitimKabuk>
  );
}
