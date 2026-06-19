# Changelog

All notable changes to the **WuWa Endstate Matrix Planner** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **In-app "How to use" guide** — a step-by-step walkthrough (inventory, team
  building, weapon assignment, allocation warnings, backup/restore) available as its
  own **How to use** tab alongside Teams and Inventory.

<!-- Add more changes for the next release here. Suggested headings:
### Changed
### Fixed
### Removed
-->

## [1.0.0] - 2026-06-19

Initial release.

### Added

- **Team planner** — build up to 20 teams of 3 resonators each. Rename, reorder
  (up/down), duplicate, and delete teams.
- **Weapon inventory** — browse the full weapon catalog, search by name, filter by
  weapon type and rarity, and record how many copies of each weapon you own.
- **Weapon allocation tracking** — a weapon can only be equipped on as many
  resonators as you own copies. The weapon picker shows remaining free copies,
  disables equipping when none are free, and flags over-assignment in amber on both
  the team slot and the inventory summary.
- **Resonator & weapon icons** — real head icons and weapon icons loaded from the
  community CDN (`static.nanoka.cc`), with element accents and rarity framing.
- **Resonator picker** — search and filter by element, weapon type, and rarity.
- **Persistence** — teams and inventory are saved to the browser's `localStorage`.
- **Import / export** — download the full plan as JSON and load it back later.
- **Live game data** — resonator/weapon catalog is fetched at runtime and the latest
  game version is resolved from the site manifest (falls back to a pinned version),
  then cached locally.
- **Deployment** — static SPA (Vite + React + TypeScript + Tailwind), deployed to
  GitHub Pages at https://barleyiced.github.io/wuwa-planner/.

[Unreleased]: https://example.com/compare/v1.0.0...HEAD
[1.0.0]: https://example.com/releases/tag/v1.0.0
