/**
 * End-to-end smoke test: boots the server, then drives two real colyseus.js
 * clients through (1) a full round ending in coverage and (2) a round ending
 * with a mid-battle disconnect. Run with `pnpm smoke`.
 */
import { Client, Room } from "colyseus.js";
import { COVER_THRESHOLD, SPLAT_PER_HIT, THROW_COOLDOWN_MS } from "@tomatina/shared";
import {
  BattleStateView,
  MSG_ROUND_END,
  MSG_THROW,
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

async function main() {
  const server = createGameServer();
  await server.listen(PORT);

  await testCoveredRound();
  await testDisconnectEndsCleanly();

  console.log("smoke test passed");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
