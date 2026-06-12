# 0006 — Plaza: presence + matchmaking, in-memory for the beachhead

Date: 2026-06-12. Status: implemented (build 11 / server).

## Design

One global Colyseus "plaza" room holds opt-in presence and runs the
matchmaker:

- Clients join with their Supabase token (account REQUIRED when Supabase is
  configured — this is where the hard 18+ gate bites) and stream their own
  position (~10 s / 10 m, throttled server-side to 3 s).
- The server keeps positions in room memory only. Clients receive exactly
  two things: their coarse geohash-6 zone and "N active nearby". No
  coordinates, distances, or bearings ever go to a client (invariant 1).
- Every 2 s the matchmaker scans fresh (< 60 s) unmatched presences in the
  same zone and pairs the first two within
  `BATTLE_RADIUS_M + min(accA + accB, GPS_ACCURACY_BUFFER_M)` (decision
  0005) that are not a blocked pair. It creates a battle room, reserves two
  seats (passing each player's own token so the battle re-authenticates
  them), and sends each client its reservation.
- Leaving the plaza room deletes the presence immediately: presence is
  instantly revocable, including by just closing the screen (invariant 3).
- battle_started events carry source=plaza, the matched distance, and the
  zone — the data needed to tune the radius buffer and read the liquidity
  gate per zone.

## Deviation from CLAUDE.md stack: Redis deferred

The locked stack says presence lives in Redis. The beachhead deployment is
a single Railway instance, where room memory IS the single source of truth
and Redis would add an account, a network hop, and failure modes without
changing behavior. The presence store is encapsulated inside PlazaRoom;
when we scale to multiple instances, a Redis-backed store (Upstash) slots
in behind the same room without touching the protocol or the client.
Revisit when: >1 server instance, or presence must survive server restarts.

## Known limits (accepted for the experiment)

- Zone-boundary blindness: two players 15 m apart straddling a geohash-6
  cell edge won't match (pre-filter is same-zone). Acceptable at beachhead
  density; fix is neighbor-cell pre-filtering, a contained change.
- Location spoofing: the server sanity-checks and rate-limits position
  updates but cannot prove physical presence. Mitigations (max-speed
  plausibility, attest APIs) are Phase 3 material; block/report is the
  immediate safety net.
- First-pair matching: no focus_signal or preference — the first two
  eligible players match. Fine until density makes choice meaningful.
