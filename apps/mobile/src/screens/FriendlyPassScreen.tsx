import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

/**
 * Confirmation after declining the reveal kindly. The decline is a canned,
 * anonymous, one-shot message — never free text (Phase 2 will enforce this
 * server-side). Softening the "no" is core to the social loop.
 */
export function FriendlyPassScreen({ onDone }: { onDone: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💌</Text>
      <Text style={styles.title}>Message sent</Text>
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>
          "GG! That was really fun — no chat for me this time, I'd rather just
          play. Throw another tomato at me sometime 🍅"
        </Text>
      </View>
      <Text style={styles.subtitle}>
        You both stay anonymous. No hard feelings, only tomatoes.
      </Text>
      <Pressable style={styles.button} onPress={onDone}>
        <Text style={styles.buttonText}>Back to the plaza</Text>
      </Pressable>
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
  emoji: { fontSize: 56 },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  bubble: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 18,
    marginTop: 6,
  },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 22, fontStyle: "italic" },
  subtitle: { color: colors.textDim, fontSize: 14, textAlign: "center" },
  button: {
    marginTop: 20,
    backgroundColor: colors.tomato,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 28,
  },
  buttonText: { color: colors.white, fontSize: 17, fontWeight: "700" },
});
