import { WebTanitimAnasayfa } from '../../src/moduller/web-tanitim/WebTanitimAnasayfa';
import { WebTanitimKabuk } from '../../src/moduller/web-tanitim/WebTanitimKabuk';

export default function TanitimAnasayfa() {
  return (
    <WebTanitimKabuk>
      <WebTanitimAnasayfa />
    </WebTanitimKabuk>
  );
}
