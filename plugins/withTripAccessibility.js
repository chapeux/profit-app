const { withAndroidManifest, withDangerousMod, withPlugins } = require("@expo/config-plugins");
const path = require("path");
const fs   = require("fs");

function withManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    if (!manifest["uses-permission"]) manifest["uses-permission"] = [];
    for (const perm of [
      "android.permission.BIND_ACCESSIBILITY_SERVICE",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.FOREGROUND_SERVICE",
    ]) {
      if (!manifest["uses-permission"].some((p) => p.$?.["android:name"] === perm)) {
        manifest["uses-permission"].push({ $: { "android:name": perm } });
      }
    }

    const app = manifest.application?.[0];
    if (!app) return cfg;
    if (!app.service) app.service = [];

    const A11Y_CLASS = "com.motoganhos.TripReaderService";
    if (!app.service.some((s) => s.$?.["android:name"] === A11Y_CLASS)) {
      app.service.push({
        $: {
          "android:name":       A11Y_CLASS,
          "android:permission": "android.permission.BIND_ACCESSIBILITY_SERVICE",
          "android:exported":   "true",
        },
        "intent-filter": [{ action: [{ $: { "android:name": "android.accessibilityservice.AccessibilityService" } }] }],
        "meta-data": [{ $: { "android:name": "android.accessibilityservice", "android:resource": "@xml/trip_reader_config" } }],
      });
    }

    const OVL_CLASS = "com.motoganhos.OverlayService";
    if (!app.service.some((s) => s.$?.["android:name"] === OVL_CLASS)) {
      app.service.push({
        $: { "android:name": OVL_CLASS, "android:exported": "false" },
      });
    }

    return cfg;
  });
}

function withFiles(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const root    = cfg.modRequest.projectRoot;
      const main    = path.join(root, "android", "app", "src", "main");
      const javaDir = path.join(main, "java", "com", "motoganhos");
      const xmlDir  = path.join(main, "res", "xml");
      const srcDir  = path.join(root, "android-src");

      fs.mkdirSync(javaDir, { recursive: true });
      fs.mkdirSync(xmlDir,  { recursive: true });

      const kotlinFiles = [
        "TripTextParser.kt",
        "TripReaderService.kt",
        "TripReaderModule.kt",
        "TripReaderPackage.kt",
        "OverlayService.kt",
        "OverlayModule.kt",
        "OverlayPackage.kt",
        "SettingsModule.kt",
        "SettingsPackage.kt",
      ];
      for (const file of kotlinFiles) {
        const src = path.join(srcDir, file);
        const dst = path.join(javaDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
          console.log(`[withTripAccessibility] Copiado ${file}`);
        } else {
          console.warn(`[withTripAccessibility] Não encontrado: ${src}`);
        }
      }

      const xmlSrc = path.join(srcDir, "trip_reader_config.xml");
      const xmlDst = path.join(xmlDir,  "trip_reader_config.xml");
      if (fs.existsSync(xmlSrc)) {
        fs.copyFileSync(xmlSrc, xmlDst);
      }

      // Patch MainApplication.kt
      const mainApp = path.join(javaDir, "MainApplication.kt");
      if (fs.existsSync(mainApp)) {
        let content = fs.readFileSync(mainApp, "utf8");

        const packages = [
          ["TripReaderPackage", "com.motoganhos.TripReaderPackage"],
          ["OverlayPackage",    "com.motoganhos.OverlayPackage"],
          ["SettingsPackage",   "com.motoganhos.SettingsPackage"],
        ];

        for (const [className, importPath] of packages) {
          if (!content.includes(className)) {
            content = content.replace(
              /^(package com\.motoganhos\s*\n)/m,
              `$1\nimport ${importPath}\n`
            );
            content = content.replace(
              /(val packages = PackageList\(this\)\.packages)/,
              `$1\n      packages.add(${className}())`
            );
          }
        }

        fs.writeFileSync(mainApp, content, "utf8");
        console.log("[withTripAccessibility] MainApplication.kt patcheado");
      } else {
        console.warn("[withTripAccessibility] MainApplication.kt não encontrado");
      }

      return cfg;
    },
  ]);
}

module.exports = function withTripAccessibility(config) {
  return withPlugins(config, [withManifest, withFiles]);
};
