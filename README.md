# Rock Paper Scissors — Duel Arena

A Rock Paper Scissors game with animated effects, a 7-second decision timer, tournament modes, streak-based commentary, and real-time online multiplayer (no backend server required).

## Features

- **Classic vs Computer** mode with persistent score (localStorage)
- **Online Multiplayer** — connect two browsers directly via a 6-character room code (WebRTC via PeerJS)
- **Player Profiles** — custom name + photo upload or emoji avatar
- **7-Second Timer** — decide fast or auto-lose the round
- **Tournament Modes** — Best of 3 / 5 / 7 / 11, custom round count, or Endless
- **Tournament Summary** — winner, final score, longest win/loss streak, average decision time
- **Streak Commentary** — dynamic reactions on winning/losing streaks
- **Visual Effects** — shake, glow, screen-shake, confetti on win

## Files

| File         | Purpose                         |
|--------------|----------------------------------|
| `index.html` | Structure and screens            |
| `style.css`  | Styling, layout, animations      |
| `script.js`  | Game logic, timer, multiplayer   |

## Run Locally

1. Clone or download this folder.
2. Open `index.html` with **Live Server** (VS Code extension) — required for online multiplayer to work correctly.
3. Set up your profile, pick a mode, and play.

## Play Online with a Friend

1. Choose **Play Online with a Friend**.
2. Pick a match length.
3. One player clicks **Host Game** and shares the generated code.
4. The other player clicks **Join Game** and enters that code.
5. Play — moves, scores, and rematch requests sync automatically.
