import { useCallback, useEffect, useReducer, useRef } from "react";
import * as Haptics from "expo-haptics";
import { Client, Room } from "colyseus.js";
import { COUNTDOWN_MS, THROW_COOLDOWN_MS } from "@tomatina/shared";
import {
  BattleJoinOptions,
  BattleStateView,
  MSG_BLOCK,
  MSG_REPORT,
  MSG_ROUND_END,
  MSG_THROW,
  MSG_THROWN,
  ReportEvent,
  RoundEndEvent,
  ThrowEvent,
  ThrownEvent,
} from "@tomatina/protocol";
import { GAME_SERVER_URL } from "../config";
import { supabase } from "../lib/supabase";
import { makeOpponentSplat, makeScreenSplat } from "./splats";
import { BattleLayout, BattleViewState, RoundOutcome } from "./types";

const OUTGOING_FLIGHT_MS = 420;
const INCOMING_FLIGHT_MS = 650;
/** Pause on the fully covered screen before moving to the result. */
const ROUND_END_LINGER_MS = 1100;

export type OnlineStatus =
  | "connecting"
  | "waiting"
  | "countdown"
  | "active"
  | "ended"
  | "error";

export interface OnlineThrowOptions {
  /** Launch point (where the flick released). Defaults to the rest spot. */
  from?: { x: number; y: number };
  /** -1..1 horizontal flick direction, bends the shot left/right. */
  lateralBias?: number;
}

export interface UseOnlineBattleResult {
  status: OnlineStatus;
  errorMessage: string | null;
  view: BattleViewState;
  layout: BattleLayout;
  nowMs: number;
  /** Local epoch ms when the server countdown unlocks throwing. */
  countdownEndsAt: number;
  /** Send a throw intent. aim is the normalized splat point, cosmetic only. */
  throwTomato: (aimX: number, aimY: number, opts?: OnlineThrowOptions) => void;
  /**
   * Block the opponent (optionally with a report). Server resolves the
   * target and excludes the pair from future matchmaking. Caller should
   * leave the battle afterwards.
   */
  blockOpponent: (alsoReport: boolean) => void;
  /** Leave the battle (always escapable). */
  leave: () => void;
}

/**
 * Online battle against a real opponent. The server is authoritative: splat
 * meters are read ONLY from room state. Tomato flight and splat drawings are
 * cosmetic, driven by the server's "thrown" broadcast.
 */
export function useOnlineBattle(
  code: string,
  width: number,
  height: number,
  onRoundEnd: (outcome: RoundOutcome) => void,
): UseOnlineBattleResult {
  const layoutRef = useRef<BattleLayout>({
    width,
    height,
    opponentCenter: { x: width / 2, y: height * 0.24 },
    opponentRadius: Math.min(width, height) * 0.13,
  });

  const viewRef = useRef<BattleViewState>({
    playerSplat: 0,
    opponentSplat: 0,
    projectiles: [],
    screenSplats: [],
    opponentSplats: [],
  });
  const statusRef = useRef<OnlineStatus>("connecting");
  const countdownEndsAtRef = useRef(0);
  const errorRef = useRef<string | null>(null);
  const roomRef = useRef<Room<BattleStateView> | null>(null);
  const nowRef = useRef(Date.now());
  const lastThrowRef = useRef(0);
  const nextProjectileId = useRef(1);
  const onRoundEndRef = useRef(onRoundEnd);
  onRoundEndRef.current = onRoundEnd;

  const [, rerender] = useReducer((c: number) => c + 1, 0);

  // Connect once. Leaving the screen unmounts the hook and leaves the room.
  useEffect(() => {
    let disposed = false;
    let room: Room<BattleStateView> | null = null;

    const connect = async () => {
      try {
        // Identify ourselves when signed in; the server verifies the token
        // and keeps the user id server-side (blocks, reports, events).
        let accessToken: string | undefined;
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          accessToken = data.session?.access_token;
        }
        const options: BattleJoinOptions = { code, accessToken };
        const client = new Client(GAME_SERVER_URL);
        room = await client.joinOrCreate<BattleStateView>("battle", options);
        if (disposed) {
          room.leave();
          return;
        }
        roomRef.current = room;
        statusRef.current = "waiting";

        room.onStateChange((state) => {
          const me = state.players.get(room!.sessionId);
          let opponentSplat = 0;
          state.players.forEach((p, key) => {
            if (key !== room!.sessionId) opponentSplat = p.splat;
          });
          viewRef.current.playerSplat = me?.splat ?? 0;
          viewRef.current.opponentSplat = opponentSplat;
          if (statusRef.current === "waiting" && state.phase === "countdown") {
            // The server clock drives the real unlock; this local deadline
            // only renders the 3-2-1 numbers.
            statusRef.current = "countdown";
            countdownEndsAtRef.current = Date.now() + COUNTDOWN_MS;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
          if (
            (statusRef.current === "waiting" || statusRef.current === "countdown") &&
            state.phase === "active"
          ) {
            statusRef.current = "active";
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
        });

        room.onMessage(MSG_THROWN, (e: ThrownEvent) => {
          // Own throws are animated locally at send time for instant feel;
          // splat METERS still come exclusively from server state.
          if (e.bySessionId === room!.sessionId) return;
          const layout = layoutRef.current;
          viewRef.current.projectiles = [
            ...viewRef.current.projectiles,
            {
              id: nextProjectileId.current++,
              direction: "incoming" as const,
              from: layout.opponentCenter,
              // their aim point lands on MY screen
              to: { x: e.aimX * layout.width, y: e.aimY * layout.height },
              startedAt: Date.now(),
              durationMs: INCOMING_FLIGHT_MS,
            },
          ];
        });

        room.onMessage(MSG_ROUND_END, (e: RoundEndEvent) => {
          statusRef.current = "ended";
          const outcome: RoundOutcome =
            e.reason === "playerLeft"
              ? "opponentLeft"
              : e.coveredSessionId === room!.sessionId
                ? "covered"
                : "coveredThem";
          if (e.reason === "covered") {
            Haptics.notificationAsync(
              outcome === "coveredThem"
                ? Haptics.NotificationFeedbackType.Success
                : Haptics.NotificationFeedbackType.Error,
            ).catch(() => {});
          }
          const linger = e.reason === "covered" ? ROUND_END_LINGER_MS : 300;
          setTimeout(() => onRoundEndRef.current(outcome), linger);
        });

        room.onError((_code, message) => {
          if (statusRef.current === "ended") return;
          statusRef.current = "error";
          errorRef.current = message ?? "connection error";
        });

        room.onLeave(() => {
          // Unexpected drop (we didn't reach "ended" and didn't leave on purpose)
          if (statusRef.current !== "ended" && !disposed) {
            statusRef.current = "error";
            errorRef.current = "Lost connection to the battle.";
          }
        });
      } catch (err) {
        if (!disposed) {
          statusRef.current = "error";
          errorRef.current =
            err instanceof Error ? err.message : "Could not reach the game server.";
        }
      }
    };
    connect();

    return () => {
      disposed = true;
      roomRef.current?.leave();
      roomRef.current = null;
    };
  }, [code]);

  // Frame loop: advance the clock, land cosmetic projectiles, repaint.
  // setInterval rather than requestAnimationFrame: it keeps ticking in
  // every RN environment, including when rAF throttles or stalls.
  useEffect(() => {
    const step = () => {
      const v = viewRef.current;
      const layout = layoutRef.current;
      const now = Date.now();
      nowRef.current = now;
      const landed = v.projectiles.filter((p) => now - p.startedAt >= p.durationMs);
      if (landed.length > 0) {
        v.projectiles = v.projectiles.filter((p) => now - p.startedAt < p.durationMs);
        for (const p of landed) {
          if (p.direction === "incoming") {
            v.screenSplats = [...v.screenSplats, makeScreenSplat(p.to, layout.width)];
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
          } else {
            v.opponentSplats = [
              ...v.opponentSplats,
              makeOpponentSplat(p.to, layout.opponentRadius),
            ];
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }
        }
      }
      rerender();
    };
    const id = setInterval(step, 1000 / 60);
    return () => clearInterval(id);
  }, []);

  const throwTomato = useCallback(
    (aimX: number, aimY: number, opts?: OnlineThrowOptions) => {
      const room = roomRef.current;
      if (!room || statusRef.current !== "active") return;
      // respect the cooldown locally for feel; the server enforces it anyway
      const now = Date.now();
      if (now - lastThrowRef.current < THROW_COOLDOWN_MS) return;
      lastThrowRef.current = now;
      const msg: ThrowEvent = {
        aimX: Math.min(1, Math.max(0, aimX)),
        aimY: Math.min(1, Math.max(0, aimY)),
      };
      room.send(MSG_THROW, msg);

      // cosmetic local animation, instant even at high latency
      const layout = layoutRef.current;
      const bias = Math.max(-1, Math.min(1, opts?.lateralBias ?? 0));
      const jitter = layout.opponentRadius * 0.35;
      viewRef.current.projectiles = [
        ...viewRef.current.projectiles,
        {
          id: nextProjectileId.current++,
          direction: "outgoing",
          from: opts?.from ?? { x: layout.width / 2, y: layout.height - 90 },
          to: {
            x:
              layout.opponentCenter.x +
              bias * layout.opponentRadius * 1.1 +
              (Math.random() - 0.5) * 2 * jitter,
            y: layout.opponentCenter.y + (Math.random() - 0.5) * 2 * jitter,
          },
          startedAt: now,
          durationMs: OUTGOING_FLIGHT_MS,
        },
      ];
      Haptics.selectionAsync().catch(() => {});
    },
    [],
  );

  const blockOpponent = useCallback((alsoReport: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    room.send(MSG_BLOCK);
    if (alsoReport) {
      const report: ReportEvent = { reason: "inappropriate" };
      room.send(MSG_REPORT, report);
    }
  }, []);

  const leave = useCallback(() => {
    statusRef.current = "ended";
    roomRef.current?.leave();
  }, []);

  return {
    status: statusRef.current,
    errorMessage: errorRef.current,
    view: viewRef.current,
    layout: layoutRef.current,
    nowMs: nowRef.current,
    countdownEndsAt: countdownEndsAtRef.current,
    throwTomato,
    blockOpponent,
    leave,
  };
}
