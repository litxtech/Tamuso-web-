import type { ConfigContext, ExpoConfig } from 'expo/config';
import fs from 'node:fs';

const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME ?? 'Tamuso';
const SCHEME = process.env.EXPO_PUBLIC_APP_SCHEME ?? 'muta';

const envBadge =
  APP_ENV === 'production' ? '' : APP_ENV === 'test' ? ' (Test)' : ' (Dev)';
const displayName = `${APP_NAME}${envBadge}`;

/** Android FCM: EAS env veya proje kökü google-services.json */
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ||
  (fs.existsSync('./google-services.json') ? './google-services.json' : undefined);

const bildirimSesleri = [
  './assets/sounds/mesaj_uc_ton.wav',
  './assets/sounds/gelen_arama.wav',
].filter((yol) => fs.existsSync(yol));

/** Web export Info.plist / Android manifest eklentilerini çalıştırmaz. */
const webDerlemesi =
  process.env.VERCEL === '1' ||
  process.argv.includes('--platform=web') ||
  (process.argv.includes('--platform') &&
    process.argv[process.argv.indexOf('--platform') + 1] === 'web');

const yerelEklentiler = webDerlemesi
  ? []
  : [
      './plugins/withSesOdasiForegroundService.js',
      './plugins/withTamusoCallKit.js',
      './plugins/withAndroidIncomingCall.js',
    ].filter((yol) => fs.existsSync(yol));

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: displayName,
  slug: 'muta',
  owner: 'mutaq',
  version: '1.2.5',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  scheme: SCHEME,
  ios: {
    supportsTablet: false,
    usesAppleSignIn: true,
    bundleIdentifier: 'com.litxtech.muta',
    // Push: ilk device build'de "Push Notifications? No" secildi.
    // Sonraki build'de credential yenilenince Push capability + APNs acilmali.
    entitlements: {
      'aps-environment':
        APP_ENV === 'production' ? 'production' : 'development',
    },
    infoPlist: {
      CFBundleDisplayName: displayName,
      CFBundleName: APP_NAME,
      // audio: (1) ses odası LiveKit arka plan, (2) durum/DM video Picture-in-Picture
      // voip: PushKit incoming call (CallKit) — ActivityKit ayrı (NSSupportsLiveActivities)
      // İncelemede bulunabilir olmalı — bkz. docs/store-review/PIP_ARKA_PLAN_SES.md
      UIBackgroundModes: ['remote-notification', 'audio', 'voip'],
      NSSupportsLiveActivities: true,
      NSSupportsLiveActivitiesFrequentUpdates: false,
      NSCameraUsageDescription:
        'Tamuso uses the camera for profile photos, direct messages, live video calls, and identity verification (KYC). For example, you can take a selfie for KYC or share a photo in chat.',
      NSMicrophoneUsageDescription:
        'Tamuso uses the microphone for voice rooms, live streams, and video/voice calls. For example, when you join a voice room as a speaker, audio is sent to other participants. Background audio keeps the room connected if you briefly leave the app.',
      NSBluetoothAlwaysUsageDescription:
        'Tamuso uses Bluetooth to connect headphones and headsets during voice rooms and calls.',
      NSBluetoothPeripheralUsageDescription:
        'Tamuso uses Bluetooth to connect headphones and headsets during voice rooms and calls.',
      ITSAppUsesNonExemptEncryption: false,
      LSApplicationQueriesSchemes: ['whatsapp', 'whatsapp-business'],
      CFBundleAllowMixedLocalizations: true,
      CFBundleLocalizations: ['tr', 'en', 'es', 'pt', 'ar'],
    },
  },
  android: {
    label: displayName,
    userInterfaceStyle: 'dark',
    softwareKeyboardLayoutMode: 'resize',
    adaptiveIcon: {
      backgroundColor: '#0B0614',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    package: 'com.litxtech.muta',
    // Firebase Cloud Messaging (FCM) — google-services.json zorunlu (build)
    ...(googleServicesFile ? { googleServicesFile } : {}),
    permissions: [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.WAKE_LOCK',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.VIBRATE',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      // Gerçek 1:1 arama — Play Console'da Calling app olarak beyan et
      'android.permission.USE_FULL_SCREEN_INTENT',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
    output: 'single',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-local-authentication',
      {
        faceIDPermission:
          'Tamuso uses Face ID to unlock the app when you return. For example, after you leave Tamuso, Face ID confirms it is you before your messages and wallet are shown.',
      },
    ],
    'expo-font',
    'expo-dev-client',
    'expo-apple-authentication',
    'expo-web-browser',
    'expo-iap',
    'expo-localization',
    [
      '@stripe/stripe-react-native',
      {
        enableGooglePay: true,
      },
    ],
    'expo-system-ui',
    'expo-sharing',
    'react-native-compressor',
    [
      '@livekit/react-native-expo-plugin',
      {
        android: {
          // Android→iOS ses için CommunicationAudioType zorunlu
          audioType: 'communication',
        },
      },
    ],
    ...yerelEklentiler,
    // expo-widgets / App Groups kapalı — Ad Hoc profil App Groups istemiyor.
    // Live Activity native target yok; JS tarafı soft-fail.
    '@config-plugins/react-native-webrtc',
    [
      'expo-image-picker',
      {
        photosPermission:
          'Allow $(PRODUCT_NAME) to access your photos for profile and cover images.',
        cameraPermission:
          'Allow $(PRODUCT_NAME) to access your camera for messages, live video and KYC.',
      },
    ],
    [
      'expo-audio',
      {
        microphonePermission:
          'Allow $(PRODUCT_NAME) to access your microphone for voice rooms and live.',
        enableBackgroundPlayback: true,
        enableBackgroundRecording: false,
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'Allow $(PRODUCT_NAME) to access your camera for messages, live video, KYC and wallet QR scan.',
        microphonePermission:
          'Allow $(PRODUCT_NAME) to access your microphone for voice rooms and live.',
        recordAudioAndroid: true,
        barcodeScannerEnabled: true,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
        },
        ios: {
          deploymentTarget: '16.4',
        },
      },
    ],
    [
      'expo-notifications',
      {
        color: '#E84091',
        defaultChannel: 'genel',
        ...(bildirimSesleri.length ? { sounds: bildirimSesleri } : {}),
      },
    ],
    [
      'expo-video',
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      'expo-pip',
      {
        // Ses odası PiP sistem aksiyonu — monokrom beyaz X
        icons: ['./assets/pip/pip_close.png'],
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0B0614',
        // Android styles her zaman @drawable/splashscreen_logo bekler;
        // image yoksa drawable üretilmez ve processDebugResources patlar.
        image: './assets/splash-icon.png',
        imageWidth: 200,
        dark: {
          backgroundColor: '#0B0614',
          image: './assets/splash-icon.png',
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appEnv: APP_ENV,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    livekitUrl: process.env.EXPO_PUBLIC_LIVEKIT_URL,
    livekitTokenUrl: process.env.EXPO_PUBLIC_LIVEKIT_TOKEN_URL,
    rtcProvider: 'livekit',
    androidFcmEnabled: !!googleServicesFile,
    eas: {
      projectId: '36cb815b-2891-4075-a1a8-89902e491af5',
    },
  },
});
