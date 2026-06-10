import { Splat, Vec2 } from "./types";

const SPLAT_COLORS = ["#c83a2a", "#d84432", "#b3321f", "#a52d20"];

let nextId = 1;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: readonly T[]): T {
  // arr is never empty here; fall back to first element for the type system
  return arr[Math.floor(Math.random() * arr.length)] ?? arr[0]!;
}

/**
 * A big irregular splat for the player's screen. Base radius scales with
 * screen width so roughly COVER_THRESHOLD / SPLAT_PER_HIT hits visually
 * cover the view.
 */
export function makeScreenSplat(center: Vec2, screenWidth: number): Splat {
  const base = screenWidth * rand(0.16, 0.22);
  const blobs = [{ dx: 0, dy: 0, r: base }];
  const satellites = Math.floor(rand(5, 9));
  for (let i = 0; i < satellites; i++) {
    const angle = rand(0, Math.PI * 2);
    const dist = base * rand(0.6, 1.25);
    blobs.push({
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      r: base * rand(0.18, 0.45),
    });
  }
  const drips = Array.from({ length: Math.floor(rand(1, 3)) }, () => ({
    dx: rand(-base * 0.5, base * 0.5),
    length: base * rand(0.8, 1.8),
    width: base * rand(0.12, 0.22),
  }));
  return { id: nextId++, center, blobs, drips, color: pick(SPLAT_COLORS) };
}

/** A small splat that sticks to the opponent avatar when you land a hit. */
export function makeOpponentSplat(center: Vec2, avatarRadius: number): Splat {
  const base = avatarRadius * rand(0.28, 0.42);
  const blobs = [{ dx: 0, dy: 0, r: base }];
  const satellites = Math.floor(rand(3, 6));
  for (let i = 0; i < satellites; i++) {
    const angle = rand(0, Math.PI * 2);
    const dist = base * rand(0.5, 1.1);
    blobs.push({
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      r: base * rand(0.2, 0.4),
    });
  }
  return { id: nextId++, center, blobs, drips: [], color: pick(SPLAT_COLORS) };
}
