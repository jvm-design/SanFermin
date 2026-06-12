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

/**
 * Block the current opponent. No payload: the server resolves who the
 * opponent is — the client never supplies a target user id (invariant 6).
 * Effect: the pair is never matched again (invariant 3).
 */
export const MSG_BLOCK = "block" as const;

export const REPORT_REASONS = [
  "harassment",
  "inappropriate",
  "spam",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Report the current opponent. Server resolves the target. */
export const MSG_REPORT = "report" as const;

export interface ReportEvent {
  reason: ReportReason;
}

/** Options passed to joinOrCreate("battle", ...). */
export interface BattleJoinOptions {
  /** Manual room code (Phase 1). */
  code: string;
  /** Supabase access token; identifies the player server-side only. */
  accessToken?: string;
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

// ---- post-battle: reveal consent (decision 0003) ----
// The winner holds the initiative; reveal happens only on MUTUAL consent
// (invariant 3). All identity exchange is server-mediated: clients never
// learn anything about the opponent unless the server says so.

/** Winner -> server: propose to reveal identities and chat. */
export const MSG_PROPOSE_REVEAL = "proposeReveal" as const;

/** Loser -> server: accept the winner's proposal. */
export const MSG_ACCEPT_REVEAL = "acceptReveal" as const;

/** Either side -> server: decline kindly ("just here to play"). */
export const MSG_PASS = "pass" as const;

/** Server -> loser: the winner proposed to reveal. */
export const MSG_REVEAL_PROPOSED = "revealProposed" as const;

/** Server -> the other player: opponent passed kindly. */
export const MSG_PASSED = "passed" as const;

/** Server -> both: mutual consent reached; identities unlocked. */
export const MSG_REVEALED = "revealed" as const;

export interface ChatCredentials {
  apiKey: string;
  token: string;
  channelId: string;
  userId: string;
}

export interface RevealedInfo {
  opponentName: string;
  /** Null when the chat service is not configured: client falls back. */
  chat: ChatCredentials | null;
}
