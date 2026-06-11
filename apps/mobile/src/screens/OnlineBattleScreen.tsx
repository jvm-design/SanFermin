import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { RoundOutcome } from "../game/types";
import { useOnlineBattle } from "../game/useOnlineBattle";
import { ThrowRelease, useThrowGesture } from "../game/useThrowGesture";
import { BattleCanvas } from "../components/BattleCanvas";
import { SplatMeter } from "../components/SplatMeter";
import { colors } from "../theme";

interface Props {
  code: string;
  onRoundEnd: (outcome: RoundOutcome) => void;
  /** Battles are always escapable (invariant 3). */
  onLeave: () => void;
}

export function OnlineBattleScreen({ code, onRoundEnd, onLeave }: Props) {
  const { width, height } = useWindowDimensions();
  const battle = useOnlineBattle(code, width, height, onRoundEnd);

  const restPos = useMemo(() => ({ x: width / 2, y: height - 90 }), [width, height]);
  const { throwTomato } = battle;
  const handleThrow = useCallback(
    (r: ThrowRelease) => {
      const bias = r.tap ? 0 : Math.max(-1, Math.min(1, r.vx / 1.5));
      // the flick direction decides where the splat lands on THEIR screen
      const aimX = 0.5 + bias * 0.35;
      const aimY = 0.25 + Math.random() * 0.4;
      throwTomato(aimX, aimY, { from: r.from, lateralBias: bias });
    },
    [throwTomato],
  );
  const { panHandlers, dragRef } = useThrowGesture(restPos, handleThrow);

  const leaveBattle = () => {
    battle.leave();
    onLeave();
  };

  if (battle.status === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Can't battle</Text>
        <Text style={styles.subtitle}>{battle.errorMessage}</Text>
        <Pressable style={styles.button} onPress={onLeave}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill} {...panHandlers}>
        <BattleCanvas
          view={battle.view}
          layout={battle.layout}
          nowMs={battle.nowMs}
          held={dragRef.current}
        />
      </View>

      <View style={styles.hud} pointerEvents="box-none">
        <SplatMeter label="You" value={battle.view.playerSplat} />
        <SplatMeter label="Them" value={battle.view.opponentSplat} />
      </View>

      <Pressable style={styles.leave} onPress={leaveBattle} hitSlop={12}>
        <Text style={styles.leaveText}>✕ Leave</Text>
      </Pressable>

      {(battle.status === "connecting" || battle.status === "waiting") && (
        <View style={styles.waitOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.tomato} size="large" />
          <Text style={styles.waitTitle}>
            {battle.status === "connecting" ? "Connecting…" : "Waiting for an opponent…"}
          </Text>
          <Text style={styles.waitCode}>room code: {code}</Text>
        </View>
      )}

      {battle.status === "active" && (
        <Text style={styles.hint} pointerEvents="none">
          Flick the tomato at them — or tap
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  subtitle: { color: colors.textDim, fontSize: 15, textAlign: "center", lineHeight: 22 },
  button: {
    marginTop: 18,
    backgroundColor: colors.tomato,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 28,
  },
  buttonText: { color: colors.white, fontSize: 17, fontWeight: "700" },
  hud: { position: "absolute", top: 58, left: 0, right: 0 },
  leave: { position: "absolute", top: 18, left: 16, paddingVertical: 6, paddingHorizontal: 10 },
  leaveText: { color: colors.textDim, fontSize: 14, fontWeight: "600" },
  waitOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(26, 13, 10, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  waitTitle: { color: colors.text, fontSize: 19, fontWeight: "700" },
  waitCode: { color: colors.textDim, fontSize: 14, letterSpacing: 1 },
  hint: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    color: colors.textDim,
    fontSize: 13,
  },
});
