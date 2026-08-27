# INC Roulette

A multiplayer, virtual-points roulette game for the INC Corporate Club. Players create/join a room with a code, up to 5 players per room, receive 1,000 virtual chips, bet on one of 10 names or the WILD CARD, and the host spins the shared wheel.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000` in a browser. For friends on the same Wi-Fi, use your computer's local IP address and port 3000.

## Deploy

Works on Node hosting such as Render. Build command: `npm install`. Start command: `npm start`.

## Game rules

- 1–5 players per room.
- Everyone starts with 1,000 virtual chips.
- Minimum bet: 10 chips.
- A winning bet pays 11× the stake, including the original stake.
- Only the room host can spin.
- The server selects the winning slot, so every connected player sees the same result.
- No real-money betting is implemented.
