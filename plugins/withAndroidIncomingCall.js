/**
 * Android incoming call: USE_FULL_SCREEN_INTENT + lock-screen wake.
 * Play policy: only for real calling apps / real incoming calls — not spam.
 */
const {
  withAndroidManifest,
  AndroidConfig,
} = require('expo/config-plugins');

function ensurePermission(androidManifest, name) {
  const manifest = androidManifest.manifest;
  if (!manifest['uses-permission']) {
    manifest['uses-permission'] = [];
  }
  const list = manifest['uses-permission'];
  const exists = list.some((p) => p?.$?.['android:name'] === name);
  if (!exists) {
    list.push({ $: { 'android:name': name } });
  }
}

function withAndroidIncomingCall(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    ensurePermission(manifest, 'android.permission.USE_FULL_SCREEN_INTENT');
    ensurePermission(manifest, 'android.permission.WAKE_LOCK');
    ensurePermission(manifest, 'android.permission.VIBRATE');
    // Android 13+
    ensurePermission(manifest, 'android.permission.POST_NOTIFICATIONS');

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    const activities = app.activity ?? [];
    for (const act of activities) {
      const name = act?.$?.['android:name'] ?? '';
      // MainActivity — arama bildirimi kilidi açıkken ekranı uyandırabilir
      if (
        name.endsWith('.MainActivity') ||
        name === '.MainActivity' ||
        name.includes('MainActivity')
      ) {
        act.$ = {
          ...act.$,
          'android:showWhenLocked': 'true',
          'android:turnScreenOn': 'true',
        };
      }
    }

    return cfg;
  });
}

module.exports = withAndroidIncomingCall;
