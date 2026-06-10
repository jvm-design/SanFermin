import { useCallback, useEffect, useReducer, useRef } from "react";
import * as Haptics from "expo-haptics";
import { COVER_THRESHOLD, SPLAT_PER_HIT } from "@tomatina/shared";
import { makeOpponentSplat, makeScreenSplat } from "./splats";
import {
  BattleLayout,
  BattlePhase,
  BattleViewState,
  Projectile,
  RoundOutcome,
} from "./types";

const OUTGOING_FLIGHT_MS = 420;
const INCOMING_FLIGHT_MS = 650;
/** Min ms between player throws — keeps the feel deliberate, not mashy. */
const THROW_COOLDOWN_MS = 280;
const OPPONENT_THROW_MIN_MS = 1400;
const OPPONENT_THROW_MAX_MS = 2600;
/** Pause on the fully covered screen before moving to the result. */
const ROUND_END_LINGER_MS = 1100;

interface BotBattleState extends BattleViewState {
  phase: BattlePhase;
}

export interface UseBattleResult {
  view: BattleViewState;
  layout: BattleLayout;
  nowMs: number;
  /** Player throw. The tomato launches from the bottom toward the opponent. */
  throwTomato: () => void;
}

export function useBattle(
  width: number,
  height: number,
  onRoundEnd: (outcome: RoundOutcome) => void,
): UseBattleResult {
  const layoutRef = useRef<BattleLayout>({
    width,
    height,
    opponentCenter: { x: width / 2, y: height * 0.24 },
    opponentRadius: Math.min(width, height) * 0.13,
  });

  const stateRef = useRef<BotBattleState>({
    phase: "active",
    playerSplat: 0,
    opponentSplat: 0,
    projectiles: [],
    screenSplats: [],
    opponentSplats: [],
  });
  const nowRef = useRef(Date.now());
  const lastThrowRef = useRef(0);
  const nextProjectileId = useRef(1);
  const onRoundEndRef = useRef(onRoundEnd);
  onRoundEndRef.current = onRoundEnd;

  const [, rerender] = useReducer((c: number) => c + 1, 0);

  const endRound = useCallback((outcome: RoundOutcome) => {
    const s = stateRef.current;
    if (s.phase === "ended") return;
    s.phase = "ended";
    Haptics.notificationAsync(
      outcome === "coveredThem"
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
    setTimeout(() => onRoundEndRef.current(outcome), ROUND_END_LINGER_MS);
  }, []);

  /** Resolve a projectile that finished its flight. */
  const resolveHit = useCallback(
    (p: Projectile) => {
      const s = stateRef.current;
      const layout = layoutRef.current;
      if (p.direction === "outgoing") {
        s.opponentSplat = Math.min(COVER_THRESHOLD, s.opponentSplat + SPLAT_PER_HIT);
        s.opponentSplats = [
          ...s.opponentSplats,
          makeOpponentSplat(p.to, layout.opponentRadius),
        ];
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        if (s.opponentSplat >= COVER_THRESHOLD) endRound("coveredThem");
      } else {
        s.playerSplat = Math.min(COVER_THRESHOLD, s.playerSplat + SPLAT_PER_HIT);
        s.screenSplats = [...s.screenSplats, makeScreenSplat(p.to, layout.width)];
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        if (s.playerSplat >= COVER_THRESHOLD) endRound("covered");
      }
    },
    [endRound],
  );

  // Frame loop: advance the clock, resolve landed projectiles, repaint.
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const s = stateRef.current;
      const now = Date.now();
      nowRef.current = now;
      const landed = s.projectiles.filter((p) => now - p.startedAt >= p.durationMs);
      if (landed.length > 0) {
        s.projectiles = s.projectiles.filter((p) => now - p.startedAt < p.durationMs);
        landed.forEach(resolveHit);
      }
      rerender();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [resolveHit]);

  // Scripted fake opponent: throws back on a randomized timer.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delay =
        OPPONENT_THROW_MIN_MS +
        Math.random() * (OPPONENT_THROW_MAX_MS - OPPONENT_THROW_MIN_MS);
      timer = setTimeout(() => {
        const s = stateRef.current;
        const layout = layoutRef.current;
        if (s.phase === "active") {
          s.projectiles = [
            ...s.projectiles,
            {
              id: nextProjectileId.current++,
              direction: "incoming",
              from: layout.opponentCenter,
              to: {
                x: layout.width * (0.15 + Math.random() * 0.7),
                y: layout.height * (0.25 + Math.random() * 0.55),
              },
              startedAt: Date.now(),
              durationMs: INCOMING_FLIGHT_MS,
            },
          ];
          scheduleNext();
        }
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(timer);
  }, []);

  const throwTomato = useCallback(() => {
    const s = stateRef.current;
    const layout = layoutRef.current;
    const now = Date.now();
    if (s.phase !== "active") return;
    if (now - lastThrowRef.current < THROW_COOLDOWN_MS) return;
    lastThrowRef.current = now;
    const jitter = layout.opponentRadius * 0.5;
    s.projectiles = [
      ...s.projectiles,
      {
        id: nextProjectileId.current++,
        direction: "outgoing",
        from: { x: layout.width / 2, y: layout.height - 90 },
        to: {
          x: layout.opponentCenter.x + (Math.random() - 0.5) * 2 * jitter,
          y: layout.opponentCenter.y + (Math.random() - 0.5) * 2 * jitter,
        },
        startedAt: now,
        durationMs: OUTGOING_FLIGHT_MS,
      },
    ];
    Haptics.selectionAsync().catch(() => {});
  }, []);

  return {
    view: stateRef.current,
    layout: layoutRef.current,
    nowMs: nowRef.current,
    throwTomato,
  };
}
