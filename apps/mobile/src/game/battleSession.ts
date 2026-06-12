import { Room } from "colyseus.js";
import { BattleStateView } from "@tomatina/protocol";

/**
 * Hands the live room connection from the battle screen to the post-battle
 * reveal flow. The reveal negotiation (decision 0003) happens INSIDE the
 * battle room, so the connection must survive screen changes. Whoever
 * concludes the flow calls release().
 */
export const battleSession: { room: Room<BattleStateView> | null } = {
  room: null,
};

export function releaseBattleSession() {
  battleSession.room?.leave();
  battleSession.room = null;
}
