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
 * Geohash precision for proximity zones (~1.2 km cell). Used for presence
 * counts ("N active nearby") and matchmaking pre-filtering only.
 * [validate desired zone size for the beachhead]
 */
export const GEOHASH_PRECISION = 6;

/**
 * Max distance between two users for a battle (docs/decisions/0005).
 * Founder spec: 17.84 m (a 1000 m² circle) rounded up to 20. Hard cap —
 * on queue timeout we surface a tomato hour rather than widen it.
 * Server-side check only; clients never see anyone's coordinates.
 */
export const BATTLE_RADIUS_M = 20;

/**
 * Tolerance added to BATTLE_RADIUS_M to absorb GPS error (phones report
 * 5-20 m+ horizontal accuracy, worse indoors). Effective check:
 * distance <= BATTLE_RADIUS_M + min(accA + accB, GPS_ACCURACY_BUFFER_M).
 * [validate in the beachhead field test]
 */
export const GPS_ACCURACY_BUFFER_M = 25;

/** MVP cap. Do not raise without approval (see BUILD-PLAN Phase 3). */
export const BATTLE_MAX_PLAYERS = 2;

/** Seconds in queue before widening the zone or offering a tomato hour. */
export const QUEUE_TIMEOUT_S = 60;

/** Splat percent added per tomato hit. ~10 hits to be covered. */
export const SPLAT_PER_HIT = 10;

/**
 * Min ms between throws per player. Enforced server side (never trust the
 * client); the client also respects it locally for feel.
 */
export const THROW_COOLDOWN_MS = 280;

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

// ---- Token economy (docs/decisions/0004) ----
// Specified for Phase 3, ships DARK: must stay disabled during the
// beachhead experiment or the liquidity kill gate becomes unreadable.

/** Master switch. Do not enable before the liquidity gate passes. */
export const TOKENS_ENABLED = false;

/** Initiating an online battle costs this many tokens. Receiving is free. */
export const TOKEN_COST_BATTLE_INIT = 1;

/** Free-tier weekly allowance (balance := max(balance, allowance)). */
export const WEEKLY_FREE_TOKENS = 3;

/** Max tokens a free user can hold (earning fills up to this cap). */
export const TOKEN_CAP_FREE = 4;

/** Online battles won per token earned. Practice never counts. */
export const WINS_PER_TOKEN = 3;

export interface SubscriptionTier {
  /** Display price in EUR. [validate: snap to store price tiers] */
  eur: number;
  /** Weekly token allowance; null = unlimited for the week. */
  weeklyTokens: number | null;
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  { eur: 1, weeklyTokens: 5 },
  { eur: 9.99, weeklyTokens: 10 },
  { eur: 20, weeklyTokens: null },
];
