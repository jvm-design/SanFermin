import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { RevealedInfo } from "@tomatina/protocol";
import { useReveal } from "../game/useReveal";
import { colors } from "../theme";

interface Props {
  /**
   * The winner holds the initiative: they choose whether to propose the
   * reveal+chat. The loser still consents — reveal stays strictly mutual
   * (invariant 3). Winning earns the right to ask, never the right to get.
   */
  role: "winner" | "loser";
  onRevealed: (info: RevealedInfo) => void;
  /** Play another round, staying anonymous. */
  onRematch: () => void;
  onPassSent: () => void;
  onPassReceived: () => void;
  /** Session gone (opponent left / expired). */
  onClosed: () => void;
}

type Stage = "choosing" | "waitingAnswer" | "waitingProposal" | "responding";

/** Mock beat for practice rounds (no live opponent). */
const MOCK_DECIDING_MS = 1800;
const MOCK_REVEAL: RevealedInfo = { opponentName: "Tomato Tester", chat: null };

export function RevealConsentScreen({
  role,
  onRevealed,
  onRematch,
  onPassSent,
  onPassReceived,
  onClosed,
}: Props) {
  const [stage, setStage] = useState<Stage>(
    role === "winner" ? "choosing" : "waitingProposal",
  );

  const reveal = useReveal({
    onRevealed,
    onProposed: () => setStage("responding"),
    onPassedByOpponent: onPassReceived,
    onClosed,
  });

  // Practice rounds: scripted opponent — the winner "decides" after a beat.
  useEffect(() => {
    if (reveal.live || role !== "loser") return;
    const t = setTimeout(() => setStage("responding"), MOCK_DECIDING_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const propose = () => {
    if (reveal.live) {
      reveal.propose();
      setStage("waitingAnswer");
    } else {
      onRevealed(MOCK_REVEAL);
    }
  };

  const accept = () => {
    if (reveal.live) {
      reveal.accept();
      setStage("waitingAnswer");
    } else {
      onRevealed(MOCK_REVEAL);
    }
  };

  const pass = () => {
    if (reveal.live) reveal.pass();
    onPassSent();
  };

  const rematch = () => {
    reveal.release();
    onRematch();
  };

  if (stage === "waitingProposal" || stage === "waitingAnswer") {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.tomato} size="large" />
        <Text style={styles.title}>
          {stage === "waitingProposal" ? "They won — they're deciding…" : "Waiting for them…"}
        </Text>
        <Text style={styles.subtitle}>
          {stage === "waitingProposal"
            ? "The winner chooses whether to propose a chat."
            : "Reveal happens only if you both say yes."}
        </Text>
        <Pressable style={styles.tertiary} onPress={pass}>
          <Text style={styles.tertiaryText}>It was fun — I'd rather just play</Text>
        </Pressable>
      </View>
    );
  }

  const winner = stage === "choosing";
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{winner ? "👑" : "🎭"}</Text>
      <Text style={styles.title}>
        {winner ? "You won — your call" : "They want to meet you!"}
      </Text>
      <Text style={styles.subtitle}>
        {winner
          ? "Propose to reveal yourselves and chat, go again, or pass kindly. They'll have to agree too — reveal is always mutual."
          : "The winner proposes to reveal yourselves and chat. Your call now — reveal is always mutual."}
      </Text>
      <Pressable style={styles.primary} onPress={winner ? propose : accept}>
        <Text style={styles.primaryText}>
          {winner ? "Propose reveal & chat" : "Yes, reveal me"}
        </Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={rematch}>
        <Text style={styles.secondaryText}>Rematch 🍅</Text>
      </Pressable>
      <Pressable style={styles.tertiary} onPress={pass}>
        <Text style={styles.tertiaryText}>It was fun — I'd rather just play</Text>
      </Pressable>
      {!reveal.live && (
        <Text style={styles.note}>Practice mode — the other player is scripted.</Text>
      )}
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
  tertiary: { paddingHorizontal: 36, paddingVertical: 10, marginTop: 6 },
  tertiaryText: { color: colors.textDim, fontSize: 15, fontWeight: "600" },
  note: {
    position: "absolute",
    bottom: 36,
    color: colors.textDim,
    fontSize: 12,
  },
});
