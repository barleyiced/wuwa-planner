# CLAUDE.md

Guidance for Claude Code (and humans) working in this repo.

## What this is

**WuWa Endstate Matrix Planner** — a fan-made planner for Wuthering Waves endgame
team comps. Users build up to 20 teams of 3 resonators, assign each resonator a
weapon, and track a weapon inventory. The core rule: a weapon may be equipped on
only as many resonators as the user owns copies of it.

Static SPA, no backend. Vite + React 18 + TypeScript (strict) + Tailwind v4.
All state lives in the browser's `localStorage`.

## Commands

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # tsc -b (strict typecheck) then vite build -> ./dist
npm run preview  # serve the production build
```

There are no tests or linters configured. `npm run build` is the gate — it runs a
strict `tsc` first, so a green build means types are sound. Run it before claiming
a change works.

## Architecture

Two top-level tabs (Teams, Inventory) rendered by [src/App.tsx](src/App.tsx), which
also owns data loading and the import/export/reset menu.

- **[src/game.ts](src/game.ts)** — game data layer. Types (`Character`, `Weapon`,
  `GameData`), display maps (`ELEMENTS`, `WEAPON_TYPES`, `RARITY`), the `iconUrl`
  helper, and `loadGameData()`. Has **no React** — pure data.
- **[src/store.ts](src/store.ts)** — the `usePlan()` hook: all planner state
  (`inventory`, `teams`) plus every mutation and the derived `usage` (weapon
  allocation). This is the single source of truth for user data. `PlanApi` is its
  return type, threaded into components as the `plan` prop.
- **[src/components/](src/components/)** — presentational pieces:
  `TeamsPanel` (+ inline `TeamCard`/`Slot`), `InventoryPanel`, the `CharacterPicker`
  and `WeaponPicker` modals, the reused `WeaponRow`/`Stepper`, icon primitives in
  `Icon.tsx`, and `Modal.tsx`.

State flows one way: `App` creates `plan = usePlan()` and `data` (GameData), and
passes both down. Components never hold planner state of their own — only local UI
state (search text, which modal is open). Add new mutations to `usePlan`, not to
components.

## Data & assets pipeline (non-obvious — read before touching `game.ts`)

There is **no bundled dataset**. Resonators, weapons, and icons come from the
community CDN `static.nanoka.cc` (a mirror of hakush.in) at runtime:

1. `GET /manifest.json` → read `ww.latest` for the current game version
   (falls back to `PINNED_VERSION` if unreachable).
2. `GET /ww/<version>/character.json` and `/ww/<version>/weapon.json` — objects
   keyed by id. The result is normalized and cached in `localStorage` under
   `wwem.gamedata.v1` (keyed by version, so a new game version refetches).
3. **Icon URLs** are derived from the in-game asset path on each entry's `icon`
   field. The transform (mirrors the source site's own logic):
   `iconUrl(path) = ${CDN}/assets/ww/${path.replace("/Game/Aki/UI/","").split(".")[0]}.webp`
   The CDN serves these as `image/webp` with `Access-Control-Allow-Origin: *`.

The `ELEMENTS` (1–6) and `WEAPON_TYPES` (1–5) id maps were derived by sampling the
dataset; a character's `weapon` field equals the `type` of compatible weapons, which
is how the weapon picker filters.

## Conventions

- Strict TypeScript, no `any`. Keep `game.ts` React-free.
- Tailwind v4 utility classes; theme tokens (`--color-bg`, `--color-panel`,
  `--color-edge`, etc.) are defined in [src/index.css](src/index.css) via `@theme`.
- Persisted shapes are versioned by their storage key suffix (`wwem.plan.v1`,
  `wwem.gamedata.v1`). **If you change a persisted shape, bump the key** and
  consider migration — users have saved plans in their browsers.
- Pickers and the inventory share `WeaponRow`; reuse it rather than duplicating
  weapon-row markup.

## Deployment

Static build deployed to **Vercel** (auto-detected Vite app, output `dist`). No env
vars, no server. See [README.md](README.md) for the dashboard and CLI flows.

## Releasing / changelog

This project keeps a [CHANGELOG.md](CHANGELOG.md) (Keep a Changelog + SemVer).
Every change goes under `## [Unreleased]`. On release: rename that section to the
new version + date, bump `version` in [package.json](package.json), update the
compare/release links, and start a fresh empty `[Unreleased]`. Current: **1.0.0**.
SemVer: patch = fixes, minor = backward-compatible features, major = breaking
(e.g. an incompatible `localStorage` format change).
