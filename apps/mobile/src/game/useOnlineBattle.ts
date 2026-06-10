import { useCallback, useEffect, useReducer, useRef } from "react";
import * as Haptics from "expo-haptics";
import { Client, Room } from "colyseus.js";
import { THROW_COOLDOWN_MS } from "@tomatina/shared";
import {
  BattleStateView,
  MSG_ROUND_END,
  MSG_THROW,
  MSG_THROWN,
  RoundEndEvent,
  ThrowEvent,
  ThrownEvent,
} from "@tomatina/protocol";
import { GAME_SERVER_URL } from "../config";
import { makeOpponentSplat, makeScreenSplat } from "./splats";
import { BattleLayout, BattleViewState, RoundOutcome } from "./types";

const OUTGOING_FLIGHT_MS = 420;
const INCOMING_FLIGHT_MS = 650;
/** Pause on the fully covered screen before moving to the result. */
const ROUND_END_LINGER_MS = 1100;

export type OnlineStatus = "connecting" | "waiting" | "active" | "ended" | "error";

export interface UseOnlineBattleResult {
  status: OnlineStatus;
  errorMessage: string | null;
  view: BattleViewState;
  layout: BattleLayout;
  nowMs: number;
  /** Send a throw intent. aim is the normalized tap point, cosmetic only. */
  throwTomato: (aimX: number, aimY: number) => void;
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
        const client = new Client(GAME_SERVER_URL);
        room = await client.joinOrCreate<BattleStateView>("battle", { code });
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
          if (statusRef.current === "waiting" && state.phase === "active") {
            statusRef.current = "active";
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
        });

        room.onMessage(MSG_THROWN, (e: ThrownEvent) => {
          const layout = layoutRef.current;
          const mine = e.bySessionId === room!.sessionId;
          const jitter = layout.opponentRadius * 0.5;
          viewRef.current.projectiles = [
            ...viewRef.current.projectiles,
            mine
              ? {
                  id: nextProjectileId.current++,
                  direction: "outgoing" as const,
                  from: { x: layout.width / 2, y: layout.height - 90 },
                  to: {
                    x: layout.opponentCenter.x + (Math.random() - 0.5) * 2 * jitter,
                    y: layout.opponentCenter.y + (Math.random() - 0.5) * 2 * jitter,
                  },
                  startedAt: Date.now(),
                  durationMs: OUTGOING_FLIGHT_MS,
                }
              : {
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
  useEffect(() => {
    let raf = 0;
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
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const throwTomato = useCallback((aimX: number, aimY: number) => {
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
    Haptics.selectionAsync().catch(() => {});
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
    throwTomato,
    leave,
  };
}
