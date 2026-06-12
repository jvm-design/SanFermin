# METRICS — reading the kill gates

Both gates are computed from the raw `events` table in Supabase. Paste
these in Supabase → SQL Editor whenever you want a reading. They decide
the project (CLAUDE.md): check them weekly during the beachhead.

## Liquidity gate — battles started per active session

> Can the loop spin? Target: a clear majority of sessions lead to at least
> one battle.

```sql
select
  date_trunc('day', ts) as day,
  count(*) filter (where name = 'active_session')  as sessions,
  count(*) filter (where name = 'battle_started')  as battles,
  round(
    count(*) filter (where name = 'battle_started')::numeric
    / nullif(count(*) filter (where name = 'active_session'), 0), 2
  ) as battles_per_session
from events
group by 1
order by 1 desc;
```

## Thesis gate — mutual reveals per completed battle

> Does play-first matching create connection? Target: a meaningful share
> of completed battles end in a mutual chat opt-in.

```sql
select
  date_trunc('day', ts) as day,
  count(*) filter (where name = 'battle_completed')    as completed,
  count(*) filter (where name = 'reveal_proposed')     as proposed,
  count(*) filter (where name = 'mutual_chat_opt_in')  as mutual,
  round(
    count(*) filter (where name = 'mutual_chat_opt_in')::numeric
    / nullif(count(*) filter (where name = 'battle_completed'), 0), 2
  ) as mutual_per_completed
from events
group by 1
order by 1 desc;
```

## Bonus reads

Match distances (tune the GPS buffer, decision 0005):

```sql
select (props->>'distanceM')::int as distance_m, count(*)
from events
where name = 'battle_started' and props->>'source' = 'plaza'
group by 1 order by 1;
```

Drop-off funnel over the last 7 days:

```sql
select name, count(*)
from events
where ts > now() - interval '7 days'
  and name in ('active_session','battle_started','battle_completed',
               'reveal_proposed','mutual_chat_opt_in','reveal_passed',
               'battle_abandoned')
group by 1 order by 2 desc;
```
