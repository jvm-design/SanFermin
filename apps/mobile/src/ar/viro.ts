/**
 * Safe loader for the ViroReact AR engine. The native module only exists
 * in development/production builds (EAS or Xcode) — in Expo Go this
 * require throws and the app falls back to the camera-backdrop battle.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let viro: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  viro = require("@reactvision/react-viro");
  if (!viro?.ViroARSceneNavigator) viro = null;
} catch {
  viro = null;
}

export const Viro = viro;
export const arAvailable = viro !== null;
