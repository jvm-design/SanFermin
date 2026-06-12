import React from "react";
import { StyleSheet } from "react-native";
import { Canvas, Circle, Group, RoundedRect } from "@shopify/react-native-skia";
import { COVER_THRESHOLD } from "@tomatina/shared";
import { BattleLayout, BattleViewState, Projectile, Splat, Vec2 } from "../game/types";
import { colors } from "../theme";

function projectilePosition(p: Projectile, nowMs: number): { pos: Vec2; t: number } {
  const t = Math.min(1, Math.max(0, (nowMs - p.startedAt) / p.durationMs));
  // ease-out so impacts feel weighty
  const e = 1 - (1 - t) * (1 - t);
  return {
    pos: {
      x: p.from.x + (p.to.x - p.from.x) * e,
      y: p.from.y + (p.to.y - p.from.y) * e,
    },
    t,
  };
}

/** Overshooting ease for the splat impact (squash in, settle back). */
function easeOutBack(p: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

const SPLAT_GROW_MS = 180;

function SplatShape({ splat, nowMs }: { splat: Splat; nowMs: number }) {
  const p = Math.min(1, Math.max(0, (nowMs - splat.createdAt) / SPLAT_GROW_MS));
  const e = easeOutBack(p);
  // drips start after the impact settles
  const dripP = Math.min(1, Math.max(0, (nowMs - splat.createdAt - 250) / 500));
  return (
    <Group>
      {splat.blobs.map((b, i) => (
        <Circle
          key={i}
          cx={splat.center.x + b.dx * e}
          cy={splat.center.y + b.dy * e}
          r={Math.max(0.5, b.r * (0.4 + 0.6 * e))}
          color={splat.color}
          opacity={0.93}
        />
      ))}
      {dripP > 0 &&
        splat.drips.map((d, i) => (
          <RoundedRect
            key={`d${i}`}
            x={splat.center.x + d.dx - d.width / 2}
            y={splat.center.y}
            width={d.width}
            height={d.length * dripP}
            r={d.width / 2}
            color={splat.color}
            opacity={0.88}
          />
        ))}
    </Group>
  );
}

/** A juicy tomato: body, shading, highlight, stem — spinning in flight. */
function Tomato({
  x,
  y,
  r,
  spin,
}: {
  x: number;
  y: number;
  r: number;
  spin: number;
}) {
  return (
    <Group transform={[{ rotate: spin }]} origin={{ x, y }}>
      <Circle cx={x} cy={y + r * 0.12} r={r * 0.96} color={colors.tomatoDark} />
      <Circle cx={x} cy={y} r={r} color={colors.tomato} />
      <Circle cx={x - r * 0.34} cy={y - r * 0.34} r={r * 0.26} color="#f08573" opacity={0.8} />
      <Circle cx={x} cy={y - r * 0.92} r={r * 0.2} color={colors.stem} />
      <Circle cx={x - r * 0.28} cy={y - r * 0.82} r={r * 0.13} color={colors.stem} />
      <Circle cx={x + r * 0.28} cy={y - r * 0.82} r={r * 0.13} color={colors.stem} />
    </Group>
  );
}

function Opponent({
  splats,
  center,
  radius,
  nowMs,
}: {
  splats: Splat[];
  center: Vec2;
  radius: number;
  nowMs: number;
}) {
  const eyeOffset = radius * 0.34;
  return (
    <Group>
      {/* anonymous avatar: just a shape, no identity (invariant 2) */}
      <Circle cx={center.x} cy={center.y} r={radius} color={colors.surface} />
      <Circle
        cx={center.x}
        cy={center.y}
        r={radius}
        color={colors.textDim}
        style="stroke"
        strokeWidth={3}
      />
      <Circle cx={center.x - eyeOffset} cy={center.y - radius * 0.15} r={radius * 0.1} color={colors.text} />
      <Circle cx={center.x + eyeOffset} cy={center.y - radius * 0.15} r={radius * 0.1} color={colors.text} />
      {splats.map((s) => (
        <SplatShape key={s.id} splat={s} nowMs={nowMs} />
      ))}
    </Group>
  );
}

interface HeldTomatoView {
  active: boolean;
  x: number;
  y: number;
}

interface Props {
  view: BattleViewState;
  layout: BattleLayout;
  nowMs: number;
  /** The grabbable tomato (rests at the bottom, follows the finger). */
  held?: HeldTomatoView;
  /**
   * "overlay": only screen-space elements (your splats, held tomato,
   * vision film, shake) — used when the 3D AR scene renders the opponent
   * and the flying tomatoes itself.
   */
  mode?: "full" | "overlay";
}

const SHAKE_MS = 280;
const SHAKE_MAG = 13;

export function BattleCanvas({ view, layout, nowMs, held, mode = "full" }: Props) {
  const coverage = view.playerSplat / COVER_THRESHOLD;
  // vision-obscured film ramps in over the last third of the meter
  const filmOpacity = Math.max(0, (coverage - 0.65) / 0.35) * 0.55;

  // screen shake on incoming hits, decaying fast
  const sinceHit = nowMs - view.lastHitAt;
  const shakeK = view.lastHitAt > 0 && sinceHit < SHAKE_MS ? 1 - sinceHit / SHAKE_MS : 0;
  const shakeX = Math.sin(nowMs * 0.9) * SHAKE_MAG * shakeK;
  const shakeY = Math.cos(nowMs * 1.3) * SHAKE_MAG * shakeK * 0.7;

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Group transform={[{ translateX: shakeX }, { translateY: shakeY }]}>
        {mode === "full" && (
          <Opponent
            splats={view.opponentSplats}
            center={layout.opponentCenter}
            radius={layout.opponentRadius}
            nowMs={nowMs}
          />
        )}

        {mode === "full" &&
          view.projectiles.map((p) => {
            const { pos, t } = projectilePosition(p, nowMs);
            // outgoing tomatoes shrink into the distance, incoming ones grow at you
            const r = p.direction === "outgoing" ? 22 - 14 * t : 10 + 52 * t;
            const spin = (p.direction === "outgoing" ? 7 : 4.5) * t + (p.id % 7);
            return <Tomato key={p.id} x={pos.x} y={pos.y} r={r} spin={spin} />;
          })}

        {/* splats covering YOUR view — this is the splat meter made visible */}
        {view.screenSplats.map((s) => (
          <SplatShape key={s.id} splat={s} nowMs={nowMs} />
        ))}

        {/* the tomato in your hand — lifted above the finger while dragging */}
        {held &&
          (() => {
            const hx = held.x;
            const hy = held.active ? held.y - 48 : held.y;
            const r = held.active ? 30 : 24;
            return (
              <Group>
                <Circle cx={hx} cy={hy + r * 0.2} r={r * 1.02} color="#000000" opacity={0.25} />
                <Tomato x={hx} y={hy} r={r} spin={held.active ? Math.sin(nowMs / 300) * 0.15 : 0} />
              </Group>
            );
          })()}
      </Group>

      {filmOpacity > 0 && (
        <RoundedRect
          x={0}
          y={0}
          width={layout.width}
          height={layout.height}
          r={0}
          color={colors.tomatoDeep}
          opacity={filmOpacity}
        />
      )}
    </Canvas>
  );
}
