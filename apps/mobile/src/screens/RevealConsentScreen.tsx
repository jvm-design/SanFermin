import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

interface Props {
  /**
   * The winner holds the initiative: they choose whether to propose the
   * reveal+chat. The loser still consents — reveal stays strictly mutual
   * (invariant 3). Winning earns the right to ask, never the right to get.
   */
  role: "winner" | "loser";
  onReveal: () => void;
  /** Play another round with the same opponent, staying anonymous. */
  onRematch: () => void;
  /** Decline kindly: a canned "that was fun, let's just play" message. */
  onPass: () => void;
}

/** Mock beat: how long the loser "waits" for the winner's decision. */
const DECIDING_MS = 1800;

export function RevealConsentScreen({ role, onReveal, onRematch, onPass }: Props) {
  const [deciding, setDeciding] = useState(role === "loser");

  useEffect(() => {
    if (!deciding) return;
    const t = setTimeout(() => setDeciding(false), DECIDING_MS);
    return () => clearTimeout(t);
  }, [deciding]);

  if (deciding) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.tomato} size="large" />
        <Text style={styles.title}>They won — they're deciding…</Text>
        <Text style={styles.subtitle}>The winner chooses whether to propose a chat.</Text>
      </View>
    );
  }

  const winner = role === "winner";
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{winner ? "👑" : "🎭"}</Text>
      <Text style={styles.title}>{winner ? "You won — your call" : "They want to meet you!"}</Text>
      <Text style={styles.subtitle}>
        {winner
          ? "Propose to reveal yourselves and chat, go again, or pass kindly. They'll have to agree too — reveal is always mutual."
          : "The winner proposes to reveal yourselves and chat. Your call now — reveal is always mutual."}
      </Text>
      <Pressable style={styles.primary} onPress={onReveal}>
        <Text style={styles.primaryText}>
          {winner ? "Propose reveal & chat" : "Yes, reveal me"}
        </Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={onRematch}>
        <Text style={styles.secondaryText}>Rematch 🍅</Text>
      </Pressable>
      <Pressable style={styles.tertiary} onPress={onPass}>
        <Text style={styles.tertiaryText}>It was fun — I'd rather just play</Text>
      </Pressable>
      <Text style={styles.note}>Phase 0 mock — the other player is scripted.</Text>
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
  title: { color: colors.text, fontSize: 28, fontWeight: "800", textAlign: "center" },
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
  secondary: {
    borderColor: colors.tomato,
    borderWidth: 2,
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 28,
  },
  secondaryText: { color: colors.tomato, fontSize: 16, fontWeight: "700" },
  tertiary: { paddingHorizontal: 36, paddingVertical: 10 },
  tertiaryText: { color: colors.textDim, fontSize: 15, fontWeight: "600" },
  note: {
    position: "absolute",
    bottom: 36,
    color: colors.textDim,
    fontSize: 12,
  },
});
