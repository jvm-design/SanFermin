/**
 * Kill-gate event vocabulary (CLAUDE.md): both gates must be queryable
 * from raw events. Names are shared so client, server, and analytics
 * speak the same language.
 *
 * - Liquidity gate: battles_started per active_session
 * - Thesis gate:    mutual_chat_opt_in per completed_battle
 */

export const EVENT_NAMES = [
  /** A user opted into presence / opened the app ready to play. */
  "active_session",
  /** A battle reached its countdown with two players in the room. */
  "battle_started",
  /** A battle ended by coverage (a real, completed round). */
  "battle_completed",
  /** A battle ended early (disconnect / leave). */
  "battle_abandoned",
  /** BOTH players consented to reveal after a completed battle. */
  "mutual_chat_opt_in",
  /** One player proposed the reveal (winner initiative, decision 0003). */
  "reveal_proposed",
  /** A player declined kindly (friendly pass, decision 0003). */
  "reveal_passed",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export interface GameEvent {
  name: EventName;
  /** Server epoch ms. Events are server-emitted (invariant 6). */
  ts: number;
  /** Colyseus room id when relevant. */
  roomId?: string;
  /** Anonymous session ids involved — never identity, never location. */
  sessionIds?: string[];
  /** Authenticated (still anonymous) user ids, when known. */
  userIds?: string[];
  /** Event-specific extras (duration, reason, zone hash...). */
  props?: Record<string, string | number | boolean>;
}
