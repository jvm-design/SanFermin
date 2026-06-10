import React from "react";
import { StyleSheet } from "react-native";
import { Canvas, Circle, Group, RoundedRect } from "@shopify/react-native-skia";
import { COVER_THRESHOLD } from "@tomatina/shared";
import { BattleState, UseBattleResult } from "../game/useBattle";
import { Projectile, Splat, Vec2 } from "../game/types";
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

function SplatShape({ splat }: { splat: Splat }) {
  return (
    <Group>
      {splat.blobs.map((b, i) => (
        <Circle
          key={i}
          cx={splat.center.x + b.dx}
          cy={splat.center.y + b.dy}
          r={b.r}
          color={splat.color}
          opacity={0.93}
        />
      ))}
      {splat.drips.map((d, i) => (
        <RoundedRect
          key={`d${i}`}
          x={splat.center.x + d.dx - d.width / 2}
          y={splat.center.y}
          width={d.width}
          height={d.length}
          r={d.width / 2}
          color={splat.color}
          opacity={0.88}
        />
      ))}
    </Group>
  );
}

function Opponent({ state, center, radius }: { state: BattleState; center: Vec2; radius: number }) {
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
      {state.opponentSplats.map((s) => (
        <SplatShape key={s.id} splat={s} />
      ))}
    </Group>
  );
}

export function BattleCanvas({ battle }: { battle: UseBattleResult }) {
  const { state, layout, nowMs } = battle;
  const coverage = state.playerSplat / COVER_THRESHOLD;
  // vision-obscured film ramps in over the last third of the meter
  const filmOpacity = Math.max(0, (coverage - 0.65) / 0.35) * 0.55;

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Opponent state={state} center={layout.opponentCenter} radius={layout.opponentRadius} />

      {state.projectiles.map((p) => {
        const { pos, t } = projectilePosition(p, nowMs);
        // outgoing tomatoes shrink into the distance, incoming ones grow at you
        const r = p.direction === "outgoing" ? 22 - 14 * t : 10 + 52 * t;
        return (
          <Group key={p.id}>
            <Circle cx={pos.x} cy={pos.y} r={r} color={colors.tomato} />
            <Circle cx={pos.x} cy={pos.y - r * 0.85} r={r * 0.22} color={colors.stem} />
          </Group>
        );
      })}

      {/* splats covering YOUR view — this is the splat meter made visible */}
      {state.screenSplats.map((s) => (
        <SplatShape key={s.id} splat={s} />
      ))}

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
