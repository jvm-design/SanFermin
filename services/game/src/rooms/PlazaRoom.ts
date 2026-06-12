import { Client, matchMaker, Room } from "@colyseus/core";
import { Schema } from "@colyseus/schema";
import {
  BATTLE_RADIUS_M,
  GEOHASH_PRECISION,
  GPS_ACCURACY_BUFFER_M,
  geohashEncode,
  haversineMeters,
} from "@tomatina/shared";
import {
  MatchedInfo,
  MSG_MATCHED,
  MSG_NEARBY,
  MSG_POSITION,
  NearbyInfo,
} from "@tomatina/protocol";
import { logEvent } from "../events";
import { supabase } from "../supabase";

/** Min interval between accepted position updates per client. */
const POSITION_THROTTLE_MS = 3_000;
/** A position older than this no longer counts as present. */
const POSITION_FRESH_MS = 60_000;
const MATCH_TICK_MS = 2_000;
const NEARBY_TICK_MS = 5_000;

interface Presence {
  userId: string | null;
  accessToken: string | null;
  lat: number;
  lng: number;
  accuracyM: number;
  updatedAt: number;
  zone: string;
  /** Set while a seat reservation is on its way to the client. */
  matched: boolean;
}

interface AuthResult {
  userId: string | null;
  accessToken: string | null;
}

class PlazaState extends Schema {}

/**
 * The plaza: opt-in presence + automatic proximity matchmaking.
 *
 * - Presence is opt-in and instantly revocable: leaving this room (or the
 *   screen that joined it) deletes the position immediately (invariant 3).
 * - Positions live in this room's memory only — never in a database, never
 *   sent to other clients (invariant 1). Single-instance deployment makes
 *   in-memory correct for the beachhead; a Redis store slots in behind
 *   this same room when we scale (docs/decisions/0006).
 * - Two players match when both positions are fresh and the server-side
 *   distance is within BATTLE_RADIUS_M plus a GPS accuracy allowance
 *   (docs/decisions/0005), and neither has blocked the other.
 */
export class PlazaRoom extends Room<PlazaState> {
  maxClients = 500;
  state = new PlazaState();

  private presences = new Map<string, Presence>();
  private lastPositionAt = new Map<string, number>();

  onCreate() {
    this.onMessage(MSG_POSITION, (client, raw: unknown) => {
      this.handlePosition(client, raw);
    });
    this.clock.setInterval(() => void this.matchTick(), MATCH_TICK_MS);
    this.clock.setInterval(() => this.nearbyTick(), NEARBY_TICK_MS);
  }

  /** Presence requires an account when Supabase is configured (18+ gate). */
  async onAuth(_client: Client, options: unknown): Promise<AuthResult> {
    const token = (options as Record<string, unknown> | null)?.accessToken;
    if (!supabase) return { userId: null, accessToken: null };
    if (typeof token !== "string" || token.length === 0) {
      throw new Error("account_required");
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
    return { userId: data.user.id, accessToken: token };
  }

  onJoin(client: Client) {
    const auth = client.auth as AuthResult | undefined;
    logEvent("active_session", {
      sessionIds: [client.sessionId],
      userIds: auth?.userId ? [auth.userId] : [],
    });
  }

  onLeave(client: Client) {
    // Instant revocation: the position is gone the moment the user leaves.
    this.presences.delete(client.sessionId);
    this.lastPositionAt.delete(client.sessionId);
  }

  private handlePosition(client: Client, raw: unknown) {
    const now = Date.now();
    const last = this.lastPositionAt.get(client.sessionId) ?? 0;
    if (now - last < POSITION_THROTTLE_MS) return; // server-side rate limit
    const msg = (raw ?? {}) as Record<string, unknown>;
    const lat = Number(msg.lat);
    const lng = Number(msg.lng);
    const accuracyM = Number(msg.accuracyM);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      return; // never trust client input (invariant 6)
    }
    this.lastPositionAt.set(client.sessionId, now);
    const auth = client.auth as AuthResult | undefined;
    const existing = this.presences.get(client.sessionId);
    this.presences.set(client.sessionId, {
      userId: auth?.userId ?? null,
      accessToken: auth?.accessToken ?? null,
      lat,
      lng,
      accuracyM: Number.isFinite(accuracyM) ? Math.max(0, accuracyM) : 50,
      updatedAt: now,
      zone: geohashEncode(lat, lng, GEOHASH_PRECISION),
      matched: existing?.matched ?? false,
    });
  }

  /** Zone-level count — the only presence info clients ever receive. */
  private nearbyTick() {
    const now = Date.now();
    for (const client of this.clients) {
      const me = this.presences.get(client.sessionId);
      if (!me) continue;
      let count = 0;
      for (const [sid, p] of this.presences) {
        if (sid === client.sessionId) continue;
        if (p.zone === me.zone && now - p.updatedAt <= POSITION_FRESH_MS) count++;
      }
      const info: NearbyInfo = { count, zone: me.zone };
      client.send(MSG_NEARBY, info);
    }
  }

  private async matchTick() {
    const now = Date.now();
    const candidates = [...this.presences.entries()].filter(
      ([, p]) => !p.matched && now - p.updatedAt <= POSITION_FRESH_MS,
    );

    for (let i = 0; i < candidates.length; i++) {
      const [sidA, a] = candidates[i]!;
      if (a.matched) continue;
      for (let j = i + 1; j < candidates.length; j++) {
        const [sidB, b] = candidates[j]!;
        if (a.matched || b.matched) break;
        if (a.zone !== b.zone) continue;

        const allowance = Math.min(a.accuracyM + b.accuracyM, GPS_ACCURACY_BUFFER_M);
        const distance = haversineMeters(a.lat, a.lng, b.lat, b.lng);
        if (distance > BATTLE_RADIUS_M + allowance) continue;

        if (await this.isBlockedPair(a.userId, b.userId)) continue;

        await this.spawnBattle(sidA, a, sidB, b, Math.round(distance));
      }
    }
  }

  private async isBlockedPair(aId: string | null, bId: string | null): Promise<boolean> {
    if (!supabase || !aId || !bId) return false;
    const { data } = await supabase
      .from("blocks")
      .select("blocker_id")
      .or(
        `and(blocker_id.eq.${aId},blocked_id.eq.${bId}),` +
          `and(blocker_id.eq.${bId},blocked_id.eq.${aId})`,
      )
      .limit(1);
    return !!data && data.length > 0;
  }

  private async spawnBattle(
    sidA: string,
    a: Presence,
    sidB: string,
    b: Presence,
    distanceM: number,
  ) {
    const clientA = this.clients.find((c) => c.sessionId === sidA);
    const clientB = this.clients.find((c) => c.sessionId === sidB);
    if (!clientA || !clientB) return;

    a.matched = true;
    b.matched = true;
    try {
      // Match meta rides along so BattleRoom's battle_started event can
      // carry it (distance for tuning decision 0005, zone for liquidity).
      const room = await matchMaker.createRoom("battle", {
        code: "plaza",
        source: "plaza",
        distanceM,
        zone: a.zone,
      });
      const [resA, resB] = await Promise.all([
        matchMaker.reserveSeatFor(room, { accessToken: a.accessToken ?? undefined }),
        matchMaker.reserveSeatFor(room, { accessToken: b.accessToken ?? undefined }),
      ]);
      clientA.send(MSG_MATCHED, { reservation: resA } satisfies MatchedInfo);
      clientB.send(MSG_MATCHED, { reservation: resB } satisfies MatchedInfo);
    } catch (err) {
      a.matched = false;
      b.matched = false;
      console.error(`spawnBattle failed: ${(err as Error).message}`);
    }
  }
}
