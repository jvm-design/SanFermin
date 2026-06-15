# 0008 — True-AR (ViroReact) Android build blocker: diagnosis & options

Date: 2026-06-15. Status: diagnosed, fix not yet attempted (founder chose
"diagnose before acting" given each EAS build costs ~20 min).

## Symptom

EAS Android dev build fails at `:app:compileDebugJavaWithJavac`:

```
Could not resolve project :viro_renderer / :react_viro / :arcore_client / :gvr_common
  > No matching variant ... AgpVersionAttr '8.11.0' ... but: No variants exist.
```

## Root cause (certain — read from node_modules)

Viro's 4 Android modules are **prebuilt `.aar` files wrapped in legacy
Gradle projects**. Each build.gradle is literally:

```gradle
configurations.maybeCreate("default")
artifacts.add("default", file('viro_renderer-release.aar'))
```

This pre-AGP, attribute-less "default configuration" was how local AARs
were exposed years ago. Expo SDK 54 ships **Gradle 8.14 / AGP 8.11**,
whose strict **variant-aware** resolution requires consumable variants
carrying attributes (AgpVersionAttr, BuildTypeAttr, …). These wrappers
expose none, so Gradle reports "No variants exist."

Not a config error, not the pnpm monorepo, not the New Architecture
(that wall was already cleared). ViroReact 2.56.0 is the latest published
version and its peer deps *claim* RN 0.81 / Expo 54 support, but its
Android AAR wrappers were never modernized for Gradle 8 — an upstream gap
we can't wait out (no newer release exists).

## Why we can't just downgrade the stack

We're on SDK 54 / RN 0.81 because react-native-skia 2.x and
react-native-reanimated 4.x (the 2D battle renderer + animation engine)
require new RN / New Architecture. Dropping to an older SDK where Viro's
legacy wrappers resolve would break Skia/reanimated. The two halves pull
in opposite directions.

## Options

1. **flatDir config plugin (recommended fix).** A custom Expo config
   plugin that runs after withViro and rewrites the Android build to
   consume the 4 `.aar`s via a `flatDir` repository + `implementation(name:
   '…-release', ext: 'aar')`, instead of `project(':…')`. flatDir AAR
   resolution bypasses the strict variant matching. Good odds; writable
   now; but UNTESTABLE from our environment → needs 1+ EAS build to
   confirm (possible transitive-dependency follow-ups).

2. **patch-package the 4 wrapper build.gradle files** to declare proper
   consumable variants with attributes. Also plausible, generally more
   fragile than flatDir for AAR-only projects.

3. **AR-lite now, true-AR as a parallel track.** Ship the camera-backdrop
   battle (works today, in Expo Go) for the beachhead; pursue true
   volumetric AR via option 1/2 or a purpose-built native ARCore/ARKit
   module without blocking concept validation.

## Recommendation

Implement option 1 (flatDir plugin) as the concrete attempt — it targets
the exact confirmed cause. Keep AR-lite as the guaranteed fallback so the
beachhead is never blocked on the native build landing. Treat each EAS
build as a deliberate, costed experiment, not blind iteration.
