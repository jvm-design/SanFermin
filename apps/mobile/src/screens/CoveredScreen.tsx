import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RoundOutcome } from "../game/types";
import { colors } from "../theme";

interface Props {
  outcome: RoundOutcome;
  onContinue: () => void;
}

export function CoveredScreen({ outcome, onContinue }: Props) {
  const covered = outcome === "covered";
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{covered ? "🫠" : "🎯"}</Text>
      <Text style={styles.title}>
        {covered ? "You're covered!" : "You covered them!"}
      </Text>
      <Text style={styles.subtitle}>
        {covered
          ? "Your view filled with tomato. Round over."
          : "Their screen is a wall of tomato. Round over."}
      </Text>
      <Pressable style={styles.button} onPress={onContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.tomatoDeep,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emoji: { fontSize: 64 },
  title: { color: colors.text, fontSize: 32, fontWeight: "800", textAlign: "center" },
  subtitle: { color: "#f4c9bf", fontSize: 16, textAlign: "center", lineHeight: 22 },
  button: {
    marginTop: 26,
    backgroundColor: colors.text,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 28,
  },
  buttonText: { color: colors.tomatoDeep, fontSize: 18, fontWeight: "700" },
});
