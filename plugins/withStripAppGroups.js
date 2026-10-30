/**
 * Strip App Groups from main + ExpoWidgetsTarget so Ad Hoc profiles
 * without group.com.* can sign (expo-widgets always injects them).
 */
const {
  withEntitlementsPlist,
  withDangerousMod,
  withXcodeProject,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const APP_GROUPS_KEY = 'com.apple.security.application-groups';
const WIDGET_TARGET = 'ExpoWidgetsTarget';

function stripFromEntitlementsObject(entitlements) {
  if (!entitlements || typeof entitlements !== 'object') return entitlements;
  if (APP_GROUPS_KEY in entitlements) {
    delete entitlements[APP_GROUPS_KEY];
  }
  return entitlements;
}

function stripEasAppExtensionGroups(config) {
  const exts = config.extra?.eas?.build?.experimental?.ios?.appExtensions;
  if (!Array.isArray(exts)) return config;
  for (const ext of exts) {
    if (ext?.entitlements && APP_GROUPS_KEY in ext.entitlements) {
      delete ext.entitlements[APP_GROUPS_KEY];
      if (Object.keys(ext.entitlements).length === 0) {
        delete ext.entitlements;
      }
    }
  }
  return config;
}

function withStripAppGroups(config) {
  // Remove from app.config ios.entitlements + generated entitlements plist
  config = withEntitlementsPlist(config, (cfg) => {
    cfg.modResults = stripFromEntitlementsObject(cfg.modResults);
    if (cfg.ios?.entitlements) {
      cfg.ios.entitlements = stripFromEntitlementsObject({
        ...cfg.ios.entitlements,
      });
    }
    return cfg;
  });

  // Empty widget extension entitlements file (expo-widgets writes App Groups there)
  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const root = cfg.modRequest.platformProjectRoot;
      const entitlementsPath = path.join(
        root,
        WIDGET_TARGET,
        `${WIDGET_TARGET}.entitlements`,
      );
      if (fs.existsSync(entitlementsPath)) {
        // Empty dict — keep file so CODE_SIGN_ENTITLEMENTS still resolves
        fs.writeFileSync(
          entitlementsPath,
          `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict/>
</plist>
`,
        );
      }
      return cfg;
    },
  ]);

  // Ensure EAS credential sync does not require App Groups on either target
  config = stripEasAppExtensionGroups(config);

  // Re-strip after all plugins mutate config.extra (runs late via xcode project hook)
  config = withXcodeProject(config, (cfg) => {
    stripEasAppExtensionGroups(cfg);
    return cfg;
  });

  return config;
}

module.exports = withStripAppGroups;
