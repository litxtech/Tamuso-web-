const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Yerel lobi / medya mp4 asset'leri
config.resolver.assetExts = Array.from(
  new Set([...(config.resolver.assetExts ?? []), 'mp4', 'mov', 'webm', 'txt']),
);

// Windows EMFILE: Metro'nun izlememesi gereken ağır / ilgisiz yollar
// Not: kök `sis-spin/` Vite referansı — `src/moduller/oyunlar/sis-spin` uygulama kodu, engellenmez
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sisSpinReferans = path.resolve(__dirname, 'sis-spin');
const blockExtras = [
  /[\\/]load-tests[\\/].*/,
  /[\\/]imports[\\/].*/,
  /[\\/]\.expo[\\/].*/,
  /[\\/]\.cursor[\\/].*/,
  /[\\/]agent-transcripts[\\/].*/,
  /eas-.*\.log$/,
  /\.log$/,
  /[\\/]docs[\\/]_i18n.*/,
  /[\\/]docs[\\/]odeme[\\/].*/,
  /kaskad-sim.*\.json$/,
  /COUNTRY_LEAGUE_.*\.md$/,
  /HEADER_AUDIT\.md$/,
  /I18N_.*\.md$/,
  /MESSAGING_V2_.*\.md$/,
  /ZEUS_V2_.*\.md$/,
  new RegExp(`^${escapeRe(sisSpinReferans)}([\\\\/].*)?$`),
];
const existing = config.resolver.blockList;
if (Array.isArray(existing)) {
  config.resolver.blockList = [...existing, ...blockExtras];
} else if (existing instanceof RegExp) {
  config.resolver.blockList = [existing, ...blockExtras];
} else {
  config.resolver.blockList = blockExtras;
}

// Watcher sağlık kontrolü — dosya handle baskısını azaltır
config.watcher = {
  ...(config.watcher ?? {}),
  healthCheck: {
    ...(config.watcher?.healthCheck ?? {}),
    enabled: true,
  },
};

// Tek proje kökü — workspace kökünden ekstra watch tetiklenmesin
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

const WEB_NATIVE_STUB = path.resolve(__dirname, 'src/web/native-modul-bos.js');
const WEB_NATIVE_PAKETLER = [
  'react-native-agora',
  '@livekit/react-native',
  '@livekit/react-native-webrtc',
  'react-native-webrtc',
  '@stripe/stripe-react-native',
  'expo-iap',
  '@supersami/rn-foreground-service',
  'react-native-compressor',
  'react-native-nitro-modules',
  'expo-widgets',
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    WEB_NATIVE_PAKETLER.some(
      (paket) => moduleName === paket || moduleName.startsWith(`${paket}/`),
    )
  ) {
    return { type: 'sourceFile', filePath: WEB_NATIVE_STUB };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
