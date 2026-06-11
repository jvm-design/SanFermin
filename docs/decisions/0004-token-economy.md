# 0004 — Token economy (specified now, built in Phase 3)

Date: 2026-06-12. Source: founder, session 2. Status: **specified, NOT
built**. Monetization is out of MVP scope (CLAUDE.md); this records the
agreed design so Phase 3 can start from a settled spec.

## Rules

### Spending
- **Initiating** an online battle (throwing the invitation tomato) costs
  **1 token**. Receiving and accepting a challenge is free.
- Always free, never consumes tokens:
  - Practice vs bot (unlimited).
  - Rematch with the same opponent (encourages connection — the point of
    the app).
  - Initiating during a **tomato hour** (free initiation for everyone:
    concentrates demand exactly when density needs help).
- **Refund rule:** if no battle actually starts (queue timeout, no opponent
  found, room never reaches 2 players), the token is refunded. Players pay
  for battles, not for attempts.

### Earning
- Every **3 online battles won** earns **+1 token**.
- Anti-farm guard: wins against the same opponent count toward earning at
  most once per day [validate: exact limit], so two friends can't ping-pong
  tokens into existence.
- Practice wins never count.

### Allowance, cap, reset
- Free tier: **3 tokens renewed weekly**, held balance capped at **4**
  (earned tokens can fill up to the cap; no banking beyond it).
- Weekly reset semantics: every Monday 00:00 beachhead-local time,
  `balance := max(balance, weekly_allowance)`. The reset never takes tokens
  away and never stacks (no 3+3 carryover).

### Subscription tiers (weekly allowances)
| Price | Weekly tokens |
|---|---|
| 1 €      | 5 |
| 9.99 €   | 10 |
| 20 €     | unlimited for the week |

Subscribers follow the same reset semantics with their tier's allowance;
"unlimited" skips the wallet check entirely.

[validate before Phase 3: billing period (weekly vs monthly) and snapping
prices to the App Store / Play Store price tiers, e.g. 0.99 / 9.99 / 19.99.]

## Architecture constraints

- **Server-authoritative wallet (invariant 6).** Balances live in
  Supabase/Postgres; every mutation (spend, refund, earn, reset, grant)
  happens server-side in the Phase 2 matchmaker/initiation path. Clients
  only ever *display* the balance. A client-side balance is a rendering
  cache, never an input.
- All transactions are append-only ledger rows (user_id, delta, reason,
  battle_id, created_at) so balances are auditable and kill-gate analysis
  can correlate token friction with battle starts.
- **Payments reality:** tokens/subscriptions are digital goods ⇒ Apple and
  Google **require in-app purchase** (no Stripe/web checkout in-app),
  server-side receipt validation, store-defined price tiers, and a 15–30%
  platform cut. Budget Phase 3 time for store review.

## Kill-gate guard (the most important rule)

The whole system ships dark behind `TOKENS_ENABLED = false` in
`packages/shared` and **stays off during the beachhead experiment**.
Token-gating initiation throttles `battles_started per active_session` —
the liquidity kill gate that decides the project. Measuring the loop and
throttling the loop at the same time would make the data unreadable.
Enable only after the liquidity gate passes, and instrument token friction
(initiations blocked by empty wallet) from day one of activation.
