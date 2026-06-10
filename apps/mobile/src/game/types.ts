export interface Vec2 {
  x: number;
  y: number;
}

/** A tomato in flight. Position is interpolated from startedAt/durationMs. */
export interface Projectile {
  id: number;
  /** outgoing: player -> opponent. incoming: opponent -> player screen. */
  direction: "outgoing" | "incoming";
  from: Vec2;
  to: Vec2;
  startedAt: number;
  durationMs: number;
}

/** One irregular blob of a splat, relative to the splat center. */
export interface SplatBlob {
  dx: number;
  dy: number;
  r: number;
}

/** A tomato splat rendered on screen (player view) or on the opponent. */
export interface Splat {
  id: number;
  center: Vec2;
  blobs: SplatBlob[];
  /** Vertical drip lengths hanging from the splat, 0-2 entries. */
  drips: { dx: number; length: number; width: number }[];
  color: string;
}

export type RoundOutcome = "covered" | "coveredThem";

export type BattlePhase = "active" | "ended";
