import { useCallback, useEffect, useRef } from "react";
import {
  MSG_ACCEPT_REVEAL,
  MSG_PASS,
  MSG_PASSED,
  MSG_PROPOSE_REVEAL,
  MSG_REVEAL_PROPOSED,
  MSG_REVEALED,
  RevealedInfo,
} from "@tomatina/protocol";
import { battleSession, releaseBattleSession } from "./battleSession";

export interface UseRevealCallbacks {
  /** Mutual consent reached: identities (and maybe a chat) unlocked. */
  onRevealed: (info: RevealedInfo) => void;
  /** The winner proposed (loser side). */
  onProposed: () => void;
  /** The opponent passed kindly. */
  onPassedByOpponent: () => void;
  /** Connection gone (opponent left, room expired). */
  onClosed: () => void;
}

export interface UseRevealResult {
  /** True when a live server-mediated session exists (online rounds). */
  live: boolean;
  propose: () => void;
  accept: () => void;
  pass: () => void;
  /** Leave the post-battle session (rematch, go home...). */
  release: () => void;
}

/**
 * Server-mediated post-battle consent. Works on the room connection handed
 * over by the battle screen; falls back to `live: false` for practice
 * rounds, where the caller keeps the Phase 0 mock behavior.
 */
export function useReveal(callbacks: UseRevealCallbacks): UseRevealResult {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;
  const live = battleSession.room !== null;

  useEffect(() => {
    const room = battleSession.room;
    if (!room) return;
    let concluded = false;

    room.onMessage(MSG_REVEAL_PROPOSED, () => cbRef.current.onProposed());
    room.onMessage(MSG_REVEALED, (info: RevealedInfo) => {
      concluded = true;
      releaseBattleSession();
      cbRef.current.onRevealed(info);
    });
    room.onMessage(MSG_PASSED, () => {
      concluded = true;
      releaseBattleSession();
      cbRef.current.onPassedByOpponent();
    });
    room.onLeave(() => {
      if (!concluded && battleSession.room === room) {
        battleSession.room = null;
        cbRef.current.onClosed();
      }
    });
  }, []);

  const propose = useCallback(() => {
    battleSession.room?.send(MSG_PROPOSE_REVEAL);
  }, []);
  const accept = useCallback(() => {
    battleSession.room?.send(MSG_ACCEPT_REVEAL);
  }, []);
  const pass = useCallback(() => {
    battleSession.room?.send(MSG_PASS);
    // The canned message is delivered by the server; we can leave now.
    releaseBattleSession();
  }, []);
  const release = useCallback(() => releaseBattleSession(), []);

  return { live, propose, accept, pass, release };
}
