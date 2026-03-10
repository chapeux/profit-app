/**
 * Expo Config Plugin — withUberAccessibility
 *
 * Applied automatically during `expo prebuild` (or `eas build`).
 * It performs five things:
 *
 *  1. Injects the BIND_ACCESSIBILITY_SERVICE permission into AndroidManifest.xml
 *  2. Declares UberReaderService in AndroidManifest.xml
 *  3. Copies Kotlin source files from android-src/ into the generated android/ directory
 *  4. Copies uber_reader_config.xml into android/app/src/main/res/xml/
 *  5. Registers UberReaderPackage in MainApplication.kt
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
      const xmlDst = path.join(xmlDir, "uber_reader_config.xml");
      if (fs.existsSync(xmlSrc)) {
        fs.copyFileSync(xmlSrc, xmlDst);
        console.log("[withUberAccessibility] Copied uber_reader_config.xml → res/xml/");
      }

      // --- Patch MainApplication.kt ---
      // FIX: MainApplication.kt lives at the root of the java package dir,
      // NOT inside com/motoganhos/ — search both locations to be safe.
      const possiblePaths = [
        path.join(androidMain, "java", "com", "motoganhos", "MainApplication.kt"),
        path.join(androidMain, "java", "host", "exp", "exponent", "MainApplication.kt"),
      ];

      // Also do a glob-style search as fallback
      let mainAppPath = possiblePaths.find(fs.existsSync);

      if (!mainAppPath) {
        // Search recursively up to 4 levels deep
        const javaRoot = path.join(androidMain, "java");
        mainAppPath = findFile(javaRoot, "MainApplication.kt", 4);
      }

      if (mainAppPath && fs.existsSync(mainAppPath)) {
        let content = fs.readFileSync(mainAppPath, "utf8");

        if (!content.includes("UberReaderPackage")) {
          // Add import after the package declaration
          content = content.replace(
            /^(package\s+[\w.]+\s*\n)/m,
            "$1\nimport com.motoganhos.UberReaderPackage\n"
          );

          // Inject into getPackages() — handles Expo SDK 49, 50, 51, 52, 53, 54+
          if (content.includes("PackageList(this).packages.apply")) {
            // SDK 54+ pattern: PackageList(this).packages.apply { ... }
            content = content.replace(
              /(PackageList\(this\)\.packages\.apply\s*\{)/,
              "$1\n              add(UberReaderPackage())"
            );
          } else if (content.includes("val packages = PackageList(this).packages")) {
            content = content.replace(
              /(val packages = PackageList\(this\)\.packages)/,
              "$1\n      packages.add(UberReaderPackage())"
            );
          } else if (content.includes("val packages = PackageList(application).packages")) {
            content = content.replace(
              /(val packages = PackageList\(application\)\.packages)/,
              "$1\n      packages.add(UberReaderPackage())"
            );
          } else {
            // Generic fallback: inject inside getPackages body
            content = content.replace(
              /(override fun getPackages\(\)[^\{]*\{)/,
              "$1\n          add(UberReaderPackage())"
            );
          }

          fs.writeFileSync(mainAppPath, content, "utf8");
          console.log(`[withUberAccessibility] Patched MainApplication.kt at ${mainAppPath}`);
        } else {
          console.log("[withUberAccessibility] MainApplication.kt already patched");
        }
      } else {
        console.warn(
          "[withUberAccessibility] MainApplication.kt not found — will retry after prebuild completes"
        );
      }

      return cfg;
    },
  ]);
}

// ─── Helper: recursive file search ──────────────────────────────────────────

function findFile(dir, filename, maxDepth) {
  if (maxDepth <= 0 || !fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === filename) return fullPath;
    if (entry.isDirectory()) {
      const found = findFile(fullPath, filename, maxDepth - 1);
      if (found) return found;
    }
  }
  return null;
}

// ─── Export ──────────────────────────────────────────────────────────────────

module.exports = function withUberAccessibility(config) {
  return withPlugins(config, [
    withAccessibilityManifest,
    withAccessibilityFiles,
  ]);
};