import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { RoundOutcome } from "../game/types";
import { useBattle } from "../game/useBattle";
import { ThrowRelease, useThrowGesture } from "../game/useThrowGesture";
import { BattleCanvas } from "../components/BattleCanvas";
import { SplatMeter } from "../components/SplatMeter";
import { colors } from "../theme";

interface Props {
  onRoundEnd: (outcome: RoundOutcome) => void;
  /** Battles are always escapable (invariant 3). */
  onLeave: () => void;
}

/** Practice round against the scripted Phase 0 bot. Fully offline. */
export function BattleScreen({ onRoundEnd, onLeave }: Props) {
  const { width, height } = useWindowDimensions();
  const battle = useBattle(width, height, onRoundEnd);

  const restPos = useMemo(() => ({ x: width / 2, y: height - 90 }), [width, height]);
  const { throwTomato } = battle;
  const handleThrow = useCallback(
    (r: ThrowRelease) => {
      throwTomato({ from: r.from, lateralBias: r.bias });
    },
    [throwTomato],
  );
  const { panHandlers, dragRef } = useThrowGesture(restPos, handleThrow);

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

      <Pressable style={styles.leave} onPress={onLeave} hitSlop={12}>
        <Text style={styles.leaveText}>✕ Leave</Text>
      </Pressable>

      <Text style={styles.hint} pointerEvents="none">
        {dragRef.current.active
          ? "Release upward to throw! 🍅💨"
          : "Grab the tomato and flick it — or tap"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hud: {
    position: "absolute",
    top: 58,
    left: 0,
    right: 0,
  },
  leave: {
    position: "absolute",
    top: 18,
    left: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  leaveText: { color: colors.textDim, fontSize: 14, fontWeight: "600" },
  hint: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    color: colors.textDim,
    fontSize: 13,
  },
});
