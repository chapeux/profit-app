const { withAndroidManifest, withDangerousMod, withPlugins } = require("@expo/config-plugins");
const path = require("path");
const fs   = require("fs");

// ── 1. Manifesto ─────────────────────────────────────────────────────────────

function withManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // Permissões
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

    // TripReaderService (AccessibilityService)
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

    // OverlayService (Service simples, sem foreground)
    const OVL_CLASS = "com.motoganhos.OverlayService";
    if (!app.service.some((s) => s.$?.["android:name"] === OVL_CLASS)) {
      app.service.push({
        $: {
          "android:name":     OVL_CLASS,
          "android:exported": "false",
        },
      });
    }

    return cfg;
  });
}

// ── 2. Copiar arquivos Kotlin + patch MainApplication ─────────────────────────

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

      // Arquivos Kotlin a copiar
      const kotlinFiles = [
        "TripTextParser.kt",
        "TripReaderService.kt",
        "TripReaderModule.kt",
        "TripReaderPackage.kt",
        "OverlayService.kt",
        "OverlayModule.kt",
        "OverlayPackage.kt",
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

      // XML de config do accessibility service
      const xmlSrc = path.join(srcDir, "trip_reader_config.xml");
      const xmlDst = path.join(xmlDir,  "trip_reader_config.xml");
      if (fs.existsSync(xmlSrc)) {
        fs.copyFileSync(xmlSrc, xmlDst);
        console.log("[withTripAccessibility] Copiado trip_reader_config.xml");
      }

      // Patch MainApplication.kt — registrar TripReaderPackage + OverlayPackage
      const mainApp = path.join(javaDir, "MainApplication.kt");
      if (fs.existsSync(mainApp)) {
        let content = fs.readFileSync(mainApp, "utf8");

        if (!content.includes("TripReaderPackage")) {
          content = content.replace(
            /^(package com\.motoganhos\s*\n)/m,
            "$1\nimport com.motoganhos.TripReaderPackage\n"
          );
          content = content.replace(
            /(val packages = PackageList\(this\)\.packages)/,
            "$1\n      packages.add(TripReaderPackage())"
          );
        }
        if (!content.includes("OverlayPackage")) {
          content = content.replace(
            /^(package com\.motoganhos\s*\n)/m,
            "$1\nimport com.motoganhos.OverlayPackage\n"
          );
          content = content.replace(
            /(val packages = PackageList\(this\)\.packages)/,
            "$1\n      packages.add(OverlayPackage())"
          );
        }

        fs.writeFileSync(mainApp, content, "utf8");
        console.log("[withTripAccessibility] MainApplication.kt patcheado");
      } else {
        console.warn("[withTripAccessibility] MainApplication.kt não encontrado — rode expo prebuild primeiro");
      }

      return cfg;
    },
  ]);
}

module.exports = function withTripAccessibility(config) {
  return withPlugins(config, [withManifest, withFiles]);
};
