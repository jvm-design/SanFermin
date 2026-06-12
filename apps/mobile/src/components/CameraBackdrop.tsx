import React, { useEffect, useRef } from "react";
import { Alert, Linking, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

/**
 * Cosmetic camera background (explicitly allowed by the MVP scope:
 * "Camera can be an optional cosmetic background only"). The feed is
 * displayed, never recorded or uploaded. A dark scrim keeps splats and
 * HUD readable on top of the real world.
 */
export function CameraBackdrop({ enabled }: { enabled: boolean }) {
  const [permission, requestPermission] = useCameraPermissions();
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !permission || permission.granted) return;
    if (permission.canAskAgain) {
      requestPermission();
    } else if (!warnedRef.current) {
      warnedRef.current = true;
      Alert.alert(
        "Camera is blocked",
        "To battle over the real world, allow camera access for Expo Go in your phone Settings.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ],
      );
    }
  }, [enabled, permission, requestPermission]);

  if (!enabled || !permission?.granted) return null;
  return (
    <>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />
      <View style={styles.scrim} pointerEvents="none" />
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(26, 13, 10, 0.35)",
  },
});
