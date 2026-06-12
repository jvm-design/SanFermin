# DEPLOY — game server on Railway

Goal: the Colyseus server runs on the internet so testers can battle from
anywhere, phones on any network. The repo root has a tested `Dockerfile`;
Railway builds and runs it. ~10 minutes, no terminal needed.

## One-time setup (founder)

1. Go to **railway.com** → **Login** → "Login with GitHub" (use the GitHub
   account that owns this repo).
2. **New Project** → **Deploy from GitHub repo** → pick
   **jvm-design/SanFermin**. Authorize Railway's GitHub access if asked.
3. In the service settings:
   - **Source → Branch**: select the working branch
     (`claude/magical-clarke-p36qus` for now, `main` later).
   - Railway auto-detects the `Dockerfile` at the repo root — nothing to
     configure for the build.
4. **Settings → Networking → Generate Domain**. Railway gives you a URL
   like `tomatina-production-xxxx.up.railway.app`. Copy it.
5. Wait for the deploy to turn green ("Success"). Logs should show
   `tomatina game server listening on :8080` (Railway injects PORT — the
   server reads it).

That's it. The server now redeploys automatically on every push to the
selected branch.

## Point the app at the deployed server

In `apps/mobile/.env` (one line, note **wss**, no port):

```
EXPO_PUBLIC_GAME_SERVER_URL=wss://<your-domain>.up.railway.app
```

Restart Metro (`Ctrl+C`, then `pnpm mobile`) and rescan the QR. "Battle
online" now works for any phone with the Expo Go app and the QR — any
network, including 4G/5G.

## Bot opponent against the deployed server

```bash
GAME_SERVER_URL=wss://<your-domain>.up.railway.app pnpm --filter @tomatina/game-server bot SPLAT
```

## Optional service variables (Railway → Variables)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | accounts, blocks/reports, kill-gate events |
| `STREAM_API_KEY` + `STREAM_API_SECRET` | hosted chat after mutual reveal (getstream.io → create app → copy key & secret). Without them, reveal works and the chat falls back to local-only |

## Notes

- TLS (wss://) is handled by Railway's edge — nothing to configure.
- Free/hobby tier is fine for testing; the server is a single small Node
  process. Watch usage before inviting many testers.
- `SIMULATE_LATENCY_MS` works there too (Variables tab) for latency
  drills, but real-world distance already adds latency — measure first.
- Fly.io works as an alternative with the same Dockerfile (`fly launch`),
  but requires their CLI; Railway is the no-terminal path.
