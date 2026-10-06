/**
 * VoIP background mode + Live Activity Info.plist keys for Tamuso CallKit.
 * Does not change bundle identifier or signing.
 */
const { withInfoPlist } = require('expo/config-plugins');

function ensureBackgroundMode(modes, mode) {
  if (!Array.isArray(modes)) return [mode];
  if (modes.includes(mode)) return modes;
  return [...modes, mode];
}

function withTamusoCallKit(config) {
  return withInfoPlist(config, (cfg) => {
    const plist = cfg.modResults;
    plist.UIBackgroundModes = ensureBackgroundMode(
      plist.UIBackgroundModes,
      'voip',
    );
    // ActivityKit / Live Activities
    plist.NSSupportsLiveActivities = true;
    plist.NSSupportsLiveActivitiesFrequentUpdates = false;
    return cfg;
  });
}

module.exports = withTamusoCallKit;
