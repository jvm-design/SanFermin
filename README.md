# Tomatina 🍅 (working name)

A location-based game where co-located strangers meet through a real-time
tomato fight instead of a profile swipe. Identity and chat unlock only by
mutual consent after the battle.

**Status: Phase 2 complete** (see `docs/BUILD-PLAN.md`). The full loop runs
in production: anonymous phone-verified accounts (18+), 20 m proximity
matchmaking, real-time battles, winner-initiative mutual reveal, hosted
chat with moderated media, block/report, and kill-gate instrumentation.

## Architecture

| Piece | Tech | Where |
|---|---|---|
| Mobile app | React Native + Expo (SDK 54), Skia canvas | `apps/mobile` |
| Game server | Colyseus (battle rooms + plaza matchmaking) | `services/game` |
| Accounts, data, storage | Supabase (phone auth, Postgres + RLS, storage) | `supabase/migrations` |
| Chat | Stream (channel created at mutual reveal) | server-mediated |
| Image moderation | Sightengine or AWS Rekognition | `services/game/src/moderation.ts` |
| Shared rules & events | single source of truth | `packages/shared` |
| Wire protocol | typed messages | `packages/protocol` |

Non-negotiable invariants (location privacy, anonymity until mutual
consent, server authority, T&S) are in `CLAUDE.md`. Product decisions are
recorded in `docs/decisions/`.

## Quickstart

```bash
pnpm install
pnpm typecheck
pnpm --filter @tomatina/game-server smoke   # server end-to-end tests
pnpm mobile                                  # Metro + QR for Expo Go
pnpm --filter @tomatina/game-server dev      # local game server
```

Guides: `docs/TESTING.md` (device testing), `docs/DEPLOY.md` (Railway),
`docs/SUPABASE.md`, `docs/MODERATION.md`, `docs/METRICS.md` (kill gates).
