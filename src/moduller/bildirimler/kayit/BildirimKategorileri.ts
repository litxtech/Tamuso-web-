/**
 * WhatsApp/Instagram tarzı bildirim aksiyonları (Yanıtla, Okundu, Takip et).
 * OS tarafında setNotificationCategoryAsync; push'ta categoryId gerekir.
 */
import * as Notifications from 'expo-notifications';
import i18n from '../../../i18n';

export const BILDIRIM_KATEGORI_DM = 'dm';
export const BILDIRIM_KATEGORI_FOLLOW = 'follow';
export const BILDIRIM_KATEGORI_FOLLOW_REQUEST = 'follow_request';

export const BILDIRIM_AKSIYON_YANITLA = 'REPLY';
export const BILDIRIM_AKSIYON_OKUNDU = 'MARK_READ';
export const BILDIRIM_AKSIYON_TAKIP = 'FOLLOW_BACK';
export const BILDIRIM_AKSIYON_KABUL = 'ACCEPT_FOLLOW';

let kurulu = false;

export async function BildirimKategorileriniKur(): Promise<void> {
  if (kurulu) return;
  try {
    await Notifications.setNotificationCategoryAsync(BILDIRIM_KATEGORI_DM, [
      {
        identifier: BILDIRIM_AKSIYON_YANITLA,
        buttonTitle: i18n.t('bildirimler.aksiyonYanitla', {
          defaultValue: 'Yanıtla',
        }),
        textInput: {
          submitButtonTitle: i18n.t('bildirimler.aksiyonGonder', {
            defaultValue: 'Gönder',
          }),
          placeholder: i18n.t('bildirimler.aksiyonYanitPlaceholder', {
            defaultValue: 'Mesaj yaz…',
          }),
        },
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: BILDIRIM_AKSIYON_OKUNDU,
        buttonTitle: i18n.t('bildirimler.aksiyonOkundu', {
          defaultValue: 'Okundu',
        }),
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync(BILDIRIM_KATEGORI_FOLLOW, [
      {
        identifier: BILDIRIM_AKSIYON_TAKIP,
        buttonTitle: i18n.t('bildirimler.aksiyonTakipEt', {
          defaultValue: 'Takip et',
        }),
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync(
      BILDIRIM_KATEGORI_FOLLOW_REQUEST,
      [
        {
          identifier: BILDIRIM_AKSIYON_KABUL,
          buttonTitle: i18n.t('bildirimler.aksiyonKabulEt', {
            defaultValue: 'Kabul et',
          }),
          options: {
            opensAppToForeground: false,
          },
        },
      ],
    );

    kurulu = true;
  } catch (e) {
    console.warn(
      '[Push] kategori',
      e instanceof Error ? e.message : e,
    );
  }
}
