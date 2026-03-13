const {
  withAndroidManifest,
  createRunOncePlugin,
} = require("@expo/config-plugins");

/**
 * Removes android.permission.RECORD_AUDIO using the Android manifest merger's
 * tools:node="remove" directive. This works at Gradle merge time, so it strips
 * the permission even if it's declared inside a dependency's library manifest
 * (e.g. expo-audio's AAR), not just the app-level manifest.
 */
const withRemoveRecordAudio = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Ensure the tools namespace is declared on the root manifest element
    manifest.$ = manifest.$ || {};
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";

    // Add a tools:node="remove" entry for RECORD_AUDIO.
    // The manifest merger will use this to strip the permission from ALL sources,
    // including library manifests from dependencies like expo-audio.
    const usesPermissions = manifest["uses-permission"] || [];

    const alreadyHandled = usesPermissions.some(
      (perm) =>
        perm.$?.["android:name"] === "android.permission.RECORD_AUDIO" &&
        perm.$?.["tools:node"] === "remove",
    );

    if (!alreadyHandled) {
      usesPermissions.push({
        $: {
          "android:name": "android.permission.RECORD_AUDIO",
          "tools:node": "remove",
        },
      });
    }

    manifest["uses-permission"] = usesPermissions;

    return config;
  });
};

module.exports = createRunOncePlugin(
  withRemoveRecordAudio,
  "withRemoveRecordAudio",
  "1.0.0",
);
