import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

interface Props {
  /** Mutual consent gate (mock): both sides must opt in to reveal. */
  onReveal: () => void;
  onDecline: () => void;
}

export function RevealConsentScreen({ onReveal, onDecline }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎭</Text>
      <Text style={styles.title}>Reveal yourselves?</Text>
      <Text style={styles.subtitle}>
        If you both say yes, you'll see each other's name and unlock a chat.
        If either of you says no, you both stay anonymous — no hard feelings.
      </Text>
      <Pressable style={styles.primary} onPress={onReveal}>
        <Text style={styles.primaryText}>Yes, reveal me</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={onDecline}>
        <Text style={styles.secondaryText}>Stay anonymous</Text>
      </Pressable>
      <Text style={styles.note}>Phase 0 mock — the other side always says yes.</Text>
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
    gap: 12,
  },
  emoji: { fontSize: 64 },
  title: { color: colors.text, fontSize: 30, fontWeight: "800" },
  subtitle: {
    color: colors.textDim,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 23,
  },
  primary: {
    marginTop: 24,
    backgroundColor: colors.tomato,
    paddingHorizontal: 42,
    paddingVertical: 15,
    borderRadius: 30,
  },
  primaryText: { color: colors.white, fontSize: 18, fontWeight: "700" },
  secondary: { paddingHorizontal: 42, paddingVertical: 12 },
  secondaryText: { color: colors.textDim, fontSize: 16, fontWeight: "600" },
  note: {
    position: "absolute",
    bottom: 36,
    color: colors.textDim,
    fontSize: 12,
  },
});
