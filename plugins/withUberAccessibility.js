/**
 * Expo Config Plugin — withUberAccessibility
 *
 * Applied automatically during `expo prebuild` (or `eas build`).
 * It performs three things:
 *
 *  1. Injects the BIND_ACCESSIBILITY_SERVICE permission into AndroidManifest.xml
 *  2. Declares UberReaderService in AndroidManifest.xml (with the required
 *     intent-filter and meta-data pointing to uber_reader_config.xml)
 *  3. Copies Kotlin source files from android-src/ into the generated
 *     android/app/src/main/java/com/motoganhos/ directory and copies
 *     uber_reader_config.xml into android/app/src/main/res/xml/
 *  4. Registers UberReaderPackage in MainApplication.kt so React Native
 *     can pick up the native module at runtime.
 *
 * Usage in app.json plugins array:
 *   "./plugins/withUberAccessibility"
 */

const {
  withAndroidManifest,
  withDangerousMod,
  withPlugins,
} = require("@expo/config-plugins");

const path = require("path");
const fs   = require("fs");

// ─── Step 1: Manifest modifications ─────────────────────────────────────────

function withAccessibilityManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // --- Permission ---
    if (!manifest["uses-permission"]) manifest["uses-permission"] = [];
    const PERM = "android.permission.BIND_ACCESSIBILITY_SERVICE";
    const hasPermission = manifest["uses-permission"].some(
      (p) => p.$?.["android:name"] === PERM
    );
    if (!hasPermission) {
      manifest["uses-permission"].push({ $: { "android:name": PERM } });
    }

    // --- Service declaration ---
    const app = manifest.application?.[0];
    if (!app) return cfg;

    if (!app.service) app.service = [];

    const SERVICE_CLASS = "com.motoganhos.UberReaderService";
    const alreadyDeclared = app.service.some(
      (s) => s.$?.["android:name"] === SERVICE_CLASS
    );

    if (!alreadyDeclared) {
      app.service.push({
        $: {
          "android:name":       SERVICE_CLASS,
          "android:permission": "android.permission.BIND_ACCESSIBILITY_SERVICE",
          "android:exported":   "true",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name":
                    "android.accessibilityservice.AccessibilityService",
                },
              },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name":     "android.accessibilityservice",
              "android:resource": "@xml/uber_reader_config",
            },
          },
        ],
      });
    }

    return cfg;
  });
}

// ─── Step 2 + 3: Copy source files + patch MainApplication ──────────────────

function withAccessibilityFiles(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const androidMain = path.join(
        projectRoot, "android", "app", "src", "main"
      );
      const javaDir = path.join(androidMain, "java", "com", "motoganhos");
      const xmlDir  = path.join(androidMain, "res", "xml");
      const srcDir  = path.join(projectRoot, "android-src");

      fs.mkdirSync(javaDir, { recursive: true });
      fs.mkdirSync(xmlDir,  { recursive: true });

      // --- Copy Kotlin files ---
      const kotlinFiles = [
        "UberTextParser.kt",
        "UberReaderService.kt",
        "UberReaderModule.kt",
        "UberReaderPackage.kt",
      ];
      for (const file of kotlinFiles) {
        const src = path.join(srcDir, file);
        const dst = path.join(javaDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dst);
          console.log(`[withUberAccessibility] Copied ${file} → android/.../${file}`);
        } else {
          console.warn(`[withUberAccessibility] Source not found: ${src}`);
        }
      }

      // --- Copy XML config ---
      const xmlSrc = path.join(srcDir, "uber_reader_config.xml");
      const xmlDst = path.join(xmlDir,  "uber_reader_config.xml");
      if (fs.existsSync(xmlSrc)) {
        fs.copyFileSync(xmlSrc, xmlDst);
        console.log("[withUberAccessibility] Copied uber_reader_config.xml → res/xml/");
      }

      // --- Patch MainApplication.kt to register UberReaderPackage ---
      const mainAppPath = path.join(javaDir, "MainApplication.kt");
      if (fs.existsSync(mainAppPath)) {
        let content = fs.readFileSync(mainAppPath, "utf8");

        if (!content.includes("UberReaderPackage")) {
          // Insert import at the top of the package block
          content = content.replace(
            /^(package com\.motoganhos\s*\n)/m,
            "$1\nimport com.motoganhos.UberReaderPackage\n"
          );

          // Inject the package into getPackages()
          // Pattern used by Expo-managed MainApplication.kt
          content = content.replace(
            /(val packages = PackageList\(this\)\.packages)/,
            "$1\n      packages.add(UberReaderPackage())"
          );

          fs.writeFileSync(mainAppPath, content, "utf8");
          console.log("[withUberAccessibility] Patched MainApplication.kt");
        } else {
          console.log("[withUberAccessibility] MainApplication.kt already patched");
        }
      } else {
        console.warn(
          "[withUberAccessibility] MainApplication.kt not found — run `expo prebuild` first"
        );
      }

      return cfg;
    },
  ]);
}

// ─── Export ──────────────────────────────────────────────────────────────────

module.exports = function withUberAccessibility(config) {
  return withPlugins(config, [
    withAccessibilityManifest,
    withAccessibilityFiles,
  ]);
};
