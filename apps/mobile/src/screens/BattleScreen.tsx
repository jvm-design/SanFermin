import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { COVER_THRESHOLD, SPLAT_PER_HIT } from "@tomatina/shared";
import { RoundOutcome } from "../game/types";
import { useBattle } from "../game/useBattle";
import { ThrowRelease, useThrowGesture } from "../game/useThrowGesture";
import { BattleCanvas } from "../components/BattleCanvas";
import { CameraBackdrop } from "../components/CameraBackdrop";
import { SplatMeter } from "../components/SplatMeter";
import { BUILD_TAG } from "../buildTag";
import { colors } from "../theme";

const MATCH_POINT = COVER_THRESHOLD - SPLAT_PER_HIT;

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
  const [cameraOn, setCameraOn] = useState(false);
  const matchPoint =
    battle.phase === "active" &&
    (battle.view.playerSplat >= MATCH_POINT ||
      battle.view.opponentSplat >= MATCH_POINT);

  return (
    <View style={styles.container}>
      <CameraBackdrop enabled={cameraOn} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BattleCanvas
          view={battle.view}
          layout={battle.layout}
          nowMs={battle.nowMs}
          held={dragRef.current}
        />
      </View>

      {/* topmost touch layer: nothing can steal the throw gesture */}
      <View style={StyleSheet.absoluteFill} collapsable={false} {...panHandlers} />

      <View style={styles.hud} pointerEvents="box-none">
        <SplatMeter label="You" value={battle.view.playerSplat} />
        <SplatMeter label="Them" value={battle.view.opponentSplat} />
      </View>

      <Pressable style={styles.leave} onPress={onLeave} hitSlop={12}>
        <Text style={styles.leaveText}>✕ Leave</Text>
      </Pressable>

      <Pressable
        style={styles.cameraToggle}
        onPress={() => setCameraOn((v) => !v)}
        hitSlop={12}
      >
        <Text style={styles.cameraToggleText}>{cameraOn ? "🎥" : "📷"}</Text>
      </Pressable>

      {matchPoint && (
        <Text style={styles.matchPoint} pointerEvents="none">
          MATCH POINT 🍅
        </Text>
      )}

      {battle.phase === "countdown" && (
        <View style={styles.countdown} pointerEvents="none">
          <Text style={styles.countdownText}>
            {Math.max(1, Math.ceil((battle.countdownEndsAt - battle.nowMs) / 1000))}
          </Text>
        </View>
      )}
      {battle.phase === "active" && battle.nowMs - battle.countdownEndsAt < 700 && (
        <View style={styles.countdown} pointerEvents="none">
          <Text style={styles.countdownText}>GO! 🍅</Text>
        </View>
      )}

      <Text style={styles.hint} pointerEvents="none">
        {dragRef.current.active
          ? "Release upward to throw! 🍅💨"
          : `Grab the tomato and flick it — or tap (${BUILD_TAG})`}
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
  cameraToggle: {
    position: "absolute",
    top: 18,
    right: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  cameraToggleText: { fontSize: 18 },
  matchPoint: {
    position: "absolute",
    top: 110,
    alignSelf: "center",
    color: colors.tomato,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    textShadowColor: "#000",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 1 },
  },
  countdown: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  countdownText: {
    color: colors.text,
    fontSize: 84,
    fontWeight: "900",
    textShadowColor: colors.tomatoDeep,
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 2 },
  },
  hint: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    color: colors.textDim,
    fontSize: 13,
  },
});
