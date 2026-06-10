import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RoundOutcome } from "../game/types";
import { colors } from "../theme";

interface Props {
  outcome: RoundOutcome;
  onContinue: () => void;
}

const COPY = {
  covered: {
    emoji: "🫠",
    title: "You're covered!",
    subtitle: "Your view filled with tomato. Round over.",
  },
  coveredThem: {
    emoji: "🎯",
    title: "You covered them!",
    subtitle: "Their screen is a wall of tomato. Round over.",
  },
  opponentLeft: {
    emoji: "👋",
    title: "They left",
    subtitle: "The round ended early — no winner, no penalty.",
  },
} as const;

export function CoveredScreen({ outcome, onContinue }: Props) {
  const copy = COPY[outcome];
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{copy.emoji}</Text>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.subtitle}>{copy.subtitle}</Text>
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
