# 0001 — Phase 1 netcode decisions

Date: 2026-06-10

## Throws resolve instantly on the server (no flight-time hit windows)

A throw is a lightweight state event (invariant 4). The server applies
SPLAT_PER_HIT to the opponent the moment a valid `throw` message arrives —
there is no dodge mechanic, no twitch hit detection, nothing to roll back.
Tomato flight animation and splat drawing are purely cosmetic, driven by the
server's `thrown` broadcast; splat METERS are only ever rendered from the
authoritative room state, synced at TICK_HZ. This makes the game feel
identical at 20 ms and 150 ms latency: extra latency only delays the cosmetic
animation slightly, never the outcome.

## Room codes via Colyseus `filterBy(["code"])`

Phase 1 needs a manual room code, not matchmaking. Both clients call
`joinOrCreate("battle", { code })`; Colyseus's `filterBy(["code"])` makes the
second client land in the first client's room. The room locks at
BATTLE_MAX_PLAYERS, so a third player with the same code gets a fresh room.
No room registry to build or clean up.

## Disconnect = clean end, no winner

On `onLeave` during an active round the server broadcasts
`roundEnd { reason: "playerLeft", coveredSessionId: null }`. The remaining
player sees "they left", gets no win and no penalty, and is not routed to the
reveal gate (there is nobody to consent with). No reconnection support in
Phase 1 — a drop simply ends the round.

## Toolchain constraints worth remembering

- Colyseus server pinned to 0.16.x because colyseus.js (client) has no stable
  0.17 release yet.
- `@colyseus/schema` decorators require `experimentalDecorators: true` AND
  `useDefineForClassFields: false` (services/game/tsconfig.json). With ES2022
  default field semantics, schema change-tracking breaks at encode time with
  a cryptic `Symbol.metadata` TypeError.
- Metro must prefer the `browser` exports condition
  (apps/mobile/metro.config.js), otherwise `@colyseus/httpie` resolves its
  Node build and the bundle fails on `import 'https'`.
