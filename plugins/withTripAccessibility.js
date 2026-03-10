const { withAndroidManifest, withDangerousMod, withPlugins } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

function withAccessibilityManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (!manifest["uses-permission"]) manifest["uses-permission"] = [];
    const PERM = "android.permission.BIND_ACCESSIBILITY_SERVICE";
    if (!manifest["uses-permission"].some((p) => p.$?.["android:name"] === PERM)) {
      manifest["uses-permission"].push({ $: { "android:name": PERM } });
    }
    const app = manifest.application?.[0];
    if (!app) return cfg;
    if (!app.service) app.service = [];
    const SERVICE_CLASS = "com.motoganhos.TripReaderService";
    if (!app.service.some((s) => s.$?.["android:name"] === SERVICE_CLASS)) {
      app.service.push({
        $: { "android:name": SERVICE_CLASS, "android:permission": "android.permission.BIND_ACCESSIBILITY_SERVICE", "android:exported": "true" },
        "intent-filter": [{ action: [{ $: { "android:name": "android.accessibilityservice.AccessibilityService" } }] }],
        "meta-data": [{ $: { "android:name": "android.accessibilityservice", "android:resource": "@xml/trip_reader_config" } }],
      });
    }
    return cfg;
  });
}

function withAccessibilityFiles(config) {
  return withDangerousMod(config, ["android", (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    const androidMain = path.join(projectRoot, "android", "app", "src", "main");
    const javaDir = path.join(androidMain, "java", "com", "motoganhos");
    const xmlDir = path.join(androidMain, "res", "xml");
    const srcDir = path.join(projectRoot, "android-src");
    fs.mkdirSync(javaDir, { recursive: true });
    fs.mkdirSync(xmlDir, { recursive: true });
    for (const file of ["TripTextParser.kt", "TripReaderService.kt", "TripReaderModule.kt", "TripReaderPackage.kt"]) {
      const src = path.join(srcDir, file);
      const dst = path.join(javaDir, file);
      if (fs.existsSync(src)) { fs.copyFileSync(src, dst); console.log(`[withTripAccessibility] Copied ${file}`); }
      else { console.warn(`[withTripAccessibility] Not found: ${src}`); }
    }
    const xmlSrc = path.join(srcDir, "trip_reader_config.xml");
    if (fs.existsSync(xmlSrc)) { fs.copyFileSync(xmlSrc, path.join(xmlDir, "trip_reader_config.xml")); }
    let mainAppPath = path.join(javaDir, "MainApplication.kt");
    if (!fs.existsSync(mainAppPath)) mainAppPath = findFile(path.join(androidMain, "java"), "MainApplication.kt", 5);
    if (mainAppPath && fs.existsSync(mainAppPath)) {
      let content = fs.readFileSync(mainAppPath, "utf8");
      if (!content.includes("TripReaderPackage")) {
        content = content.replace(/^(package\s+[\w.]+\s*\n)/m, "$1\nimport com.motoganhos.TripReaderPackage\n");
        if (content.includes("PackageList(this).packages.apply")) {
          content = content.replace(/(PackageList\(this\)\.packages\.apply\s*\{)/, "$1\n              add(TripReaderPackage())");
        } else if (content.includes("val packages = PackageList(this).packages")) {
          content = content.replace(/(val packages = PackageList\(this\)\.packages)/, "$1\n      packages.add(TripReaderPackage())");
        } else {
          content = content.replace(/(override fun getPackages\(\)[^\{]*\{)/, "$1\n          add(TripReaderPackage())");
        }
        fs.writeFileSync(mainAppPath, content, "utf8");
        console.log(`[withTripAccessibility] Patched MainApplication.kt`);
      }
    }
    return cfg;
  }]);
}

function findFile(dir, filename, maxDepth) {
  if (maxDepth <= 0 || !fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === filename) return full;
    if (entry.isDirectory()) { const found = findFile(full, filename, maxDepth - 1); if (found) return found; }
  }
  return null;
}

module.exports = function withTripAccessibility(config) {
  return withPlugins(config, [withAccessibilityManifest, withAccessibilityFiles]);
};
