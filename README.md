# Sonic Speed Adventure

A fast, side-scrolling platformer built with React + Vite + TypeScript and HTML5 Canvas.
All art is drawn procedurally and all sound is synthesized with the Web Audio API (no external assets).

## Run locally
    npm install
    npm run dev        # http://localhost:5173
    npm run build      # type-check + production build into dist/
    npm run preview    # serve the production build

## Deploy to Vercel (via GitHub)
1. Push this folder to a GitHub repository.
2. In Vercel choose **Add New -> Project**, import the repo.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output directory `dist`.
4. Click **Deploy**.

## Controls
Arrow keys / A D move, Space / Up / W jump, Down / S roll, Esc pause. Touch buttons appear on phones and tablets.
