import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { COVER_THRESHOLD, SPLAT_PER_HIT } from "@tomatina/shared";
import { RoundOutcome } from "../game/types";
import { BattleTarget, useOnlineBattle } from "../game/useOnlineBattle";
import { ThrowRelease, useThrowGesture } from "../game/useThrowGesture";
import { BattleCanvas } from "../components/BattleCanvas";
import { CameraBackdrop } from "../components/CameraBackdrop";
import { SplatMeter } from "../components/SplatMeter";
import { ARBattleView } from "../ar/ARBattleView";
import { arAvailable } from "../ar/viro";
import { BUILD_TAG } from "../buildTag";
import { colors } from "../theme";

const MATCH_POINT = COVER_THRESHOLD - SPLAT_PER_HIT;

interface Props {
  target: BattleTarget;
  /** Blocking requires an account; the safety button hides otherwise. */
  signedIn: boolean;
  onRoundEnd: (outcome: RoundOutcome) => void;
  /** Battles are always escapable (invariant 3). */
  onLeave: () => void;
}

export function OnlineBattleScreen({ target, signedIn, onRoundEnd, onLeave }: Props) {
  const { width, height } = useWindowDimensions();
  const battle = useOnlineBattle(target, width, height, onRoundEnd);

  const restPos = useMemo(() => ({ x: width / 2, y: height - 90 }), [width, height]);
  const { throwTomato } = battle;
  const handleThrow = useCallback(
    (r: ThrowRelease) => {
      // the flick direction decides where the splat lands on THEIR screen
      const aimX = 0.5 + r.bias * 0.35;
      const aimY = 0.25 + Math.random() * 0.4;
      throwTomato(aimX, aimY, { from: r.from, lateralBias: r.bias });
    },
    [throwTomato],
  );
  const { panHandlers, dragRef } = useThrowGesture(restPos, handleThrow);
  // The camera IS the experience: battles open over the real world.
  const [cameraOn, setCameraOn] = useState(true);
  const matchPoint =
    battle.status === "active" &&
    (battle.view.playerSplat >= MATCH_POINT ||
      battle.view.opponentSplat >= MATCH_POINT);

  const leaveBattle = () => {
    battle.leave();
    onLeave();
  };

  const confirmBlock = () => {
    Alert.alert(
      "Block this player?",
      "They will never be matched with you again. The round ends for you now.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => {
            battle.blockOpponent(false);
            leaveBattle();
          },
        },
        {
          text: "Block + report",
          style: "destructive",
          onPress: () => {
            battle.blockOpponent(true);
            leaveBattle();
          },
        },
      ],
    );
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

  const trueAR = cameraOn && arAvailable;

  return (
    <View style={styles.container}>
      {/* true AR in dev/prod builds; camera backdrop in Expo Go */}
      {trueAR ? (
        <ARBattleView
          getView={() => ({ view: battle.view, nowMs: battle.nowMs })}
          layoutWidth={battle.layout.width}
        />
      ) : (
        <CameraBackdrop enabled={cameraOn} />
      )}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BattleCanvas
          view={battle.view}
          layout={battle.layout}
          nowMs={battle.nowMs}
          held={dragRef.current}
          mode={trueAR ? "overlay" : "full"}
        />
      </View>

      {/* topmost touch layer: nothing can steal the throw gesture */}
      <View style={StyleSheet.absoluteFill} collapsable={false} {...panHandlers} />

      <View style={styles.hud} pointerEvents="box-none">
        <SplatMeter label="You" value={battle.view.playerSplat} />
        <SplatMeter label="Them" value={battle.view.opponentSplat} />
      </View>

      <Pressable style={styles.leave} onPress={leaveBattle} hitSlop={12}>
        <Text style={styles.leaveText}>✕ Leave</Text>
      </Pressable>

      {signedIn && battle.status === "active" && (
        <Pressable style={styles.safety} onPress={confirmBlock} hitSlop={12}>
          <Text style={styles.safetyText}>⚠️</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.cameraToggle}
        onPress={() => setCameraOn((v) => !v)}
        hitSlop={12}
      >
        <Text style={styles.cameraToggleText}>
          {cameraOn ? "🎥 AR on" : "📷 AR off"}
        </Text>
      </Pressable>

      {matchPoint && (
        <Text style={styles.matchPoint} pointerEvents="none">
          MATCH POINT 🍅
        </Text>
      )}

      {(battle.status === "connecting" || battle.status === "waiting") && (
        <View style={styles.waitOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.tomato} size="large" />
          <Text style={styles.waitTitle}>
            {battle.status === "connecting" ? "Connecting…" : "Waiting for an opponent…"}
          </Text>
          {target.kind === "code" && (
            <Text style={styles.waitCode}>room code: {target.code}</Text>
          )}
        </View>
      )}

      {battle.status === "countdown" && (
        <View style={styles.countdown} pointerEvents="none">
          <Text style={styles.countdownText}>
            {Math.max(1, Math.ceil((battle.countdownEndsAt - battle.nowMs) / 1000))}
          </Text>
        </View>
      )}
      {battle.status === "active" && battle.nowMs - battle.countdownEndsAt < 700 && (
        <View style={styles.countdown} pointerEvents="none">
          <Text style={styles.countdownText}>GO! 🍅</Text>
        </View>
      )}

      {battle.status === "active" && (
        <Text style={styles.hint} pointerEvents="none">
          {dragRef.current.active
            ? "Release upward to throw! 🍅💨"
            : `Grab the tomato and flick it — or tap (${BUILD_TAG})`}
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
  safety: { position: "absolute", top: 18, right: 16, paddingVertical: 6, paddingHorizontal: 10 },
  safetyText: { fontSize: 18 },
  cameraToggle: {
    position: "absolute",
    top: 18,
    right: 60,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.textDim,
    backgroundColor: "rgba(26, 13, 10, 0.55)",
  },
  cameraToggleText: { fontSize: 13, color: colors.text, fontWeight: "700" },
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
