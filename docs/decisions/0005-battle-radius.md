# 0005 — Battle proximity radius: 20 m, hard cap

Date: 2026-06-12. Source: founder ("17,84 m ou 20 m pour faire l'arrondi" —
17.84 m is the radius of a 1000 m² circle). Status: specified for the
Phase 2 matchmaker; constants live in packages/shared.

## Rule

Two users are battle-eligible only if the server-computed distance between
their last position fixes is ≤ **BATTLE_RADIUS_M = 20 m**. This is the
storyboard promise: your opponent is *in this room / on this plaza*, close
enough to find each other after a mutual reveal.

It is a **hard cap**. On QUEUE_TIMEOUT_S with no one in radius, the app
surfaces a **tomato hour** (concentrate demand) instead of silently
widening the radius — a 200 m "nearby" battle breaks the core promise.
[revisit only with beachhead data if liquidity fails]

## GPS reality and the accuracy buffer

Phone positioning is noisier than 20 m: 5–20 m typical outdoors, worse
indoors (bars, cafés — exactly where this app lives), where fixes come
from Wi-Fi positioning. Two people at the same table can read 40 m apart.

Mitigation: the eligibility check uses each fix's reported horizontal
accuracy: `distance ≤ BATTLE_RADIUS_M + min(accA + accB,
GPS_ACCURACY_BUFFER_M)` with GPS_ACCURACY_BUFFER_M = 25 [validate in the
field]. We accept slightly-too-far matches over rejecting genuinely
co-located players: a false "too far" kills the magic moment; a false
"close enough" of 30 m is still the same venue.

## Privacy (invariant 1 intact)

- Precise coordinates exist **server-side only**, ephemeral (Redis,
  short TTL), written while presence is opted in, deleted on opt-out.
- Clients still only ever receive the coarse zone (geohash 6) and the
  "N active nearby" count — never distances, bearings, or coordinates of
  another user. A 20 m radius does not change what clients see; the
  distance check is a yes/no inside the matchmaker.
- The coarse zone remains the pre-filter (cheap candidate lookup); the
  20 m check runs on candidate pairs only.

## Implementation notes for Phase 2

- Haversine on the candidate pair is enough at this scale; no geo-index
  needed inside a zone.
- Store (lat, lng, accuracy, updatedAt) per opted-in user; reject fixes
  older than ~60 s from eligibility ("stale presence").
- Log distance + accuracies on every match decision (accepted and
  rejected) — needed to tune the buffer against real beachhead data.
