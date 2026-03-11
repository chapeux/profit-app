const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs   = require("fs");
const path = require("path");

// ─── 1. Manifest: permissions + service ───────────────────────────────────────
function withManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest    = cfg.modResults;
    const app         = manifest.manifest;
    const mainApp     = app.application[0];

    // Permissions
    const needed = [
      "android.permission.BIND_ACCESSIBILITY_SERVICE",
      "android.permission.SYSTEM_ALERT_WINDOW",
    ];
    if (!app["uses-permission"]) app["uses-permission"] = [];
    needed.forEach((name) => {
      const exists = app["uses-permission"].some((p) => p.$?.["android:name"] === name);
      if (!exists) app["uses-permission"].push({ $: { "android:name": name } });
    });

    // AccessibilityService declaration
    if (!mainApp.service) mainApp.service = [];
    const svcName = "com.motoganhos.TripReaderService";
    const exists  = mainApp.service.some((s) => s.$?.["android:name"] === svcName);
    if (!exists) {
      mainApp.service.push({
        $: {
          "android:name":       svcName,
          "android:permission": "android.permission.BIND_ACCESSIBILITY_SERVICE",
          "android:exported":   "true",
        },
        "intent-filter": [{ action: [{ $: { "android:name": "android.accessibilityservice.AccessibilityService" } }] }],
        "meta-data": [{
          $: {
            "android:name":     "android.accessibilityservice",
            "android:resource": "@xml/trip_reader_config",
          },
        }],
      });
    }

    return cfg;
  });
}

// ─── 2. Copy Kotlin sources + XML ─────────────────────────────────────────────
function withKotlinSources(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const root    = cfg.modRequest.projectRoot;
      const srcDir  = path.join(root, "android-src");
      const destDir = path.join(root, "android", "app", "src", "main", "java", "com", "motoganhos");
      const xmlDir  = path.join(root, "android", "app", "src", "main", "res", "xml");

      fs.mkdirSync(destDir, { recursive: true });
      fs.mkdirSync(xmlDir,  { recursive: true });

      const ktFiles = [
        "TripReaderService.kt",
        "TripReaderModule.kt",
        "TripReaderPackage.kt",
        "TripTextParser.kt",
        "TripOverlayView.kt",
      ];

      ktFiles.forEach((file) => {
        const src = path.join(srcDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(destDir, file));
          console.log(`[withTripAccessibility] copied ${file}`);
        } else {
          console.warn(`[withTripAccessibility] missing: ${src}`);
        }
      });

      // Copy XML config
      const xmlSrc = path.join(srcDir, "trip_reader_config.xml");
      if (fs.existsSync(xmlSrc)) {
        fs.copyFileSync(xmlSrc, path.join(xmlDir, "trip_reader_config.xml"));
        console.log("[withTripAccessibility] copied trip_reader_config.xml");
      }

      return cfg;
    },
  ]);
}

// ─── 3. Patch MainApplication.kt to register TripReaderPackage ────────────────
function withMainApplicationPatch(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const root    = cfg.modRequest.projectRoot;
      const pkgName = cfg.android?.package ?? "com.motoganhos";
      const parts   = pkgName.split(".");
      const mainApp = path.join(
        root, "android", "app", "src", "main", "java",
        ...parts, "MainApplication.kt"
      );

      if (!fs.existsSync(mainApp)) {
        console.warn("[withTripAccessibility] MainApplication.kt not found — skipping patch");
        return cfg;
      }

      let src = fs.readFileSync(mainApp, "utf8");

      // Add import if missing
      const importLine = "import com.motoganhos.TripReaderPackage";
      if (!src.includes(importLine)) {
        src = src.replace(/^(package .+)$/m, `$1\n${importLine}`);
      }

      // Patch packages list — handles both apply{} and plain list styles
      if (!src.includes("TripReaderPackage()")) {
        src = src
          .replace(
            /PackageList\(this\)\.packages\.apply\s*\{/,
            "PackageList(this).packages.apply {\n          add(TripReaderPackage())"
          )
          .replace(
            /PackageList\(this\)\.packages(?!\.apply)/,
            "PackageList(this).packages.also { it.add(TripReaderPackage()) }"
          );
      }

      fs.writeFileSync(mainApp, src, "utf8");
      console.log("[withTripAccessibility] patched MainApplication.kt");
      return cfg;
    },
  ]);
}

module.exports = (config) =>
  withMainApplicationPatch(withKotlinSources(withManifest(config)));
