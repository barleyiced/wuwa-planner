# WuWa Endstate Matrix Planner

A fan-made planner for **Wuthering Waves** endgame (Tower of Adversity / Endstate
Matrix) team comps. Build up to **20 teams**, assign each resonator a weapon, and
track your **weapon inventory** — a weapon can only be equipped on as many
characters as you own copies of it.

- 🧩 Up to 20 teams, 3 resonators each, with per-character weapon assignment
- 🗡️ Weapon inventory with owned-copy counts; over-assignment is flagged live
- 🖼️ Real resonator head icons + weapon icons (community CDN, `static.nanoka.cc`)
- 💾 Everything saved to your browser's `localStorage`; export/import as JSON
- 🔌 No backend — a static SPA, ideal for Vercel

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build

```bash
npm run build    # outputs to ./dist
npm run preview  # serve the production build locally
```

## Deploy to Vercel

The repo is a standard Vite app, which Vercel detects automatically.

**Option A — dashboard:** push this repo to GitHub, then "Add New Project" on
[vercel.com](https://vercel.com) and import it. Defaults are correct
(Build Command `npm run build`, Output Directory `dist`).

**Option B — CLI:**

```bash
npm i -g vercel
vercel          # preview deploy
vercel --prod   # production deploy
```

## Data & assets

Resonator/weapon catalog and icons are fetched at runtime from
`static.nanoka.cc` (a mirror of hakush.in) and cached in `localStorage`. The
latest game version is resolved from the site manifest, falling back to a pinned
version if the manifest is unreachable. This project is not affiliated with Kuro
Games.
