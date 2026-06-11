# TESTING — Phase 0 & Phase 1

How to verify the acceptance criteria in BUILD-PLAN.md on real hardware.

## Prerequisites

- Node 22+, pnpm 10+ (`corepack enable` gives you pnpm).
- **Expo Go** app on your phone(s) — iOS App Store / Google Play.
- Phone and computer on the same Wi-Fi network (for local testing).

```bash
pnpm install
```

## Automated checks (run these first)

```bash
pnpm typecheck                                  # all packages
pnpm --filter @tomatina/game-server smoke       # server end-to-end:
#   full covered round with two real clients, consistent state on both,
#   cooldown spam dropped, disconnect ends cleanly with no winner
```

## Phase 0 — battle feel (one phone, no server)

```bash
pnpm mobile          # starts Expo; scan the QR code with Expo Go
```

On the phone: **Practice vs bot** → tap to throw → take hits until covered
(or cover the bot) → covered screen → reveal prompt → mock chat.

Checklist (BUILD-PLAN Phase 0 acceptance):
- [ ] Meter visibly fills as you take hits; haptic on every hit.
- [ ] Vision gets obscured near full coverage; round ends at 100%.
- [ ] Covered → reveal → chat flow runs end to end.
- [ ] "Was that fun?" — ask your 10 testers.

## Phase 1 — real-time online battle

### 1. Start the game server

```bash
pnpm --filter @tomatina/game-server dev     # listens on :2567
```

### 2. Point the app at the server

Find your computer's LAN IP (`ipconfig getifaddr en0` on macOS,
`hostname -I` on Linux), then:

```bash
cd apps/mobile
cp .env.example .env       # edit: EXPO_PUBLIC_GAME_SERVER_URL=ws://<LAN_IP>:2567
pnpm start
```

(Restart `pnpm start` after changing `.env` — Expo inlines public env at
bundle time.)

### 3a. Solo test with the bot opponent

One phone is enough — the bot plays the other side:

```bash
pnpm --filter @tomatina/game-server bot SPLAT                  # throws back
pnpm --filter @tomatina/game-server bot SPLAT --passive        # never throws
pnpm --filter @tomatina/game-server bot SPLAT --leave-after 3  # disconnect test
```

On the phone: **Battle online** → enter `SPLAT` → fight.

### 3b. Two-phone test

Both phones open **Battle online** and enter the *same* code (any word you
agree on). First one waits, second one starts the round.

Checklist (BUILD-PLAN Phase 1 acceptance):
- [ ] Two phones play a full round in real time.
- [ ] Splat percentages match on both screens (meters are server state).
- [ ] Kill one phone's app mid-round → other phone sees "They left",
      no winner, and is NOT routed to the reveal prompt.
- [ ] Leave button exits instantly at any point.

### 4. Latency test (150 ms acceptance bar)

```bash
SIMULATE_LATENCY_MS=150 pnpm --filter @tomatina/game-server dev
```

Play a round (bot or two phones). Throws should still feel responsive —
the meters and animations lag slightly but outcomes never glitch or
disagree between screens.

### Different networks (the real acceptance test)

`ws://<LAN_IP>` only works on one Wi-Fi. For phones on different networks,
deploy the server (Railway/Fly per CLAUDE.md, `PORT` is respected, no other
config needed) and set `EXPO_PUBLIC_GAME_SERVER_URL=wss://<your-host>`.
A quick alternative for a test session: tunnel localhost with
`ngrok http 2567` and use the `wss://` URL it prints.

## Troubleshooting

- **Phone can't reach Metro**: run `pnpm start --tunnel` (slower but works
  across networks/firewalls).
- **"Can't battle / connection error"**: the app can't reach the game
  server — check the IP in `.env`, that the server is running, and that
  your firewall allows :2567.
- **Stuck on "Waiting for an opponent"**: codes must match exactly; a room
  locks once 2 players join, so a third device with the same code starts a
  new empty room.
- **Haptics silent on Android emulator / iOS simulator**: expected — test
  haptics on a real device.
