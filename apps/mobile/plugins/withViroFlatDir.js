/**
 * Tomatina — ViroReact Android build fix (see docs/decisions/0008).
 *
 * ViroReact 2.56 ships its 4 Android modules (viro_renderer, react_viro,
 * arcore_client, gvr_common) as prebuilt .aar files wrapped in legacy
 * Gradle projects (`configurations.create("default")`, no variant
 * attributes). Gradle 8.14 / AGP 8.11 (Expo SDK 54) use strict
 * variant-aware resolution and reject them with "No variants exist".
 *
 * This config plugin runs AFTER @reactvision/react-viro and rewrites the
 * Android build so the AARs are consumed through a `flatDir` repository
 * (name+ext based), which bypasses variant matching entirely — the
 * standard workaround for local AARs on modern Gradle.
 *
 * Must be listed in app.json plugins AFTER "@reactvision/react-viro".
 */
const { withProjectBuildGradle, withAppBuildGradle } = require("@expo/config-plugins");

const VIRO_ANDROID = "../node_modules/@reactvision/react-viro/android";

const FLATDIR_BLOCK = `
        // viro-flatdir
        flatDir {
            dirs(
                "$rootDir/${VIRO_ANDROID}/viro_renderer",
                "$rootDir/${VIRO_ANDROID}/react_viro",
                "$rootDir/${VIRO_ANDROID}/arcore_client",
                "$rootDir/${VIRO_ANDROID}/gvr_common"
            )
        }`;

const AAR_DEPS = `
    // viro-flatdir-deps
    implementation(name: 'viro_renderer-release', ext: 'aar')
    implementation(name: 'react_viro-release', ext: 'aar')
    implementation(name: 'core-1.43.0', ext: 'aar')
    implementation(name: 'sdk-common-1.180.0', ext: 'aar')`;

function withFlatDirRepo(config) {
  return withProjectBuildGradle(config, (c) => {
    if (c.modResults.language !== "groovy") return c;
    if (c.modResults.contents.includes("// viro-flatdir")) return c;
    // Inject flatDir into allprojects { repositories { ... } }.
    c.modResults.contents = c.modResults.contents.replace(
      /allprojects\s*\{\s*repositories\s*\{/,
      (m) => `${m}\n${FLATDIR_BLOCK}`,
    );
    return c;
  });
}

function withAarDeps(config) {
  return withAppBuildGradle(config, (c) => {
    if (c.modResults.language !== "groovy") return c;
    let contents = c.modResults.contents;
    // Drop Viro's project(...) references — those are the unresolvable
    // variant-less projects.
    contents = contents
      .replace(/^\s*implementation project\(':gvr_common'\)\s*$/m, "")
      .replace(/^\s*implementation project\(':arcore_client'\)\s*$/m, "")
      .replace(/^\s*implementation project\(path: ':react_viro'\)\s*$/m, "")
      .replace(/^\s*implementation project\(path: ':viro_renderer'\)\s*$/m, "");
    // Add the flatDir name-based AAR deps once, inside dependencies { }.
    if (!contents.includes("// viro-flatdir-deps")) {
      contents = contents.replace(/dependencies\s*\{/, (m) => `${m}\n${AAR_DEPS}`);
    }
    c.modResults.contents = contents;
    return c;
  });
}

module.exports = function withViroFlatDir(config) {
  return withAarDeps(withFlatDirRepo(config));
};
