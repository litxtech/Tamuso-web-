import { Share, Platform } from 'react-native';
import { BenimDavetKodumuAl } from '../okuma/DavetKodunuAl';
import {
  PaylasimHttpsUrlOlustur,
  PaylasimMesajiOlustur,
} from '../PaylasimUrl';
import { OrtamDegiskenleri } from '../../../yapilandirma/OrtamDegiskenleri';
import i18n from '../../../i18n';

export type PaylasimSonucu =
  | { ok: true; url: string; code: string }
  | { ok: false; hata: string };

/** Kişisel davet linki oluştur + sistem paylaşım paneli */
export async function UygulamayiPaylas(): Promise<PaylasimSonucu> {
  try {
    const davet = await BenimDavetKodumuAl();
    const url = PaylasimHttpsUrlOlustur(davet.code);
    const message = PaylasimMesajiOlustur({
      uygulamaAdi: OrtamDegiskenleri.uygulamaAdi,
      url,
      davetKodu: davet.code,
    });

    await Share.share(
      Platform.OS === 'ios'
        ? { message, url }
        : {
            message,
            title: i18n.t('paylasim.indirBaslik', {
              ad: OrtamDegiskenleri.uygulamaAdi,
            }),
          },
    );

    return { ok: true, url, code: davet.code };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('paylasim.basarisiz'),
    };
  }
}
