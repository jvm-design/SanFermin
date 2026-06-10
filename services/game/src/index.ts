import http from "node:http";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { BattleRoom } from "./rooms/BattleRoom";

export function createGameServer(): Server {
  const server = new Server({
    transport: new WebSocketTransport({ server: http.createServer() }),
  });

  // Manual room-code join (Phase 1, no matchmaking): both players call
  // joinOrCreate with the same { code } and land in the same room.
  server.define("battle", BattleRoom).filterBy(["code"]);

  return server;
}
