# Deploying Tien Len Showdown to Vercel

This guide deploys the game to Vercel using the **free `*.vercel.app` URL** —
no custom domain, no DNS, no Vercel Pro, no Stripe, no auth provider.

---

## 1 · Prerequisites

- A free [Vercel](https://vercel.com) account.
- A free [Supabase](https://supabase.com) project (the migration fits the free tier easily).
- This repo, either pushed to GitHub or available locally.
- Node 18+ on your machine (only needed if you deploy via the CLI).

That's it. No card on file, no domain, no API keys to buy.

---

## 2 · Supabase project setup

1. Open <https://supabase.com> → **New project**.
2. Pick a name, region, and a strong DB password. Wait ~1 min for it to finish provisioning.
3. From the left sidebar, open **SQL Editor** → **New query**.
4. Paste the contents of [`supabase/migrations/0001_showdown.sql`](./supabase/migrations/0001_showdown.sql) and run it.
   This creates 4 tables (`rooms`, `room_players`, `room_state`, `room_events`),
   enables RLS, and adds the three public tables to the Realtime publication.
5. (Optional) Schedule a daily cleanup of expired rooms via **Database → Functions**:
   ```sql
   delete from public.rooms where expires_at < now();
   ```

### Get your keys (Settings → API)

You need **three** values:

| Vercel env var | Where to find it in Supabase | Visible to browser? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | yes (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project API Keys → `anon` | yes (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Project API Keys → `service_role` | **no — server only** |

⚠ **Never put `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_*` variable, in client
components, in committed code, or anywhere a browser can see it.** This repo only
reads it from `src/lib/supabase/service.ts`, which is marked `import 'server-only'`
so accidental client imports throw at build time.

### Verify Realtime is enabled

Settings → API → Realtime should list `rooms`, `room_players`, `room_events`
under "Tables enabled for Realtime". The migration adds them automatically —
verify in **Database → Replication → `supabase_realtime` publication**.

---

## 3 · Environment variables

| Name | Required? | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | **yes** | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **yes** | Public anon key (used by browser Realtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | Server-only key for state writes |
| `NEXT_PUBLIC_SITE_URL` | optional | e.g. `https://tien-len-showdown.vercel.app`. Used only for metadata; invite links use `window.location.origin` at runtime, so leaving this blank still produces correct links. |

`.env.local` for local dev mirrors the same three required vars. See
[`.env.example`](./.env.example).

---

## 4 · Local build check (do this before pushing)

```bash
npm install
npm test            # 34/34 should pass
npm run typecheck   # 0 errors
npm run build       # 0 errors
npm start           # smoke the production bundle on http://localhost:3000
```

If `npm run build` succeeds locally, Vercel will succeed.

---

## 5 · Deploy via Vercel dashboard

1. Push the repo to GitHub.
2. <https://vercel.com/new> → **Import** the repo.
3. **Framework Preset**: Vercel auto-detects **Next.js** — leave defaults.
   - Build Command: `next build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)
   - Node version: 18.x or 20.x (default)
4. Expand **Environment Variables** and add the three vars from §3.
   Apply each to **Production, Preview, and Development**.
5. Click **Deploy**.
6. When it finishes, Vercel gives you a URL like
   `https://tien-len-showdown-<hash>.vercel.app`. The shortest one,
   `https://<project-name>.vercel.app`, is your stable production URL —
   **that's your invite-link prefix**.

That's the whole deploy. No domain configuration, no DNS, no extra steps.

---

## 6 · Deploy via Vercel CLI

```bash
npm i -g vercel
vercel login

# from the project root
vercel link                 # creates .vercel/ — pick an existing project or "Yes" to create new
vercel env add NEXT_PUBLIC_SUPABASE_URL          production preview development
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY     production preview development
vercel env add SUPABASE_SERVICE_ROLE_KEY         production preview development
# optional:
vercel env add NEXT_PUBLIC_SITE_URL              production preview development

vercel              # builds + deploys a preview URL
vercel --prod       # promotes to your *.vercel.app production URL
```

---

## 7 · Finding your free `*.vercel.app` URL

In the Vercel dashboard:

- Open the project.
- The header shows the **Production** URL — that's `https://<project>.vercel.app`.
- Every push to `main` redeploys that URL.
- Every PR / branch push also gets a unique preview URL — fine for testing, but
  share the production URL with friends so links don't break across deploys.

No DNS, no domain, no records to add. Vercel handles `*.vercel.app` TLS for you.

---

## 8 · How invite links work in production

The room page is `/room/[CODE]`. The invite-link box renders the URL at runtime
using `window.location.origin`, so on Vercel you get:

```
https://<project>.vercel.app/room/BLAZE7
```

…and on localhost you get `http://localhost:3000/room/BLAZE7`. No hard-coded
domain anywhere — open the URL bar of the deployment and that's the invite.

---

## 9 · End-to-end test on the deployed site

Visit `https://<project>.vercel.app` and:

1. **Home loads** with the "TIEN LEN SHOWDOWN" arcade hero.
2. Click **CREATE ROOM**, enter a display name (≤ 20 chars).
3. You're redirected to `/room/<CODE>` and see the **WAITING ROOM**.
4. Click **Copy invite** — it should copy `https://<project>.vercel.app/room/<CODE>`.
5. Open the copied URL in **another browser** (or incognito window) on the same or different device.
6. Enter a second display name in that browser → land in the same waiting room.
7. Both players see each other's name appear within ~2 seconds (Supabase Realtime).
8. Both pick a seat. The seat picker updates live in both windows.
9. The **host** clicks **START SHOWDOWN** — both windows show the
   READY? → SHOWDOWN! intro, then the table.
10. Take turns — the **YOUR TURN** slam animation fires on every turn flip.
11. When someone empties their hand, both windows see the **K.O.** overlay.
12. Host clicks **Play again** → back to the waiting room with seats preserved.

If any step doesn't work, see §11 below.

---

## 10 · Local checklist (before deploying)

- [ ] `npm install` succeeds.
- [ ] `npm run build` succeeds.
- [ ] `npm test` shows 34/34 passing.
- [ ] `npm run dev` boots and `http://localhost:3000` shows the landing page.
- [ ] Creating a room locally redirects to `/room/<CODE>` and a row appears in `public.rooms`.

---

## 11 · Common deploy errors and fixes

| Symptom | Fix |
| --- | --- |
| Build fails with `Supabase service-role env vars missing` during prerender | You forgot to add `SUPABASE_SERVICE_ROLE_KEY` to Vercel env vars. The home + room pages are client components and don't read it at build time, but the API route `/api/room/[code]/state` does. Add the var and redeploy. |
| Browser console: `WebSocket connection to 'wss://.../realtime/v1/websocket' failed` | Realtime publication is missing the tables. Re-run the publication grants from the migration: `alter publication supabase_realtime add table public.rooms, public.room_players, public.room_events;` |
| Invite link copies `http://localhost:3000/...` from a deployed site | Impossible by construction — the box uses `window.location.origin`. If you see this, you visited the wrong URL. Re-open the Vercel URL and try again. |
| `Cannot find module 'server-only'` at build | Run `npm install` to refresh the lockfile. It ships with Next 14. |
| `403` from `/api/room/[code]/state` | The caller's `playerId` isn't in `room_players` for that room. Visit the home page, **Create Room** again, copy the new link. |
| Production build shows "Module not found: 'react-dom/client'" | You bumped React versions. This project pins React 18.3.1. Run `npm install react@18.3.1 react-dom@18.3.1` and rebuild. |
| Vercel deploy succeeds but the page is 500 | Check the Vercel Logs for the function — typically a missing env var. |

---

## 12 · What's intentionally **not** in this deploy

- No login / accounts / OAuth.
- No payments / Stripe / cosmetics shop.
- No ranking / leaderboard / Elo.
- No always-on game server — Supabase Realtime + Vercel serverless is the whole backend.
- No custom domain. Free `*.vercel.app` URL is the supported deploy target.

If you later want any of the above, the codebase is structured to extend:
the rules engine in `src/game/rules/` is pure TS, and every server mutation is
isolated behind `src/server/rooms/service.ts` plus the `/api/rooms/*` route handlers.

---

## 13 · Seat click does nothing - how to debug

1. Open the deployed room page in Chrome DevTools.
2. Click an empty seat and inspect `POST /api/rooms/<ROOM_CODE>/sit`.
3. The request body must include:
   - `playerId`
   - `displayName`
   - `seatIndex`
4. The response must be structured JSON:
   - success: `{ "ok": true, "data": ... }`
   - error: `{ "ok": false, "error": "...", "code": "..." }`
5. If the sit write succeeds but the UI still shows an empty seat, inspect `GET /api/rooms/<ROOM_CODE>/state`.
   The seated player must appear in `players` and in the four-slot `seats` array.
6. In the browser console, inspect `localStorage["tls.session"]`.
   It must contain the same anonymous `playerId` across refreshes plus the player's `displayName`.
7. In Vercel, verify these env vars are set for Production, Preview, and Development:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
8. In Supabase, verify [0002_room_player_seat_index.sql](./supabase/migrations/0002_room_player_seat_index.sql) has been applied so only non-null seats are unique per room.
9. If writes work but reads look stale, redeploy after confirming the server is using the latest [service.ts](./src/lib/supabase/service.ts) with `cache: 'no-store'` on the service-role client.
