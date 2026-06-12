import React, { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { BattleViewState, Projectile } from "../game/types";
import { Viro } from "./viro";

/**
 * True-AR renderer of the battle view-model (founder decision 0007) — v2.
 *
 * The same authoritative state that drives the 2D canvas drives this 3D
 * scene. The anonymous opponent floats ~2.5 m ahead of where you looked
 * when the round started, bobs gently, and squashes when hit; tomatoes
 * spin through the room with a lob arc; splats stick to the avatar and
 * pop in. Your covered-vision splats stay 2D overlays on top (your EYES
 * get covered, not the world), as do gesture, HUD, countdown, meters.
 *
 * Everything is procedural (driven by nowMs) — no Viro animation timing
 * to go wrong; the scene just re-renders ~30 fps from the view-model.
 */

interface SceneInput {
  view: BattleViewState;
  nowMs: number;
  layoutWidth: number;
  layoutHeight: number;
}

/** Opponent anchor in camera-start space (meters): 2.5 m ahead, eye level. */
const OPPONENT_POS: [number, number, number] = [0, -0.1, -2.5];
const OPPONENT_RADIUS_M = 0.35;
/** Screen-space aim maps to this lateral spread (meters). */
const SPREAD_M = 0.9;
const SPLAT_GROW_MS = 220;
const AVATAR_SQUASH_MS = 260;

let registered = false;
function registerAssets() {
  if (registered || !Viro) return;
  registered = true;
  Viro.ViroMaterials.createMaterials({
    tomatoBody: { diffuseColor: "#e0432f", lightingModel: "Lambert" },
    tomatoStem: { diffuseColor: "#5d8a3a", lightingModel: "Lambert" },
    opponentBody: { diffuseColor: "#2a1612", lightingModel: "Lambert" },
    opponentEye: { diffuseColor: "#fff4ee", lightingModel: "Constant" },
    splatA: { diffuseColor: "#c83a2a", lightingModel: "Lambert" },
    splatB: { diffuseColor: "#a52d20", lightingModel: "Lambert" },
  });
}

function easeOutBack(p: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

function projectileProgress(p: Projectile, nowMs: number): number {
  const t = Math.min(1, Math.max(0, (nowMs - p.startedAt) / p.durationMs));
  return 1 - (1 - t) * (1 - t);
}

/** Deterministic point on the avatar's front hemisphere from the splat id. */
function splatSpot(id: number): [number, number, number] {
  const a = ((id * 137.5) % 70) - 35; // azimuth deg
  const b = ((id * 73.3) % 56) - 28; // elevation deg
  const ar = (a * Math.PI) / 180;
  const br = (b * Math.PI) / 180;
  const r = OPPONENT_RADIUS_M * 0.92;
  return [
    r * Math.sin(ar) * Math.cos(br),
    r * Math.sin(br),
    r * Math.cos(ar) * Math.cos(br),
  ];
}

function buildScene(getInput: () => SceneInput) {
  const {
    ViroARScene,
    ViroAmbientLight,
    ViroDirectionalLight,
    ViroSphere,
    ViroNode,
    ViroText,
  } = Viro;

  function Tomato3D({
    position,
    r,
    spinDeg,
  }: {
    position: [number, number, number];
    r: number;
    spinDeg: number;
  }) {
    return (
      <ViroNode position={position} rotation={[spinDeg, 0, spinDeg * 0.6]}>
        {/* slightly flattened sphere reads as a tomato, not a ball */}
        <ViroNode scale={[1, 0.88, 1]}>
          <ViroSphere radius={r} materials={["tomatoBody"]} />
        </ViroNode>
        <ViroSphere radius={r * 0.24} position={[0, r * 0.85, 0]} materials={["tomatoStem"]} />
        <ViroSphere radius={r * 0.14} position={[-r * 0.3, r * 0.78, 0]} materials={["tomatoStem"]} />
        <ViroSphere radius={r * 0.14} position={[r * 0.3, r * 0.78, 0]} materials={["tomatoStem"]} />
      </ViroNode>
    );
  }

  return function ARBattleScene() {
    const [, setTick] = useState(0);
    const [tracking, setTracking] = useState(true);
    const lastOpponentHits = useRef(0);
    const squashAt = useRef(0);

    useEffect(() => {
      const id = setInterval(() => setTick((t) => t + 1), 33);
      return () => clearInterval(id);
    }, []);

    const { view, nowMs, layoutWidth, layoutHeight } = getInput();

    // avatar squash when a new splat lands on it
    if (view.opponentSplats.length > lastOpponentHits.current) {
      lastOpponentHits.current = view.opponentSplats.length;
      squashAt.current = nowMs;
    }
    const sinceSquash = nowMs - squashAt.current;
    const squashK =
      squashAt.current > 0 && sinceSquash < AVATAR_SQUASH_MS
        ? Math.sin((sinceSquash / AVATAR_SQUASH_MS) * Math.PI) * 0.22
        : 0;

    // gentle idle bob so the avatar feels alive
    const bobY = Math.sin(nowMs / 700) * 0.03;

    const lateral = (x: number) =>
      ((x / Math.max(1, layoutWidth)) - 0.5) * 2 * SPREAD_M;
    const vertical = (y: number) =>
      (0.5 - y / Math.max(1, layoutHeight)) * 1.0;

    const onTracking = (state: unknown) => {
      // 3 = NORMAL in Viro's ViroTrackingStateConstants
      setTracking(state === 3 || state === "TRACKING_NORMAL");
    };

    return (
      <ViroARScene onTrackingUpdated={onTracking}>
        <ViroAmbientLight color="#ffffff" intensity={400} />
        <ViroDirectionalLight color="#ffffff" direction={[0.3, -1, -0.4]} intensity={600} />

        {!tracking && (
          <ViroText
            text={"Move your phone slowly\nto scan the room…"}
            position={[0, 0, -1.5]}
            scale={[0.4, 0.4, 0.4]}
            color="#ffffff"
            extrusionDepth={0}
          />
        )}

        {/* anonymous opponent avatar, floating in the room */}
        <ViroNode
          position={[OPPONENT_POS[0], OPPONENT_POS[1] + bobY, OPPONENT_POS[2]]}
          scale={[1 + squashK, 1 - squashK, 1 + squashK]}
        >
          <ViroSphere radius={OPPONENT_RADIUS_M} materials={["opponentBody"]} />
          <ViroSphere
            radius={0.05}
            position={[-0.12, 0.06, OPPONENT_RADIUS_M * 0.82]}
            materials={["opponentEye"]}
          />
          <ViroSphere
            radius={0.05}
            position={[0.12, 0.06, OPPONENT_RADIUS_M * 0.82]}
            materials={["opponentEye"]}
          />
          {/* splats you landed: flattened blobs popping onto the avatar */}
          {view.opponentSplats.map((s) => {
            const grow = Math.min(1, (nowMs - s.createdAt) / SPLAT_GROW_MS);
            const e = easeOutBack(grow);
            const spot = splatSpot(s.id);
            return (
              <ViroNode
                key={s.id}
                position={spot}
                scale={[e, e, 0.35 * e]}
                transformBehaviors={["billboard"]}
              >
                <ViroSphere
                  radius={0.085}
                  materials={[s.id % 2 === 0 ? "splatA" : "splatB"]}
                />
              </ViroNode>
            );
          })}
        </ViroNode>

        {/* tomatoes in flight, both directions, spinning with a lob arc */}
        {view.projectiles.map((p) => {
          const e = projectileProgress(p, nowMs);
          const arc = Math.sin(e * Math.PI) * 0.5;
          const spinDeg = e * 720 + ((p.id * 53) % 360);
          let pos: [number, number, number];
          let r: number;
          if (p.direction === "outgoing") {
            const lx = lateral(p.to.x);
            pos = [
              lx * e,
              -0.35 + (OPPONENT_POS[1] + 0.35) * e + arc,
              -0.35 + (OPPONENT_POS[2] + 0.35) * e,
            ];
            r = 0.065;
          } else {
            const fromX = lateral(p.from.x) * 0.4;
            const toY = vertical(p.to.y) * 0.25;
            pos = [
              fromX * (1 - e),
              OPPONENT_POS[1] * (1 - e) + toY * e + arc,
              OPPONENT_POS[2] * (1 - e) + 0.18 * e,
            ];
            r = 0.05 + 0.07 * e;
          }
          return <Tomato3D key={p.id} position={pos} r={r} spinDeg={spinDeg} />;
        })}
      </ViroARScene>
    );
  };
}

interface ARProps {
  getView: () => { view: BattleViewState; nowMs: number };
  layoutWidth: number;
  layoutHeight: number;
}

export function ARBattleView({ getView, layoutWidth, layoutHeight }: ARProps) {
  if (!Viro) return null;
  registerAssets();
  const { ViroARSceneNavigator } = Viro;
  const scene = buildScene(() => ({
    ...getView(),
    layoutWidth,
    layoutHeight,
  }));
  return (
    <ViroARSceneNavigator
      style={StyleSheet.absoluteFill}
      autofocus
      initialScene={{ scene }}
    />
  );
}
