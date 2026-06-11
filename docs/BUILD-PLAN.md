# BUILD-PLAN — Tomatina (working name)

Execution order is strict. Each phase ends with acceptance criteria that must pass before the next phase starts. See CLAUDE.md for invariants and stack.

## Phase 0 — Battle feel (target 1-2 weeks). No backend.
Goal: prove the splat to covered to reveal feel is fun before building any infrastructure.

Tasks:
- Scaffold the monorepo and the Expo client (`/apps/mobile`).
- Build the Skia battle canvas: tap or flick to throw a tomato, plus a scripted fake opponent that throws back on a timer.
- Implement the splat meter: the screen progressively fills with tomato as you take hits, reaching COVER_THRESHOLD ends the round.
- Build the covered screen, then a mock reveal consent prompt, then a mock empty chat screen.
- Add a haptic on each hit and a screen state at full coverage (vision obscured).

Acceptance:
- 10 testers play one full round on a real device.
- The meter visibly fills, the round ends at coverage, and the mock reveal to chat flow runs.
- Majority qualitative answer to "was that fun" is yes. If no, stop and rework the feel before Phase 1.

## Phase 1 — Two player real time (target 3-4 weeks).
Goal: prove latency tolerant netcode and a shared battle between two real devices.

Tasks:
- Stand up the Colyseus server in `/services/game` with one room type BattleRoom (BATTLE_MAX_PLAYERS = 2).
- Define the protocol in `/packages/protocol`: ThrowEvent, StateSync (per player splat percent), RoundEnd, PlayerLeft.
- Server holds authoritative splat state and ticks at TICK_HZ. Clients render purely from server state.
- Client connects and joins by manual room code (no matchmaking yet).
- Handle disconnect: if the opponent drops, end the round cleanly with no win by disconnect and no penalty to the remaining player.

Acceptance:
- Two phones on different networks play a full real time round.
- Splat percentages stay consistent across both clients.
- Behaves acceptably at a simulated 150 ms latency.

## Phase 2 — Presence, matchmaking, consent, chat. ONE beachhead. (target 4-6 weeks)
Goal: the real experiment. Does play first matching create connection, and is there enough local synchronous density to keep the loop alive.

Tasks:
- Supabase phone auth plus a hard 18+ gate. Identity is an anonymous avatar with a hidden profile.
- Presence service: client opt in writes presence to Redis keyed by geohash zone, instantly revocable including mid battle.
- Expose only a zone level "N active nearby" count to clients. Never coordinates.
- Notifications: alert a user when there are active players nearby, rate limited.
- Matchmaker: pool active users by zone plus a time window, then require server-side distance <= BATTLE_RADIUS_M (20 m hard cap, docs/decisions/0005), spin a BattleRoom for 2. On QUEUE_TIMEOUT_S, surface a tomato hour.
- Consent gates: open but escapable battle, block plus report that excludes from future matchmaking, covered then mutual reveal then a Stream chat thread.
- Media in chat: upload runs through moderation (Hive or Rekognition) and is delivered pull based, never auto pushed.
- Instrument the kill gates: log battles_started, active_session, completed_battle, mutual_chat_opt_in as raw events.
- Soft launch to one dense beachhead [validate: a single campus or neighborhood].

Acceptance:
- Real strangers in the beachhead complete battles end to end.
- Both kill gate metrics are queryable from raw events.
- All T&S controls work: 18+ gate, block, report, media moderation, presence opt out, rate limits.

## Phase 3 — Deferred. Do not start without Phase 2 gate data.
Only if both kill gates clear in the beachhead:
- Raise BATTLE_MAX_PLAYERS for the N player melee, with per attacker incoming caps to prevent pile on.
- Add the camera AR background.
- Add cosmetics and monetization. Token economy is pre-specified in docs/decisions/0004-token-economy.md (ships dark behind TOKENS_ENABLED).
- Open a second zone.

If the liquidity gate fails in the single best beachhead, the loop cannot spin and the concept is structurally blocked. Surface that finding rather than expanding to hide it.
