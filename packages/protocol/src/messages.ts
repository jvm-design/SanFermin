/**
 * Typed client<->server messages for a battle room.
 *
 * Latency-tolerance contract (CLAUDE.md invariant 4): throws are lightweight
 * state events. The server resolves a hit the moment it receives a throw —
 * there is no flight-time hit window, no dodging, no twitch detection.
 * Tomato flight and splat drawing are purely cosmetic, driven by the
 * broadcast "thrown" event; splat METERS are only ever read from the
 * authoritative room state.
 */

// ---- client -> server ----

export const MSG_THROW = "throw" as const;

export interface ThrowEvent {
  /** Normalized aim point (0..1 of the victim's screen). Cosmetic only. */
  aimX: number;
  aimY: number;
}

// ---- server -> clients ----

/** Broadcast to both players so each client can animate the tomato. */
export const MSG_THROWN = "thrown" as const;

export interface ThrownEvent {
  bySessionId: string;
  aimX: number;
  aimY: number;
}

export const MSG_ROUND_END = "roundEnd" as const;

export type RoundEndReason =
  /** A player reached COVER_THRESHOLD. */
  | "covered"
  /**
   * A player left or dropped mid-round. The round ends cleanly: no win by
   * disconnect, no penalty to the remaining player (BUILD-PLAN Phase 1).
   */
  | "playerLeft";

export interface RoundEndEvent {
  reason: RoundEndReason;
  /** Session id of the covered player. Null when reason is "playerLeft". */
  coveredSessionId: string | null;
}
