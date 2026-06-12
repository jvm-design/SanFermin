/**
 * Plaza protocol: presence + automatic proximity matchmaking.
 *
 * Privacy contract (invariant 1): a client only ever SENDS its own
 * position, and only ever RECEIVES a coarse zone hash and a count of
 * nearby players. Coordinates, distances, and bearings of other users
 * never leave the server.
 */

/** Options passed to joinOrCreate("plaza", ...). Account required. */
export interface PlazaJoinOptions {
  accessToken?: string;
}

// ---- client -> server ----

/** Periodic self position update. Throttled server-side. */
export const MSG_POSITION = "position" as const;

export interface PositionUpdate {
  lat: number;
  lng: number;
  /** Reported horizontal accuracy in meters. */
  accuracyM: number;
}

// ---- server -> client ----

/** Zone-level presence info — the ONLY location data a client receives. */
export const MSG_NEARBY = "nearby" as const;

export interface NearbyInfo {
  /** Players active in your zone (excluding you). */
  count: number;
  /** Your coarse geohash zone. */
  zone: string;
}

/** You have been matched: consume the seat reservation to enter the room. */
export const MSG_MATCHED = "matched" as const;

export interface MatchedInfo {
  /** Colyseus seat reservation (opaque, pass to consumeSeatReservation). */
  reservation: unknown;
}
