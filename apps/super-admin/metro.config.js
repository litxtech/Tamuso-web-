// Tamuso Super Admin — ayrı Expo web uygulaması.
// Paylaşılan kodu (repo kökündeki src/) ve bağımlılıkları (repo kökündeki node_modules)
// izleyebilmek için monorepo benzeri bir Metro yapılandırması kullanır.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const PROJE = __dirname;
const KOK = path.resolve(__dirname, '..', '..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(PROJE);

config.projectRoot = PROJE;

// Repo kökündeki paylaşılan `src/` klasörünü izle
config.watchFolders = [KOK];

// Bağımlılıklar repo kökünde; alt uygulamada node_modules yok
config.resolver.nodeModulesPaths = [
  path.resolve(PROJE, 'node_modules'),
  path.resolve(KOK, 'node_modules'),
];

// React Native'in tek kopya kuralı — kök node_modules kullanılır
config.resolver.disableHierarchicalLookup = false;

// Varlık uzantıları (paylaşılan ekranlar medya import edebilir)
config.resolver.assetExts = Array.from(
  new Set([...(config.resolver.assetExts ?? []), 'mp4', 'mov', 'webm', 'txt']),
);

// Kök uygulamadaki ile aynı: web'de native-only paketler boş modüle yönlenir.
const WEB_NATIVE_STUB = path.resolve(KOK, 'src', 'web', 'native-modul-bos.js');
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
  '@expo/ui',
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

// Arşivlenen ekranlar (kök app dışına taşınanlar) Metro tarafından izlenmesin.
const arsiv = path.resolve(KOK, 'archive');
const mevcut = config.resolver.blockList;
const ekstra = [new RegExp(`^${arsiv.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\\\/].*)?$`)];
if (Array.isArray(mevcut)) config.resolver.blockList = [...mevcut, ...ekstra];
else if (mevcut instanceof RegExp) config.resolver.blockList = [mevcut, ...ekstra];
else config.resolver.blockList = ekstra;

module.exports = config;
