import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { QUEUE_TIMEOUT_S, BATTLE_RADIUS_M } from "@tomatina/shared";
import { usePlaza } from "../game/usePlaza";
import { colors } from "../theme";

interface Props {
  onMatched: (reservation: unknown) => void;
  onLeave: () => void;
}

/**
 * Presence + matchmaking screen. Leaving it (in any way) revokes presence
 * instantly — the server forgets the position the moment the room closes.
 */
export function PlazaScreen({ onMatched, onLeave }: Props) {
  const plaza = usePlaza(onMatched);
  const [waitedS, setWaitedS] = useState(0);

  useEffect(() => {
    if (plaza.status !== "searching") return;
    setWaitedS(0);
    const id = setInterval(() => setWaitedS((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [plaza.status]);

  return (
    <View style={styles.container}>
      {plaza.status === "permission" && (
        <ActivityIndicator color={colors.tomato} size="large" />
      )}

      {plaza.status === "denied" && (
        <>
          <Text style={styles.emoji}>📍</Text>
          <Text style={styles.title}>Location needed</Text>
          <Text style={styles.subtitle}>
            Tomatina matches you with players within {BATTLE_RADIUS_M} meters.
            Your exact position stays on the server — no player ever sees it.
            Enable location for Expo Go in Settings, then try again.
          </Text>
          <Pressable style={styles.primary} onPress={plaza.requestPermission}>
            <Text style={styles.primaryText}>Try again</Text>
          </Pressable>
        </>
      )}

      {(plaza.status === "connecting" || plaza.status === "searching") && (
        <>
          <ActivityIndicator color={colors.tomato} size="large" />
          <Text style={styles.title}>
            {plaza.status === "connecting"
              ? "Entering the plaza…"
              : "Looking for someone in range…"}
          </Text>
          {plaza.status === "searching" && (
            <Text style={styles.subtitle}>
              {plaza.nearbyCount >= 0
                ? `${plaza.nearbyCount} player${plaza.nearbyCount === 1 ? "" : "s"} active nearby`
                : "Scanning your zone…"}
            </Text>
          )}
          {plaza.status === "searching" && waitedS >= QUEUE_TIMEOUT_S && (
            <Text style={styles.tomatoHour}>
              Nobody in tomato range right now. Bring a friend within{" "}
              {BATTLE_RADIUS_M} m — or come back for a tomato hour 🍅
            </Text>
          )}
        </>
      )}

      {plaza.status === "matched" && (
        <>
          <Text style={styles.emoji}>🍅</Text>
          <Text style={styles.title}>Opponent found!</Text>
        </>
      )}

      {plaza.status === "error" && (
        <>
          <Text style={styles.emoji}>😵</Text>
          <Text style={styles.title}>Can't enter the plaza</Text>
          <Text style={styles.subtitle}>{plaza.errorMessage}</Text>
        </>
      )}

      <Pressable style={styles.leave} onPress={onLeave} hitSlop={12}>
        <Text style={styles.leaveText}>✕ Leave</Text>
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
  title: { color: colors.text, fontSize: 24, fontWeight: "800", textAlign: "center" },
  subtitle: {
    color: colors.textDim,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  tomatoHour: {
    color: colors.textDim,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  primary: {
    marginTop: 14,
    backgroundColor: colors.tomato,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 28,
  },
  primaryText: { color: colors.white, fontSize: 17, fontWeight: "700" },
  leave: { position: "absolute", top: 18, left: 16, paddingVertical: 6, paddingHorizontal: 10 },
  leaveText: { color: colors.textDim, fontSize: 14, fontWeight: "600" },
});
