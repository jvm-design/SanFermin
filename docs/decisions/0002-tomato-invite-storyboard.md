# 0002 — "Tomato as invitation" storyboard: what we adopt, what we adapt

Date: 2026-06-12. Source: founder storyboard after first on-device Phase 0
session ("très fun").

## The storyboard (as imagined)

Strangers in a public place have presence open for battle. One receives a
notification: "someone threw a tomato at you". They open the app in AR
camera mode, are *directed toward* the thrower, *visually identify* them,
a 10…3-2-1-GO countdown runs, and the battle starts.

## Adopted (and when)

1. **Throw-a-tomato as the battle invitation.** Phase 2's battle initiation
   will be framed as an incoming tomato splat from an anonymous avatar, not
   a generic "X wants to battle" dialog. On-brand, playful, and compatible
   with the invariants as long as the thrower stays an anonymous avatar and
   initiation is rate-limited + block/report applies (invariants 2, 3, 5).
2. **Pre-battle countdown (3-2-1-GO).** Implemented now in practice mode
   (client-side). For online battles it must be server-driven (a
   "countdown" room phase with a shared deadline) so both clients unlock
   simultaneously — protocol change scheduled with Phase 2 work.
3. **Presence opt-in in public places** — already the Phase 2 plan.

## Adapted: no pre-battle identification of a physical person

The "AR finder pointing at the thrower + visual identification before the
battle" beat is NOT adopted as imagined, for two reasons:

- It violates invariants 1 and 2: clients never receive another user's
  precise location, and identity stays hidden until mutual post-battle
  consent. Pointing a camera finder at a specific body in a room IS
  precise location plus identification, before any consent gate.
- Safety: a finder that physically locates a specific stranger on demand
  is a stalking/harassment vector (and the reason the consent gates exist).

**The adapted magic moment:** you know the challenge comes from someone *in
this zone* ("quelqu'un dans ce bar t'a jeté une tomate"). The battle stays
anonymous avatars. THE reveal happens after the round, by mutual consent —
and that's when the room scan happens: "find the person grinning at their
phone". Optionally (Phase 2+, post-reveal only): both phones can display a
matching beacon (same color/emoji pair) so the two players can find each
other physically — identification as a *consensual reward*, not an opener.

AR camera rendering itself stays deferred to Phase 3 per the MVP scope.
