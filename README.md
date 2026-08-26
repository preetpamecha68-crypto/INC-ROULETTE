# INC ROULETTE

A casino-styled, real-time multiplayer roulette game for **INC — The Corporate Club**, using club officers instead of numbers/red/black.

- Up to 5 players per table, 500 INC points each
- 11-pocket board: 10 officers (Team Tamanna vs Team Avyukt) + a Wildcard house pocket
- Full roulette-style bet tiers: Straight (9:1), Split (4:1), Corner (2:1), Team (1:1)
- Auto-spins once everyone locks in bets, with a full wheel animation and confetti
- Points reset every session — no server database, nothing persists on restart

## Running it locally

```bash
npm install
npm start
```

Then open `http://localhost:3000` in a few browser tabs to test multiplayer locally.

## Deploying with GitHub + Render (no other services needed)

**1. Push this project to GitHub**

```bash
git init
git add .
git commit -m "INC Roulette"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/inc-roulette.git
git push -u origin main
```

(Create the empty repo on GitHub first if you haven't — github.com → New repository.)

**2. Connect it to Render**

1. Go to [render.com](https://render.com) and sign in (you can sign in directly with GitHub).
2. Click **New +** → **Web Service**.
3. Select your `inc-roulette` GitHub repo.
4. Render should auto-detect Node — otherwise set these manually:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free is fine to start.
5. Click **Create Web Service**. Render will build and deploy automatically — you'll get a live URL like `https://inc-roulette.onrender.com`.

That's it — every time you `git push` to `main`, Render redeploys automatically.

**Heads up on the free tier:** Render's free web services spin down after 15 minutes of no traffic, so the first person to open the link after a quiet spell will see a ~30-second cold start while it wakes up. Totally fine for casual club use — just don't be alarmed if the first load is slow.

## Project structure

```
inc-roulette/
├── server.js          # Express + Socket.io backend — rooms, betting, spin logic
├── package.json
├── public/
│   ├── index.html      # entry / lobby / game screens
│   ├── style.css        # casino navy & gold theme
│   ├── game.js           # client logic — board, wheel animation, betting UI
│   └── assets/images/     # member photos, wildcard photo, club logo
└── README.md
```

## How the board works

The 10 officers sit in a 2×5 grid:

```
Tamanna   Lavina   Mihir   Motabhai  Sonchita     (Team Tamanna)
Avyukt    Priyanshu Arya   Branson   Lakshya      (Team Avyukt)
```

Bet types mirror real roulette, adapted to the grid:
- **Straight** — any 1 pocket (including the Wildcard)
- **Split** — 2 pockets that share an edge (horizontally or vertically adjacent)
- **Corner** — 4 pockets forming a 2×2 block
- **Team** — an entire row (all 5 of Team Tamanna or Team Avyukt)

The **Wildcard** pocket can only be bet on straight-up — like the green 0 on a real wheel, it can't join split/corner/team bets, and it's what gives the house its edge.
