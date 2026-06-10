import { Client, Room } from "@colyseus/core";
import { MapSchema, Schema, type } from "@colyseus/schema";
import {
  BATTLE_MAX_PLAYERS,
  COVER_THRESHOLD,
  SPLAT_PER_HIT,
  THROW_COOLDOWN_MS,
  TICK_HZ,
} from "@tomatina/shared";
import {
  BattlePhase,
  MSG_ROUND_END,
  MSG_THROW,
  MSG_THROWN,
  RoundEndEvent,
  RoundEndReason,
  ThrownEvent,
} from "@tomatina/protocol";

/** Keep an ended room around briefly so clients can read the result. */
const DISPOSE_AFTER_END_MS = 30_000;

export class PlayerState extends Schema {
  @type("number") splat = 0;
  @type("boolean") connected = true;
}

export class BattleRoomState extends Schema {
  @type("string") phase: BattlePhase = "waiting";
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}

/**
 * One battle = one room (CLAUDE.md). The server is authoritative over splat
 * state: clients only send throw intents, never splat totals or outcomes.
 * A throw resolves the moment it is received — no twitch hit detection.
 */
export class BattleRoom extends Room<BattleRoomState> {
  maxClients = BATTLE_MAX_PLAYERS;
  state = new BattleRoomState();

  private lastThrowAt = new Map<string, number>();

  onCreate() {
    this.setPatchRate(1000 / TICK_HZ);

    this.onMessage(MSG_THROW, (client, raw: unknown) => {
      this.handleThrow(client, raw);
    });
  }

  onJoin(client: Client) {
    this.state.players.set(client.sessionId, new PlayerState());
    if (this.state.players.size === BATTLE_MAX_PLAYERS) {
      this.lock();
      this.state.phase = "active";
    }
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) player.connected = false;

    if (this.state.phase === "active") {
      // Opponent dropped or left: end cleanly. No win by disconnect, no
      // penalty for the remaining player (BUILD-PLAN Phase 1).
      this.endRound("playerLeft", null);
    } else if (this.state.phase === "waiting") {
      this.state.players.delete(client.sessionId);
    }
  }

  private handleThrow(client: Client, raw: unknown) {
    if (this.state.phase !== "active") return;

    const thrower = this.state.players.get(client.sessionId);
    if (!thrower || !thrower.connected) return;

    // Server-side cooldown: drop throws that arrive too fast.
    const now = Date.now();
    const last = this.lastThrowAt.get(client.sessionId) ?? 0;
    if (now - last < THROW_COOLDOWN_MS) return;
    this.lastThrowAt.set(client.sessionId, now);

    // Validate the (cosmetic) aim payload; never trust client input.
    const msg = (raw ?? {}) as Record<string, unknown>;
    const aimX = clamp01(Number(msg.aimX));
    const aimY = clamp01(Number(msg.aimY));

    const opponentId = this.opponentOf(client.sessionId);
    const opponent = opponentId ? this.state.players.get(opponentId) : undefined;
    if (!opponentId || !opponent) return;

    opponent.splat = Math.min(COVER_THRESHOLD, opponent.splat + SPLAT_PER_HIT);

    const thrown: ThrownEvent = { bySessionId: client.sessionId, aimX, aimY };
    this.broadcast(MSG_THROWN, thrown);

    if (opponent.splat >= COVER_THRESHOLD) {
      this.endRound("covered", opponentId);
    }
  }

  private opponentOf(sessionId: string): string | undefined {
    for (const key of this.state.players.keys()) {
      if (key !== sessionId) return key;
    }
    return undefined;
  }

  private endRound(reason: RoundEndReason, coveredSessionId: string | null) {
    if (this.state.phase === "ended") return;
    this.state.phase = "ended";

    const event: RoundEndEvent = { reason, coveredSessionId };
    this.broadcast(MSG_ROUND_END, event);

    this.clock.setTimeout(() => this.disconnect(), DISPOSE_AFTER_END_MS);
  }
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5;
}
