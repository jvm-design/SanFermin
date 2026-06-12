import { Client, Room } from "@colyseus/core";
import { MapSchema, Schema, type } from "@colyseus/schema";
import {
  BATTLE_MAX_PLAYERS,
  COUNTDOWN_MS,
  COVER_THRESHOLD,
  SPLAT_PER_HIT,
  THROW_COOLDOWN_MS,
  TICK_HZ,
} from "@tomatina/shared";
import {
  BattlePhase,
  MSG_BLOCK,
  MSG_REPORT,
  MSG_ROUND_END,
  MSG_THROW,
  MSG_THROWN,
  REPORT_REASONS,
  ReportReason,
  RoundEndEvent,
  RoundEndReason,
  ThrownEvent,
} from "@tomatina/protocol";
import { logEvent } from "../events";
import { supabase } from "../supabase";

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
interface AuthResult {
  userId: string | null;
}

export class BattleRoom extends Room<BattleRoomState> {
  maxClients = BATTLE_MAX_PLAYERS;
  state = new BattleRoomState();

  private lastThrowAt = new Map<string, number>();
  /** sessionId -> Supabase user id. Server-side only, never synced. */
  private userIds = new Map<string, string | null>();
  /** Analytics meta (plaza match distance/zone). */
  private meta: Record<string, string | number> = {};

  onCreate(options?: unknown) {
    const opts = (options ?? {}) as Record<string, unknown>;
    if (opts.source === "plaza") {
      this.meta.source = "plaza";
      if (typeof opts.distanceM === "number") this.meta.distanceM = opts.distanceM;
      if (typeof opts.zone === "string") this.meta.zone = opts.zone;
    }
    this.setPatchRate(1000 / TICK_HZ);

    this.onMessage(MSG_THROW, (client, raw: unknown) => {
      this.handleThrow(client, raw);
    });
    this.onMessage(MSG_BLOCK, (client) => {
      void this.handleBlock(client);
    });
    this.onMessage(MSG_REPORT, (client, raw: unknown) => {
      void this.handleReport(client, raw);
    });
  }

  /**
   * Verifies the (optional) Supabase access token. Auth is optional during
   * the Phase 2 transition; when a token is presented, the account must be
   * adult and not banned. The user id stays server-side.
   */
  async onAuth(_client: Client, options: unknown): Promise<AuthResult> {
    const token = (options as Record<string, unknown> | null)?.accessToken;
    if (!supabase || typeof token !== "string" || token.length === 0) {
      return { userId: null };
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw new Error("auth_failed");
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_adult, banned_at")
      .eq("id", data.user.id)
      .single();
    if (!profile || !profile.is_adult || profile.banned_at) {
      throw new Error("not_allowed");
    }
    return { userId: data.user.id };
  }

  private startedAt = 0;

  async onJoin(client: Client) {
    const userId = (client.auth as AuthResult | undefined)?.userId ?? null;

    // Never seat two players when either has blocked the other
    // (invariant 3). The error is generic on purpose: a blocked user must
    // not learn they are blocked.
    if (supabase && userId) {
      for (const otherId of this.userIds.values()) {
        if (!otherId) continue;
        const { data } = await supabase
          .from("blocks")
          .select("blocker_id")
          .or(
            `and(blocker_id.eq.${userId},blocked_id.eq.${otherId}),` +
              `and(blocker_id.eq.${otherId},blocked_id.eq.${userId})`,
          )
          .limit(1);
        if (data && data.length > 0) throw new Error("room_unavailable");
      }
    }

    this.userIds.set(client.sessionId, userId);
    this.state.players.set(client.sessionId, new PlayerState());
    if (this.state.players.size === BATTLE_MAX_PLAYERS) {
      this.lock();
      this.startedAt = Date.now();
      logEvent("battle_started", {
        roomId: this.roomId,
        sessionIds: [...this.state.players.keys()],
        userIds: this.knownUserIds(),
        props: this.meta,
      });
      // 3-2-1-GO: both clients unlock at the same server-driven moment.
      this.state.phase = "countdown";
      this.clock.setTimeout(() => {
        if (this.state.phase === "countdown") this.state.phase = "active";
      }, COUNTDOWN_MS);
    }
  }

  private knownUserIds(): string[] {
    return [...this.userIds.values()].filter((id): id is string => id !== null);
  }

  /** Records the block server-side; the pair never matches again. */
  private async handleBlock(client: Client) {
    const blockerId = this.userIds.get(client.sessionId);
    const opponentSessionId = this.opponentOf(client.sessionId);
    const blockedId = opponentSessionId ? this.userIds.get(opponentSessionId) : null;
    if (!supabase || !blockerId || !blockedId) return;
    const { error } = await supabase
      .from("blocks")
      .upsert(
        { blocker_id: blockerId, blocked_id: blockedId },
        { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
      );
    if (error) console.error(`block insert failed: ${error.message}`);
  }

  private async handleReport(client: Client, raw: unknown) {
    const reporterId = this.userIds.get(client.sessionId);
    const opponentSessionId = this.opponentOf(client.sessionId);
    const reportedId = opponentSessionId ? this.userIds.get(opponentSessionId) : null;
    if (!supabase || !reporterId || !reportedId) return;
    const reason = (raw as Record<string, unknown> | null)?.reason;
    const validReason: ReportReason = REPORT_REASONS.includes(reason as ReportReason)
      ? (reason as ReportReason)
      : "other";
    const { error } = await supabase.from("reports").insert({
      reporter_id: reporterId,
      reported_id: reportedId,
      room_id: this.roomId,
      reason: validReason,
    });
    if (error) console.error(`report insert failed: ${error.message}`);
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) player.connected = false;

    if (this.state.phase === "active" || this.state.phase === "countdown") {
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

    logEvent(reason === "covered" ? "battle_completed" : "battle_abandoned", {
      roomId: this.roomId,
      sessionIds: [...this.state.players.keys()],
      userIds: this.knownUserIds(),
      props: {
        reason,
        durationMs: this.startedAt > 0 ? Date.now() - this.startedAt : 0,
      },
    });

    const event: RoundEndEvent = { reason, coveredSessionId };
    this.broadcast(MSG_ROUND_END, event);

    this.clock.setTimeout(() => this.disconnect(), DISPOSE_AFTER_END_MS);
  }
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5;
}
