import http from "node:http";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { BattleRoom } from "./rooms/BattleRoom";
import { PlazaRoom } from "./rooms/PlazaRoom";

export function createGameServer(): Server {
  const server = new Server({
    transport: new WebSocketTransport({ server: http.createServer() }),
  });

  // Manual room-code join (Phase 1 path, kept for dev/testing): both
  // players call joinOrCreate with the same { code }.
  server.define("battle", BattleRoom).filterBy(["code"]);

  // Presence + proximity matchmaking (Phase 2): one global plaza.
  server.define("plaza", PlazaRoom);

  return server;
}
