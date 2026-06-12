import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

interface Props {
  onFindNearby: () => void;
  onBattleOnline: () => void;
  onPractice: () => void;
  /** null = Supabase not configured; auth UI hidden. */
  signedIn: boolean | null;
  onSignIn: () => void;
}

export function HomeScreen({
  onFindNearby,
  onBattleOnline,
  onPractice,
  signedIn,
  onSignIn,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🍅</Text>
      <Text style={styles.title}>Tomatina</Text>
      <Text style={styles.subtitle}>
        Meet someone nearby by covering them in tomato first, swapping names
        after — if you both want to.
      </Text>
      <Pressable style={styles.button} onPress={onFindNearby}>
        <Text style={styles.buttonText}>Find someone nearby</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={onBattleOnline}>
        <Text style={styles.secondaryText}>Battle online (room code)</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={onPractice}>
        <Text style={styles.secondaryText}>Practice vs bot</Text>
      </Pressable>
      {signedIn === false && (
        <Pressable style={styles.avatarCta} onPress={onSignIn}>
          <Text style={styles.avatarCtaText}>🎭 Create my anonymous avatar (18+)</Text>
        </Pressable>
      )}
      {signedIn === true && (
        <Text style={styles.avatarReady}>🎭 Anonymous avatar ready</Text>
      )}
      <Text style={styles.note}>
        Phase 2 in progress — online battles join by room code. No location
        yet.
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
  secondary: { paddingHorizontal: 44, paddingVertical: 12 },
  secondaryText: { color: colors.textDim, fontSize: 16, fontWeight: "600" },
  avatarCta: {
    marginTop: 18,
    borderColor: colors.textDim,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  avatarCtaText: { color: colors.textDim, fontSize: 14, fontWeight: "600" },
  avatarReady: { marginTop: 18, color: colors.stem, fontSize: 14, fontWeight: "700" },
  note: {
    position: "absolute",
    bottom: 36,
    color: colors.textDim,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
