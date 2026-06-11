# SUPABASE — setup guide (Phase 2)

Supabase provides accounts (phone auth), the database (profiles, blocks,
reports, kill-gate events), and object storage. One free project covers the
beachhead experiment.

## 1. Create the project (founder, ~5 min)

1. **supabase.com** → Sign in with GitHub.
2. **New project**:
   - Organization: your default one.
   - Name: `tomatina`.
   - Database password: pick a strong one and **save it somewhere safe**
     (you rarely need it, but losing it is painful).
   - Region: **West EU** (closest to the beachhead).
3. Wait ~2 minutes while it provisions.

## 2. Create the tables (copy-paste, ~2 min)

1. Left sidebar → **SQL Editor** → **New query**.
2. Open `supabase/migrations/0001_init.sql` from this repo, copy ALL of it,
   paste, **Run**.
3. Expected result: "Success. No rows returned". The **Table Editor** now
   shows `profiles`, `blocks`, `reports`, `events`.

## 3. Collect the keys

Left sidebar → **Project Settings** → **API**:

| Key | Where it goes | Sharable? |
|---|---|---|
| Project URL (`https://xxxx.supabase.co`) | mobile `.env` + Railway variable | yes |
| `anon` / publishable key | mobile `.env` (`EXPO_PUBLIC_SUPABASE_ANON_KEY`) | yes — it is designed to be public; RLS does the protecting |
| `service_role` / secret key | **Railway → Variables only** (`SUPABASE_SERVICE_ROLE_KEY`) | **NO — never paste it in chat, commits, or the app.** It bypasses all security rules |

Railway variables to add (service → **Variables** → New):
- `SUPABASE_URL` = the Project URL
- `SUPABASE_SERVICE_ROLE_KEY` = the service_role key

Mobile `.env` additions:
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 4. Phone auth (later, before the beachhead)

Supabase phone login sends SMS through a provider (Twilio etc.) that costs
per message. For development we use Supabase's **test phone numbers**
(Authentication → Providers → Phone → "Test OTPs"): fake numbers with a
fixed code, zero SMS cost. Real SMS gets configured right before the soft
launch.

## What the schema enforces (summary)

- `profiles`: anonymous by default (`avatar_seed`); `display_name`/`photo`
  exist but are unreadable by other users — reveal is mediated server-side
  after mutual consent. 18+ flag and ban timestamp included.
- `blocks`: a user manages only their own block list; the matchmaker
  (server) reads all of it to exclude pairs (invariant 3).
- `reports`: write-only for clients.
- `events`: server-only kill-gate events — clients can neither read nor
  write analytics.
- **No precise location anywhere in Postgres** (invariant 1): presence and
  coordinates stay in Redis, ephemeral, server-side.
