const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withRemoveRecordAudio(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;
    const usesPermissions = manifest["uses-permission"] || [];

    manifest["uses-permission"] = usesPermissions.filter(
      (perm) => perm.$?.["android:name"] !== "android.permission.RECORD_AUDIO",
    );

    return config;
  });
};
