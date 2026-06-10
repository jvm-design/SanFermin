import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🍅</Text>
      <Text style={styles.title}>Tomatina</Text>
      <Text style={styles.subtitle}>
        Meet someone nearby by covering them in tomato first, swapping names
        after — if you both want to.
      </Text>
      <Pressable style={styles.button} onPress={onStart}>
        <Text style={styles.buttonText}>Throw down</Text>
      </Pressable>
      <Text style={styles.note}>
        Phase 0 demo — you battle a scripted opponent. No location, no network.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 14,
  },
  emoji: { fontSize: 72 },
  title: {
    color: colors.text,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: 1,
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 23,
  },
  button: {
    marginTop: 22,
    backgroundColor: colors.tomato,
    paddingHorizontal: 44,
    paddingVertical: 16,
    borderRadius: 32,
  },
  buttonText: { color: colors.white, fontSize: 20, fontWeight: "700" },
  note: {
    position: "absolute",
    bottom: 36,
    color: colors.textDim,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
