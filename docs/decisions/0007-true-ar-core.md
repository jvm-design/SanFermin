# 0007 — True AR promoted to core (founder decision)

Date: 2026-06-12. Source: founder — "la RA c'est un aspect phare, on y va."
This overrides the original MVP deferral of AR to Phase 3 (CLAUDE.md
updated accordingly).

## Architecture: dual renderer over one view-model

The battle view-model (BattleViewState in packages/shared semantics:
splat meters, projectiles, splats) is renderer-agnostic. Two renderers
consume it:

- **AR renderer** (`apps/mobile/src/ar/ARBattleView.tsx`): ViroReact
  (@reactvision/react-viro). The anonymous opponent floats ~2.5 m ahead in
  world space; tomatoes fly from the camera into the room and from the
  opponent at you, with a small lob arc. Splats you land stick to the 3D
  avatar. Your own covered-vision splats remain a 2D screen overlay (your
  eyes get covered, not the world) — so does the throw gesture, HUD,
  countdown, and match point.
- **2D renderer** (Skia canvas + optional camera backdrop): the automatic
  fallback wherever the Viro native engine is absent — Expo Go included.

`src/ar/viro.ts` feature-detects the native engine at runtime, so ONE
codebase serves both. Multiplayer logic is untouched: the server stays
authoritative, AR is pure presentation.

## What true AR requires (and why Expo Go can't show it)

ViroReact ships native ARKit/ARCore code, which Expo Go does not contain.
Seeing the AR mode requires a development build:

- local: Xcode + `npx expo run:ios --device` (free Apple ID, 7-day certs)
- cloud: EAS Build (Apple Developer Program, 99 €/year — also the
  TestFlight/App Store prerequisite)

See docs/AR.md for the founder walkthrough.

## Accepted risks (stated at decision time)

- Build/iteration loop gets heavier than Expo Go (native builds).
- Device fragmentation and battery cost of AR sessions.
- The Viro scene below is v1 and untested on hardware at commit time; it
  ships behind feature detection so nothing breaks if it misbehaves.
- Polishing depth-of-experience before beachhead validation is the
  classic premature-polish risk; the founder chose it knowingly.
