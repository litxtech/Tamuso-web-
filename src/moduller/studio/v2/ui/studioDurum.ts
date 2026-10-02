import type { CeviriAnahtari } from '../../../../i18n/useCeviri';

export function durumAnahtari(durum: string): CeviriAnahtari {
  switch (durum) {
    case 'PLANNING':
      return 'studio.durumTasarim';
    case 'GENERATING_ASSETS':
      return 'studio.durumModeller';
    case 'BUILDING_SCENE':
      return 'studio.durumSahne';
    case 'BUILDING_GAMEPLAY':
      return 'studio.durumOynanis';
    case 'READY_FOR_PREVIEW':
      return 'studio.durumOnizleme';
    case 'PRIVATE_TEST':
      return 'studio.durumOzel';
    case 'SUBMITTED':
    case 'IN_REVIEW':
    case 'SCANNING':
    case 'CHANGES_REQUESTED':
      return 'studio.durumInceleme';
    case 'APPROVED':
    case 'PUBLISHED':
      return 'studio.durumYayin';
    case 'FAILED':
      return 'studio.durumHata';
    case 'CANCELLED':
      return 'studio.durumDurdu';
    case 'ARCHIVED':
      return 'studio.durumArsiv';
    default:
      return 'studio.durumTaslak';
  }
}

export function isAnahtari(kind: string): CeviriAnahtari {
  switch (kind) {
    case 'GAME_SPEC':
      return 'studio.isSpec';
    case 'GAME_DESIGN':
      return 'studio.isTasarim';
    case 'ASSET_PLAN':
      return 'studio.isPlan';
    case 'MESHY_MODEL':
      return 'studio.isModel';
    case 'MESHY_TEXTURE':
      return 'studio.isDoku';
    case 'MESHY_RIG':
      return 'studio.isIskelet';
    case 'MESHY_ANIMATION':
      return 'studio.isAnim';
    case 'ELEVENLABS_SFX':
    case 'ELEVENLABS_VOICE':
    case 'ELEVENLABS_MUSIC':
      return 'studio.isSes';
    case 'R2_UPLOAD':
    case 'ASSET_PROCESS':
      return 'studio.isDosya';
    case 'SCENE_BUILD':
      return 'studio.isSahneKur';
    case 'GAMEPLAY_BUILD':
      return 'studio.isOynanisKur';
    case 'PREVIEW_BUILD':
      return 'studio.isOnizlemeKur';
    case 'SECURITY_SCAN':
      return 'studio.isTara';
    case 'COVER':
      return 'studio.kapakDegistir';
    case 'PUBLISH_BUILD':
      return 'studio.isYayin';
    default:
      return 'studio.isDosya';
  }
}
