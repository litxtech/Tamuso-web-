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
  /[\\/]\.cache[\\/].*/,
  /[\\/]\.cursor[\\/].*/,
  /[\\/]agent-transcripts[\\/].*/,
  /eas-.*\.log$/,
  /\.log$/,
  /[\\/]docs[\\/]_i18n.*/,
  /[\\/]docs[\\/]odeme[\\/].*/,
  // iOS binary'sinden çıkarılan arşiv ekranları ve ayrı admin web uygulaması derlemesi
  /[\\/]archive[\\/].*/,
  /[\\/]apps[\\/]super-admin[\\/]dist[\\/].*/,
  /[\\/]apps[\\/]super-admin[\\/]\.expo[\\/].*/,
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

// Windows EMFILE: aynı anda açık dosya sayısını düşük tut
config.maxWorkers = 2;

// Windows EMFILE: iOS + Android aynı anda bundle'lanınca cache okuma/yazma ana süreçte
// binlerce dosyayı birden açar (maxWorkers bunu sınırlamaz). Eşzamanlılığı kıs, EMFILE'da tekrar dene.
const CACHE_ESZAMANLI = 64;
function sinirliCacheStore(store) {
  let aktif = 0;
  const bekleyen = [];
  const al = () => {
    if (aktif < CACHE_ESZAMANLI) {
      aktif += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => bekleyen.push(resolve));
  };
  const birak = () => {
    const siradaki = bekleyen.shift();
    if (siradaki) siradaki();
    else aktif -= 1;
  };
  const calistir = async (is) => {
    await al();
    try {
      for (let deneme = 0; ; deneme += 1) {
        try {
          return await is();
        } catch (err) {
          const kod = err && err.code;
          if ((kod !== 'EMFILE' && kod !== 'ENFILE') || deneme >= 6) throw err;
          await new Promise((r) => setTimeout(r, 40 * (deneme + 1)));
        }
      }
    } finally {
      birak();
    }
  };
  return {
    name: store.name ?? store.constructor.name,
    get: (key) => calistir(() => store.get(key)),
    set: (key, value) => calistir(() => store.set(key, value)),
    clear: () => store.clear(),
  };
}
if (Array.isArray(config.cacheStores)) {
  config.cacheStores = config.cacheStores.map(sinirliCacheStore);
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
  // swift-ui açılışta requireNativeView çağırır; web paketini beyaz ekranda bırakır
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

module.exports = config;
