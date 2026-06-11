/**
 * Bot opponent for solo testing of online battles.
 *
 * Joins a room by code and throws back on a randomized timer until the round
 * ends, so one phone is enough to exercise the full online flow.
 *
 *   pnpm bot SPLAT                 # join room code SPLAT on localhost
 *   pnpm bot SPLAT --passive       # join but never throw (lets you win)
 *   pnpm bot SPLAT --leave-after 5 # disconnect mid-battle after 5 throws
 *   GAME_SERVER_URL=ws://host:2567 pnpm bot SPLAT
 */
import { Client, Room } from "colyseus.js";
import { COVER_THRESHOLD } from "@tomatina/shared";
import {
  BattleStateView,
  MSG_ROUND_END,
  MSG_THROW,
  MSG_THROWN,
  RoundEndEvent,
  ThrowEvent,
} from "@tomatina/protocol";

const THROW_MIN_MS = 1200;
const THROW_MAX_MS = 2400;

const args = process.argv.slice(2);
const code = args.find((a) => !a.startsWith("--"));
const passive = args.includes("--passive");
const leaveAfterIdx = args.indexOf("--leave-after");
const leaveAfter = leaveAfterIdx >= 0 ? Number(args[leaveAfterIdx + 1]) : Infinity;
const url = process.env.GAME_SERVER_URL ?? "ws://localhost:2567";

if (!code) {
  console.error("usage: pnpm bot <ROOM_CODE> [--passive] [--leave-after N]");
  process.exit(1);
}

async function main() {
  console.log(`bot joining room "${code}" at ${url} ...`);
  const room: Room<BattleStateView> = await new Client(url).joinOrCreate<BattleStateView>(
    "battle",
    { code },
  );
  console.log(`joined room ${room.roomId} as ${room.sessionId} — waiting for opponent`);

  let throws = 0;
  let ended = false;

  room.onMessage(MSG_THROWN, () => {}); // animation event — nothing to draw here

  room.onMessage(MSG_ROUND_END, (e: RoundEndEvent) => {
    ended = true;
    const result =
      e.reason === "playerLeft"
        ? "opponent left"
        : e.coveredSessionId === room.sessionId
          ? "bot got covered — you win!"
          : "bot covered you";
    console.log(`round over: ${result}`);
    room.leave();
    process.exit(0);
  });

  room.onStateChange((state) => {
    const me = state.players.get(room.sessionId);
    let opponent = 0;
    state.players.forEach((p, key) => {
      if (key !== room.sessionId) opponent = p.splat;
    });
    process.stdout.write(
      `\rphase=${state.phase}  bot=${me?.splat ?? 0}/${COVER_THRESHOLD}  you=${opponent}/${COVER_THRESHOLD}  `,
    );
  });

  room.onLeave(() => {
    if (!ended) {
      console.log("\ndisconnected");
      process.exit(0);
    }
  });

  const scheduleThrow = () => {
    if (ended || passive) return;
    const delay = THROW_MIN_MS + Math.random() * (THROW_MAX_MS - THROW_MIN_MS);
    setTimeout(() => {
      if (ended || room.state.phase !== "active") {
        scheduleThrow();
        return;
      }
      if (throws >= leaveAfter) {
        console.log(`\nbot leaving mid-battle after ${throws} throws (disconnect test)`);
        room.leave();
        process.exit(0);
      }
      const msg: ThrowEvent = {
        aimX: 0.15 + Math.random() * 0.7,
        aimY: 0.25 + Math.random() * 0.55,
      };
      room.send(MSG_THROW, msg);
      throws++;
      scheduleThrow();
    }, delay);
  };
  scheduleThrow();
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
