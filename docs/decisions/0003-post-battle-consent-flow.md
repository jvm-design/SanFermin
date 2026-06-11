# 0003 — Post-battle flow: winner initiative, kind decline, rematch

Date: 2026-06-12. Source: founder storyboard, session 2.

## Winner initiative, mutual consent

The winner of a round holds the initiative on the post-battle moment: they
choose between proposing reveal+chat, asking a rematch, or passing kindly.
The loser then accepts or declines.

This does NOT weaken invariant 3: reveal and chat still require BOTH sides
to say yes. Winning earns the right to *ask first*, never the right to
obtain. Rationale: it gives the battle stakes (you fight for the initiative),
which should feed both kill gates — more battles per session (liquidity) and
a meaningful reveal proposal (thesis).

## Kind decline ("friendly pass")

Declining is never a silent rejection: the decliner sends a canned,
anonymous, one-shot message ("that was fun — I'd rather just play, throw
another tomato at me sometime"). Softening the "no" is core to the social
loop of an app where most encounters should end without a chat and still
feel good.

Phase 2 implementation constraints:
- Canned messages only — no free text before mutual reveal (anti-harassment).
- One-shot, attached to the round, rate-limited server-side.
- Decliner stays anonymous.

## Rematch

Both sides can propose a rematch while staying anonymous. Phase 0/1 mock:
rematch simply restarts the same mode (practice, or rejoining the same room
code online). Phase 2: a real rematch handshake inside the room before it
disposes.

## Status

Mocked client-side in build 7 (practice + online flows share the screens).
The authoritative version (who really won, proposal relay, canned-message
delivery) is server work scheduled with Phase 2.
