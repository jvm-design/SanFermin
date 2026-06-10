# CLAUDE.md — Tomatina (working name)

Project context for Claude Code. Read this fully before any task. The invariants below are not suggestions.

## What this is
A location based game where co located strangers meet through a real time tomato fight instead of a profile swipe. Your screen fills with tomato as you take hits. When covered, the round ends. Chat and identity unlock only by mutual consent after the round.

## MVP scope (Reduction mode, do not exceed without explicit approval)
IN scope:
- 2 player real time tomato battle.
- Presence opt in, coarse proximity matchmaking, one beachhead.
- Three consent gates (presence, battle, chat reveal).
- Post consent chat with moderated media.
- Trust and safety baseline.
- Metric instrumentation for the two kill gates.

OUT of scope for MVP (explicitly deferred, do not build):
- Camera AR rendering. Use a stylized 2D canvas. Camera can be an optional cosmetic background only.
- N player melee (more than 2 per room).
- Multiple cities or zones at once.
- Monetization, cosmetics, special tomatoes.
- Recommendation or ranking algorithms.

If a task seems to require an OUT item, stop and ask. Do not gold plate.

## Non-negotiable invariants (never violate, even when asked to simplify)
1. Location privacy: a client NEVER receives another user's precise coordinates. Clients only ever see a coarse geohash zone and an "N active nearby" count. All proximity logic is server side.
2. Anonymity: a user's name, photo, and profile are hidden until BOTH sides opt in to reveal after a battle. Before that, a user is only an avatar.
3. Three consent gates:
   - Presence is opt in and instantly revocable, including mid battle.
   - Battles are open once a user is active, but always escapable. Block plus report removes a user from the other's future matchmaking, not just from chat.
   - Chat and identity reveal require mutual consent.
4. Netcode is latency tolerant. Authoritative server at TICK_HZ. No twitch hit detection, no rollback netcode. Throws are lightweight state events.
5. Trust and safety from day one: hard 18+ gate, block, report, server side rate limits on nearby pings and battle initiation, automated image moderation on every uploaded media before delivery, pull based media (never auto push).
6. Server is authoritative. Never trust client supplied location, splat totals, or round outcomes.

## Tech stack (locked for MVP)
- Monorepo with pnpm workspaces.
- Client: React Native plus Expo, TypeScript. Battle canvas with react-native-skia. Camera background via expo-camera (cosmetic only).
- Realtime server: Colyseus (Node, TypeScript). A Colyseus room is one battle.
- Presence and matchmaking state: Redis, queues keyed by geohash.
- Data, auth, storage: Supabase (Postgres, phone auth, object storage).
- Chat: Stream Chat SDK, only instantiated after a match exists.
- Image moderation: Hive or AWS Rekognition.
- Hosting: Colyseus server on Railway or Fly. Supabase managed. Redis on Upstash or the host's managed Redis.

## Repo structure
```
/apps/mobile        Expo RN client
/services/game      Colyseus server
/packages/shared    shared TS types and game constants
/packages/protocol  typed client<->server message schemas
/docs               BUILD-PLAN.md and decision records
```

## Shared constants (single source of truth in /packages/shared)
- TICK_HZ = 15
- COVER_THRESHOLD = 100  (splat percent that ends a round)
- GEOHASH_PRECISION = 6  (~1.2 km cell) [validate desired zone size for the beachhead]
- BATTLE_MAX_PLAYERS = 2  (MVP cap, do not raise without approval)
- QUEUE_TIMEOUT_S = 60   (then widen zone or offer a tomato hour)
- NEARBY_PING_RATE_LIMIT and BATTLE_INIT_RATE_LIMIT defined here

## Working conventions (for Claude Code)
- Execute phase by phase per docs/BUILD-PLAN.md. Do not start a later phase before the current phase acceptance criteria pass.
- Keep diffs small and runnable. After every task the app must build and the core loop must be demoable.
- All client to server messages typed via /packages/protocol. No untyped payloads.
- No secrets in the client bundle. Non secret config via Expo public env, secrets via server env only.
- Write metric capture for the kill gates as you build the loop, not afterward.
- When a decision is non obvious, write a short note in /docs/decisions before coding.

## Kill-gates (instrument from Phase 2, they decide the project)
- Liquidity gate: battles_started per active_session in the beachhead.
- Thesis gate: mutual_chat_opt_in per completed_battle.
Both must be queryable from raw events. Do not ship Phase 2 without them.

## Glossary
- battle / room: one Colyseus room, a single tomato fight.
- splat meter: per player accumulated tomato coverage, 0 to COVER_THRESHOLD.
- covered: a player reached COVER_THRESHOLD, round ends for them.
- reveal: mutual opt in that unlocks identity and chat after a battle.
- zone: a geohash cell used for coarse proximity. Never exposed as coordinates.
- focus_signal: how much two players threw at each other, used to suggest a match.
- tomato hour: a scheduled window that concentrates demand when density is low.
