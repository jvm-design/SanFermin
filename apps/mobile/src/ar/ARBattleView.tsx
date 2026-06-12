import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { BattleViewState, Projectile, Vec2 } from "../game/types";
import { Viro } from "./viro";

/**
 * True-AR renderer of the battle view-model (founder decision 0007).
 *
 * The same authoritative state that drives the 2D canvas drives this 3D
 * scene: the opponent floats ~2.5 m in front of where you were looking
 * when the round started, your tomatoes fly from the camera into the
 * world, theirs fly at you. Screen splats (your covered vision) stay 2D
 * overlays on top — your EYES get covered, not the world.
 *
 * Renders nothing unless the Viro native engine is present (dev build).
 */

interface ARProps {
  getView: () => { view: BattleViewState; nowMs: number };
}

/** Opponent anchor in camera-start space (meters): 2.5 m ahead, eye level. */
const OPPONENT_POS: [number, number, number] = [0, 0, -2.5];
const OPPONENT_RADIUS_M = 0.35;
/** Screen-space jitter (px) maps to this lateral spread in meters. */
const SPREAD_M = 0.9;

function projectileProgress(p: Projectile, nowMs: number): number {
  const t = Math.min(1, Math.max(0, (nowMs - p.startedAt) / p.durationMs));
  return 1 - (1 - t) * (1 - t);
}

/** Map a 2D view-model point to a lateral offset around the opponent. */
function lateral(point: Vec2, layoutWidth: number): number {
  return ((point.x / Math.max(1, layoutWidth)) - 0.5) * 2 * SPREAD_M;
}

function buildScene(getView: () => { view: BattleViewState; nowMs: number }, layoutWidth: number) {
  const {
    ViroARScene,
    ViroAmbientLight,
    ViroSphere,
    ViroNode,
    ViroMaterials,
  } = Viro;

  ViroMaterials.createMaterials({
    tomatoBody: { diffuseColor: "#e0432f" },
    tomatoStem: { diffuseColor: "#5d8a3a" },
    opponentBody: { diffuseColor: "#2a1612" },
    opponentEye: { diffuseColor: "#fff4ee" },
    splat: { diffuseColor: "#b3321f" },
  });

  function Tomato3D({ position, r }: { position: [number, number, number]; r: number }) {
    return (
      <ViroNode position={position}>
        <ViroSphere radius={r} materials={["tomatoBody"]} />
        <ViroSphere radius={r * 0.25} position={[0, r, 0]} materials={["tomatoStem"]} />
      </ViroNode>
    );
  }

  return function ARBattleScene() {
    const [, setTick] = useState(0);
    useEffect(() => {
      const id = setInterval(() => setTick((t) => t + 1), 33);
      return () => clearInterval(id);
    }, []);

    const { view, nowMs } = getView();

    return (
      <ViroARScene>
        <ViroAmbientLight color="#ffffff" intensity={600} />

        {/* anonymous opponent avatar, floating in the room */}
        <ViroNode position={OPPONENT_POS}>
          <ViroSphere radius={OPPONENT_RADIUS_M} materials={["opponentBody"]} />
          <ViroSphere
            radius={0.045}
            position={[-0.12, 0.05, OPPONENT_RADIUS_M * 0.8]}
            materials={["opponentEye"]}
          />
          <ViroSphere
            radius={0.045}
            position={[0.12, 0.05, OPPONENT_RADIUS_M * 0.8]}
            materials={["opponentEye"]}
          />
          {/* splats you landed stick to the avatar */}
          {view.opponentSplats.map((s) => (
            <ViroSphere
              key={s.id}
              radius={0.07}
              position={[
                lateral(s.center, layoutWidth) * 0.3,
                ((0.5 - s.center.y / 800) * 0.4),
                OPPONENT_RADIUS_M * 0.85,
              ]}
              materials={["splat"]}
            />
          ))}
        </ViroNode>

        {/* tomatoes in flight, both directions */}
        {view.projectiles.map((p) => {
          const e = projectileProgress(p, nowMs);
          const lat = lateral(p.to, layoutWidth);
          const arc = Math.sin(e * Math.PI) * 0.45; // a small lob
          const pos: [number, number, number] =
            p.direction === "outgoing"
              ? [lat * e, -0.25 + (0.05 - -0.25) * e + arc, -0.3 + (OPPONENT_POS[2] + 0.3) * e]
              : [lat * (1 - e), 0.05 * (1 - e) + arc, OPPONENT_POS[2] * (1 - e) - 0.25 * e];
          const r = p.direction === "outgoing" ? 0.06 : 0.05 + 0.06 * e;
          return <Tomato3D key={p.id} position={pos} r={r} />;
        })}
      </ViroARScene>
    );
  };
}

export function ARBattleView({ getView, layoutWidth }: ARProps & { layoutWidth: number }) {
  if (!Viro) return null;
  const { ViroARSceneNavigator } = Viro;
  const scene = buildScene(getView, layoutWidth);
  return (
    <ViroARSceneNavigator
      style={StyleSheet.absoluteFill}
      autofocus
      initialScene={{ scene }}
    />
  );
}
