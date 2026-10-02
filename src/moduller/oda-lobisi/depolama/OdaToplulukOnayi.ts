/**
 * Platform politikaları kayıtta onaylanır.
 * Oda girişi için yalnızca tek seferlik hafif topluluk hatırlatması tutulur.
 * Bir kez onaylandıysa sonraki girişlerde lobi onay ekranı atlanır.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'oda_topluluk_hatirlatma_v1';

/** AsyncStorage okumasını her tıklamada beklememek için bellek önbelleği */
let bellekOnay: boolean | null = null;

export async function OdaToplulukOnayiVarMi(): Promise<boolean> {
  if (bellekOnay !== null) return bellekOnay;
  try {
    const v = (await AsyncStorage.getItem(KEY)) === '1';
    bellekOnay = v;
    return v;
  } catch {
    return false;
  }
}

export async function OdaToplulukOnayiniKaydet(): Promise<void> {
  bellekOnay = true;
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    /* sessiz */
  }
}
