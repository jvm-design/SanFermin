/**
 * Plain TypeScript view of the authoritative BattleRoom state.
 *
 * The server defines the matching @colyseus/schema classes; the JS client
 * decodes the schema from the connection handshake, so these interfaces are
 * the single typing surface clients use to read `room.state`.
 */

export type BattlePhase = "waiting" | "active" | "ended";

export interface PlayerStateView {
  /** Authoritative splat meter, 0..COVER_THRESHOLD. */
  splat: number;
  connected: boolean;
}

export interface BattleStateView {
  phase: BattlePhase;
  /** Keyed by Colyseus sessionId. */
  players: ReadonlyMap<string, PlayerStateView> & {
    get(key: string): PlayerStateView | undefined;
    forEach(cb: (value: PlayerStateView, key: string) => void): void;
  };
}
