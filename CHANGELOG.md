# Changelog

All notable changes to the **WuWa Endstate Matrix Planner** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Vigor system** — resonators can now only be placed in as many teams as they have
  Vigor (1 by default; 2 for dedicated healers: Baizhi, Verina, Shorekeeper, Buling,
  Mornye). The resonator picker shows Vigor dots on each card and disables (dims)
  resonators who are out of Vigor or already placed in the team being edited. All
  Rover variants share a single Vigor pool, so fielding any Rover dims every other
  Rover (you can still swap one Rover element for another in the same slot).
- **Larger resonator portraits** — the resonator picker now shows the tall in-game
  "role pile" portraits (with the name and rarity over a gradient) instead of small
  square head icons. Portraits come from `static.nanoka.cc` (new `background` field;
  the cached game-data shape is bumped to `wwem.gamedata.v2`).
- **In-app "How to use" guide** — a step-by-step walkthrough (inventory, team
  building, weapon assignment, allocation warnings, backup/restore) available as its
  own **How to use** tab alongside Teams and Inventory.
- **Element icons** — resonators now show their real in-game element icon (a badge on
  the resonator icon and in the resonator picker's element filter and cards) instead
  of a plain colored label.
- **Weapon-type icons** — weapon type is now shown as an icon (in the inventory and
  resonator-picker filters, weapon rows, and empty team slots) instead of plain text.
- Element and weapon-type icons are sourced from the community-maintained
  [ryanbenson/wuthering-waves-assets](https://github.com/ryanbenson/wuthering-waves-assets)
  repo (via jsDelivr, pinned to a commit). The resonator/weapon catalog and portraits
  still come from `static.nanoka.cc`.
- **SEO & social metadata** — descriptive title/description/keywords, canonical URL,
  Open Graph and Twitter Card tags, `WebApplication` JSON-LD structured data, a
  generated `og-image.svg`, plus `robots.txt` and `sitemap.xml`.

### Fixed

- **Weapon allocation no longer double-counts a multi-team resonator.** A resonator
  that appears in several teams (Vigor ≥ 2, e.g. a healer) is one physical unit
  holding one weapon, so equipping the same weapon on it across teams now consumes a
  single copy instead of one per team. The weapon picker also lets that resonator
  re-equip a weapon it already holds without reporting it as over-assigned.

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
- **Deployment** — static SPA (Vite + React + TypeScript + Tailwind), deployed to GitHub Pages.

[Unreleased]: https://example.com/compare/v1.0.0...HEAD
[1.0.0]: https://example.com/releases/tag/v1.0.0
