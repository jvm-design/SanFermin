/**
 * Single source of truth for game constants. See CLAUDE.md.
 * Server is authoritative over anything derived from these — clients
 * use them for rendering and prediction only.
 */

/** Authoritative server tick rate (Hz). */
export const TICK_HZ = 15;

/** Splat percent at which a player is "covered" and their round ends. */
export const COVER_THRESHOLD = 100;

/**
 * Geohash precision for proximity zones (~1.2 km cell).
 * [validate desired zone size for the beachhead]
 */
export const GEOHASH_PRECISION = 6;

/** MVP cap. Do not raise without approval (see BUILD-PLAN Phase 3). */
export const BATTLE_MAX_PLAYERS = 2;

/** Seconds in queue before widening the zone or offering a tomato hour. */
export const QUEUE_TIMEOUT_S = 60;

/** Splat percent added per tomato hit. ~10 hits to be covered. */
export const SPLAT_PER_HIT = 10;

export interface RateLimit {
  /** Sliding window length in seconds. */
  windowS: number;
  /** Max events allowed inside the window. */
  max: number;
}

/** Server-side limit on "N active nearby" pings per client. */
export const NEARBY_PING_RATE_LIMIT: RateLimit = { windowS: 60, max: 6 };

/** Server-side limit on battle initiations per client. */
export const BATTLE_INIT_RATE_LIMIT: RateLimit = { windowS: 300, max: 10 };
