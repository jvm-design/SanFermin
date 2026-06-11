import { useMemo, useRef } from "react";
import { PanResponder } from "react-native";
import { Vec2 } from "./types";

export interface ThrowRelease {
  /** Where the tomato left the finger. */
  from: Vec2;
  /** Velocity in px/ms. Negative vy = upward. */
  vx: number;
  vy: number;
  /** True when the gesture was a quick tap instead of a drag. */
  tap: boolean;
}

export interface HeldTomato {
  active: boolean;
  x: number;
  y: number;
}

/** Minimum upward speed (px/ms) for a drag to count as a throw. */
const FLICK_VY_THRESHOLD = -0.3;
const TAP_MAX_DIST = 12;
const TAP_MAX_MS = 250;
/** Velocity is measured over the last samples within this window. */
const VELOCITY_WINDOW_MS = 120;

/**
 * Pokémon-Go-style throw: grab anywhere, the tomato follows your finger,
 * release with an upward flick to launch it. A quick tap also throws
 * (BUILD-PLAN Phase 0: "tap or flick"). A slow release just drops the
 * tomato back to its resting spot.
 */
export function useThrowGesture(
  restPos: Vec2,
  onThrow: (release: ThrowRelease) => void,
) {
  const dragRef = useRef<HeldTomato>({ active: false, x: restPos.x, y: restPos.y });
  const samplesRef = useRef<{ t: number; x: number; y: number }[]>([]);
  const startRef = useRef({ t: 0, x: 0, y: 0 });

  const panResponder = useMemo(() => {
    const rest = () => {
      dragRef.current = { active: false, x: restPos.x, y: restPos.y };
    };
    rest();

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const now = Date.now();
        startRef.current = { t: now, x: pageX, y: pageY };
        samplesRef.current = [{ t: now, x: pageX, y: pageY }];
        dragRef.current = { active: true, x: pageX, y: pageY };
      },
      onPanResponderMove: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const now = Date.now();
        const samples = samplesRef.current;
        samples.push({ t: now, x: pageX, y: pageY });
        while (samples.length > 1 && now - samples[0]!.t > VELOCITY_WINDOW_MS) {
          samples.shift();
        }
        dragRef.current = { active: true, x: pageX, y: pageY };
      },
      onPanResponderRelease: () => {
        const samples = samplesRef.current;
        const first = samples[0];
        const last = samples[samples.length - 1];
        rest();
        if (!first || !last) return;

        const start = startRef.current;
        const totalDist = Math.hypot(last.x - start.x, last.y - start.y);
        const totalMs = last.t - start.t;
        if (totalDist < TAP_MAX_DIST && totalMs < TAP_MAX_MS) {
          onThrow({ from: restPos, vx: 0, vy: -1, tap: true });
          return;
        }

        const dt = Math.max(1, last.t - first.t);
        const vx = (last.x - first.x) / dt;
        const vy = (last.y - first.y) / dt;
        if (vy < FLICK_VY_THRESHOLD) {
          onThrow({ from: { x: last.x, y: last.y }, vx, vy, tap: false });
        }
        // otherwise: not enough oomph — the tomato just settles back
      },
      onPanResponderTerminate: rest,
    });
  }, [restPos.x, restPos.y, onThrow]);

  return { panHandlers: panResponder.panHandlers, dragRef };
}
