/**
 * End-to-end smoke test: boots the server, then drives two real colyseus.js
 * clients through (1) a full round ending in coverage and (2) a round ending
 * with a mid-battle disconnect. Run with `pnpm smoke`.
 */
import { Client, Room } from "colyseus.js";
import { COVER_THRESHOLD, SPLAT_PER_HIT, THROW_COOLDOWN_MS } from "@tomatina/shared";
import {
  BattleStateView,
  MatchedInfo,
  MSG_MATCHED,
  MSG_NEARBY,
  MSG_POSITION,
  MSG_ROUND_END,
  MSG_THROW,
  PositionUpdate,
  RoundEndEvent,
  ThrowEvent,
} from "@tomatina/protocol";
import { createGameServer } from "../src/index";

const PORT = 2599;
const URL = `ws://127.0.0.1:${PORT}`;

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond: boolean, msg: string) {
  if (!cond) fail(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor(cond: () => boolean, what: string, timeoutMs = 5000) {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) fail(`timed out waiting for ${what}`);
    await sleep(25);
  }
}

type BattleRoom = Room<BattleStateView>;

async function join(client: Client, code: string): Promise<BattleRoom> {
  return client.joinOrCreate<BattleStateView>("battle", { code });
}

function splatOf(room: BattleRoom, sessionId: string): number {
  return room.state.players.get(sessionId)?.splat ?? -1;
}

async function testCoveredRound() {
  const a = await join(new Client(URL), "TEST1");
  const b = await join(new Client(URL), "TEST1");
  assert(a.roomId === b.roomId, "same code should land in the same room");

  await waitFor(() => a.state.phase === "active" && b.state.phase === "active", "phase active");

  const ends: Record<string, RoundEndEvent> = {};
  a.onMessage(MSG_ROUND_END, (e: RoundEndEvent) => (ends.a = e));
  b.onMessage(MSG_ROUND_END, (e: RoundEndEvent) => (ends.b = e));

  // A throws until B is covered. Also fire a few spam throws inside the
  // cooldown window to confirm the server drops them.
  const throwMsg: ThrowEvent = { aimX: 0.5, aimY: 0.5 };
  const needed = Math.ceil(COVER_THRESHOLD / SPLAT_PER_HIT);
  for (let i = 0; i < needed; i++) {
    a.send(MSG_THROW, throwMsg);
    a.send(MSG_THROW, throwMsg); // inside cooldown — must be ignored
    await sleep(THROW_COOLDOWN_MS + 40);
  }

  await waitFor(() => !!ends.a && !!ends.b, "roundEnd on both clients");

  assert(ends.a!.reason === "covered", `reason should be covered, got ${ends.a!.reason}`);
  assert(
    ends.a!.coveredSessionId === b.sessionId,
    "B should be the covered player",
  );
  assert(
    JSON.stringify(ends.a) === JSON.stringify(ends.b),
    "both clients must see the same round end",
  );

  await waitFor(
    () =>
      splatOf(a, b.sessionId) === COVER_THRESHOLD &&
      splatOf(b, b.sessionId) === COVER_THRESHOLD,
    "covered splat synced to both clients",
  );
  assert(
    splatOf(a, a.sessionId) === 0 && splatOf(b, a.sessionId) === 0,
    `A took no hits so A.splat must be 0 on both clients`,
  );
  assert(a.state.phase === "ended", "phase should be ended");

  console.log("ok: covered round — consistent splat state and round end on both clients");
  await a.leave();
  await b.leave();
}

async function testDisconnectEndsCleanly() {
  const a = await join(new Client(URL), "TEST2");
  const b = await join(new Client(URL), "TEST2");
  await waitFor(() => a.state.phase === "active", "phase active");

  let end: RoundEndEvent | undefined;
  b.onMessage(MSG_ROUND_END, (e: RoundEndEvent) => (end = e));

  await a.leave(); // A walks away mid-battle

  await waitFor(() => !!end, "roundEnd after opponent left");
  assert(end!.reason === "playerLeft", `reason should be playerLeft, got ${end!.reason}`);
  assert(end!.coveredSessionId === null, "no winner on disconnect");

  console.log("ok: disconnect — round ended cleanly with no winner and no penalty");
  await b.leave();
}

async function testPlazaProximityMatching() {
  const clientA = new Client(URL);
  const clientB = new Client(URL);
  const clientFar = new Client(URL);
  const plazaA = await clientA.joinOrCreate("plaza", {});
  const plazaB = await clientB.joinOrCreate("plaza", {});
  const plazaFar = await clientFar.joinOrCreate("plaza", {});

  let resA: unknown;
  let resB: unknown;
  let farMatched = false;
  plazaA.onMessage(MSG_MATCHED, (m: MatchedInfo) => (resA = m.reservation));
  plazaB.onMessage(MSG_MATCHED, (m: MatchedInfo) => (resB = m.reservation));
  plazaFar.onMessage(MSG_MATCHED, () => (farMatched = true));
  plazaA.onMessage(MSG_NEARBY, () => {});
  plazaB.onMessage(MSG_NEARBY, () => {});
  plazaFar.onMessage(MSG_NEARBY, () => {});

  // A and B are ~10 m apart; Far is ~890 m away.
  const posA: PositionUpdate = { lat: 43.262, lng: -2.935, accuracyM: 5 };
  const posB: PositionUpdate = { lat: 43.26209, lng: -2.935, accuracyM: 5 };
  const posFar: PositionUpdate = { lat: 43.27, lng: -2.935, accuracyM: 5 };
  plazaA.send(MSG_POSITION, posA);
  plazaB.send(MSG_POSITION, posB);
  plazaFar.send(MSG_POSITION, posFar);

  await waitFor(() => !!resA && !!resB, "plaza proximity match", 10_000);
  assert(!farMatched, "the faraway player must not be matched");

  // Consume the reservations and play the round for real.
  const battleA = (await clientA.consumeSeatReservation(
    resA as never,
  )) as unknown as BattleRoom;
  const battleB = (await clientB.consumeSeatReservation(
    resB as never,
  )) as unknown as BattleRoom;
  await waitFor(
    () => battleA.state.phase === "countdown" || battleA.state.phase === "active",
    "matched battle countdown",
  );
  await waitFor(() => battleA.state.phase === "active", "matched battle active", 8000);
  assert(battleA.roomId === battleB.roomId, "both players in the same battle room");

  console.log("ok: plaza — 10 m pair matched into a battle, 890 m player left out");

  await battleA.leave();
  await battleB.leave();
  await plazaFar.leave();
  await plazaA.leave();
  await plazaB.leave();
}

async function main() {
  const server = createGameServer();
  await server.listen(PORT);

  await testCoveredRound();
  await testDisconnectEndsCleanly();
  await testPlazaProximityMatching();

  console.log("smoke test passed");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
