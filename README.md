# Tien Len Showdown

A fast, free, invite-only **Tiến Lên** card battle for the browser.

**🎮 Play now → <https://tien-len-showdown.vercel.app>**
**📦 Repo → <https://github.com/idoodis/tien-len-showdown>**

- **No accounts.** Just pick a display name.
- **No payments, no economy.** Cosmetic-free, ad-free, ledger-free.
- **Invite-only rooms.** Share a six-letter code or link with friends.
- **Dramatic Street Fighter–style turn announcements**, neon arena aesthetic.
- **Deploys to Vercel** with a single Supabase project. Free-tier friendly.

---

## Tech stack

- **Next.js 14** App Router · TypeScript · Tailwind · Framer Motion
- **Supabase** Postgres + Realtime (no Supabase Auth — players are anonymous)
- **Zustand** for local settings / session
- **Vitest** for the rules engine + projection tests

## Local development

```bash
npm install
cp .env.example .env.local       # fill in Supabase keys
# apply the migration (see Supabase setup below)
npm run dev
npm test
```

Visit <http://localhost:3000>, click **Create Room**, pick a name, and you're in.

## Deploy to Vercel (free `*.vercel.app` URL)

```bash
npm i -g vercel
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL          production preview development
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY     production preview development
vercel env add SUPABASE_SERVICE_ROLE_KEY         production preview development
vercel --prod
```

No custom domain required. Invite links use `window.location.origin` at runtime,
so they automatically take the form `https://<project>.vercel.app/room/<CODE>`
once deployed. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full guide,
including dashboard deployment, Supabase setup, and troubleshooting.

## Required environment variables

| Variable | Used in | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | public anon key (Supabase Realtime uses this) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | grants writes to room state. Never expose to the browser. |
| `NEXT_PUBLIC_APP_URL` | optional | e.g. `https://tien-len-showdown.vercel.app` |

## Supabase setup

1. Create a project at <https://supabase.com>.
2. Open the SQL editor and run `supabase/migrations/0001_showdown.sql` (the file is also embedded in the source).
3. Copy the project URL, anon key, and service-role key into `.env.local`.
4. (Optional) Schedule a cron in the Supabase dashboard to delete expired rooms:
   ```sql
   delete from public.rooms where expires_at < now();
   ```

## How to play

1. Visit the site.
2. Click **CREATE ROOM**, pick a display name → you'll land in `/room/[CODE]`.
3. Copy the invite link from the top of the page.
4. Send it to friends. They paste it, pick a name, and walk in.
5. Each player picks a seat.
6. Once 2–4 are seated, the host clicks **START SHOWDOWN**.
7. Cards deal. Dramatic turn callouts. Last hand standing wins.
8. Host clicks **Play again** to reset to the lobby.

See `/rules` in the app for the full rules of Tiến Lên.

## How invite links work

Rooms are identified by a six-character code (e.g. `BLAZE7`). The code is also
the URL: `/room/BLAZE7`. Anyone with the URL can join — there's no password.
Rooms auto-expire after 24 hours.

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import into Vercel.
3. Set the env vars from the table above.
4. Deploy. Your URL will be `https://<project>.vercel.app` — that's the invite link prefix.

No custom domain required. No always-on backend required.

## Architecture

```
┌──────────────────────────┐         ┌──────────────────────────┐
│  Next.js on Vercel       │         │  Supabase                │
│  • Pages & components    │ ── ws ▶│  • Postgres              │
│  • Server actions        │         │  • Realtime publication  │
│    (authoritative)       │         │  • RLS                   │
│  • /api/room/[code]/state│         └──────────────────────────┘
└────────────┬─────────────┘
             │   anon key (browser, Realtime subscribe)
             │   service-role key (server actions, writes)
             ▼
   src/server/actions/room.ts
   ├── createRoomAction     ── inserts rooms / room_state / room_players
   ├── joinRoomAction       ── upserts room_players
   ├── sitAction / standAction
   ├── startGameAction      ── runs rules engine startGame(), persists state
   ├── playAction / passAction
   │     └── runs applyMove() in src/game/rules/engine.ts
   ├── queueMoveAction      ── validates with validateQueuedMove(), persists
   ├── leaveRoomAction      ── promotes next host if needed
   └── playAgainAction      ── resets room to lobby
```

The browser subscribes to `room_players` and `room_events` over Supabase
Realtime. Every event re-fetches `/api/room/[code]/state` — that route returns
the **public projection** of the table state plus *only the caller's own hand*.
Hidden hands never appear in the realtime payload.

## Fair play without accounts

This is an invite-room game with no auth, so true anti-cheat is impossible.
What we do enforce:

- All moves go through `applyMove()` in the rules engine on the **server** —
  the client can request a play, but the server decides if it's legal.
- Other players' hands are never broadcast. The client sees opponent **counts**
  only.
- Each player's own hand is fetched only via `/api/room/[code]/state?playerId=…`
  *and* the route refuses to return it unless the caller is currently seated in
  that room.
- Room codes use a 30-letter alphabet × 6 characters → roughly 700M
  combinations. Hard enough to make brute-force guessing impractical, easy
  enough to type.

**Known limitations (intentional):**

- Anyone who copies a player's `playerId` from `localStorage` could
  impersonate them. Since this is an invite-only friend game, we trade
  perfection for simplicity.
- No moderation / kick — the host can `Leave` and a new host is auto-promoted,
  but there's no boot-from-room button yet.

## How tests are organized

```
tests/
  rules/
    deck.test.ts        deck construction, deterministic shuffle, sort
    combos.test.ts      single / pair / triple / straight / pair seq / bomb
    compare.test.ts     beats() incl. bomb hierarchy
    engine.test.ts      startGame, applyMove, validateQueuedMove
  projection.test.ts    public-state redaction
```

Run with `npm test`. Run a single file with `npm test -- tests/rules/combos.test.ts`.

## Future upgrade paths

- **Add real accounts** — drop Supabase Auth in, swap `player_id text` for
  `uuid references auth.users`, surface it everywhere. The rest of the app
  doesn't care: the rules engine is pure.
- **Dedicated realtime server** — the server actions already isolate every
  state mutation behind one entry point. To move the loop off Vercel, point
  those actions at an HTTP RPC on Fly.io / Railway running the same
  `applyMove()` and broadcast via Supabase Realtime / Socket.io.
- **Ranked play** — the engine already returns finishing order and seats;
  bolt an Elo update step onto the `game_over` branch of `mutateState()`.

## File map

```
src/
  app/
    page.tsx                  landing (create / join)
    room/[code]/page.tsx      room page
    rules/page.tsx
    settings/page.tsx
    api/room/[code]/state/    secure state endpoint
  components/
    cards/                    PlayingCard / Hand / PlayedPile
    game/                     PlayerSeat
    room/                     InviteLinkBox / DisplayNameModal / SeatPicker
    animations/               TurnAnnouncement / ShowdownIntro / WinnerOverlay
  features/
    player-session/           localStorage-backed anonymous identity
    realtime/                 useRoomChannel hook
    room/                     RoomClient + GameTableView
    settings/                 Zustand settings store
  game/
    rules/                    pure rules engine (kept from earlier build)
    state/projection.ts       public-state sanitization
  server/
    actions/room.ts           authoritative room actions
    validation/inputs.ts      zod schemas
  lib/
    supabase/{client,service}.ts
    sound/                    cue stub
    utils.ts
supabase/
  migrations/0001_showdown.sql
tests/                        Vitest
```

## License

Add one before shipping.

## 2026 room flow update

The live room flow now uses explicit App Router JSON endpoints for all writes:

- `POST /api/rooms/create`
- `POST /api/rooms/[roomCode]/join`
- `POST /api/rooms/[roomCode]/sit`
- `POST /api/rooms/[roomCode]/leave-seat`
- `POST /api/rooms/[roomCode]/start`
- `POST /api/rooms/[roomCode]/play`
- `POST /api/rooms/[roomCode]/pass`
- `POST /api/rooms/[roomCode]/play-again`

The authoritative room logic lives in [service.ts](/C:/Users/syeds/Desktop/Tien-Len-Game/src/server/rooms/service.ts:1), and the browser now refetches [state](/C:/Users/syeds/Desktop/Tien-Len-Game/src/app/api/rooms/[roomCode]/state/route.ts:1) after every relevant room event.

## Seat click does nothing - how to debug

1. Open DevTools on the room page and click an empty seat.
2. Confirm `POST /api/rooms/<ROOM_CODE>/sit` is sent with `playerId`, `displayName`, and `seatIndex`.
3. Confirm the sit response is structured JSON:
   `{ "ok": true, "data": ... }` or `{ "ok": false, "error": "...", "code": "..." }`.
4. If the seat write succeeds but the UI does not change, inspect `GET /api/rooms/<ROOM_CODE>/state`.
   The seated player should appear in both `players` and `seats`.
5. Check `localStorage["tls.session"]` in the browser. It must contain a stable `playerId` and the current `displayName`.
6. Verify the server has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
7. Verify [service.ts](/C:/Users/syeds/Desktop/Tien-Len-Game/src/lib/supabase/service.ts:1) is only imported from server files.
8. Verify the seat uniqueness migration exists and has been applied:
   [0002_room_player_seat_index.sql](/C:/Users/syeds/Desktop/Tien-Len-Game/supabase/migrations/0002_room_player_seat_index.sql:1).
