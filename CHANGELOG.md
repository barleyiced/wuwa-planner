# Changelog

All notable changes to the **WuWa Endstate Matrix Planner** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<!-- Add more changes for the next release here. Suggested headings:
### Added
### Changed
### Fixed
### Removed
-->

## [1.2.0] - 2026-06-21

### Added

- **Material Calculator** — a new pre-farming planner. Add Resonators (and optionally
  their weapons), set the current and target Level, Ascension, the five active skills,
  and the forte stat-bonus nodes, and get an aggregated shopping list of every upgrade
  material — ascension mats, talent mats, EXP potions, and Shell Credits — with item
  icons. Saved separately under `wuwa.calc.v1`. Cost data is precomputed offline by
  `npm run build:materials` (joined from the community datamine) into a committed
  bundle and is pinned to a released version, so it never covers unreleased content.
- **Material Calculator tabs** — the calculator is now split into **Characters** (the
  Resonators you're building), **Inventory** (how many of each material you own), and
  **Planner** (the full-width "still to farm" plan with a Waveplate/days estimate). The
  Planner charges Waveplate by whole farming rounds (40 per round for EXP, Shell Credit
  and Forgery; 60 for Ascension and Advanced Skill), rounding each category up — so any
  shortfall costs at least one full round, matching how Waveplate is actually spent.
- **Resonator editor pop-out** — the Characters tab is now a minimal grid of portraits;
  tapping one opens a pop-out editor (like the Endstate Matrix picker) with **Level**,
  **Skills**, and **Weapon** sub-tabs and that Resonator's own goal cost. Adding a
  Resonator opens the catalog picker, then its editor.
- **Level + ascension picked together** — ascension is a level-cap breakthrough, so it's
  no longer a separate field. The Level (and Weapon level) selectors list each cap twice:
  a plain stop (cap reached, not ascended) and a **◆** stop (breakthrough done — unlocks
  the next cap and counts that breakthrough's materials). Picking current → target stops
  derives both the EXP and ascension materials. Applies to Resonators and weapons.
- **Skills tab redesign** — each active skill now shows its real in-game name and icon
  with compact −/+ current→target steppers (no more dropdowns). The single "include
  forte nodes" checkbox is replaced by the 10 individual forte nodes, **grouped under
  their skill exactly like the in-game forte tree** — each skill owns two nodes (two
  stat bonuses; for one skill, the two Inherent Skills, e.g. Phrolova's Accidental &
  Octet). Each node is selectable on its own (with a Clear/Select-all shortcut), so you
  can skip nodes you've already unlocked. Skill and node metadata (slot, name, icon,
  value) is carried in the cost bundle (regenerated). Also corrected the Liberation/Intro
  skill labelling.
- **Material inventory** — the **Inventory** tab lists every upgrade material with an
  editable owned count (searchable, filterable by farming-source category). Owned
  amounts persist with the rest of the calculator state under `wuwa.calc.v1`.
- **Planner "still to farm"** — the Planner nets your targets against your inventory and
  lays the remaining materials out full width, grouped by the same farming-source
  categories as the Inventory tab. Surplus of a lower rarity is **synthesized up**
  (3 → 1 per tier) to cover higher-tier needs, and EXP potions/cores net by total EXP
  value across tiers. Each category and the overall total show a rough **Waveplate cost
  and estimated days to farm** (seed assumptions — average drops at 240 Waveplate/day —
  meant to be tuned as real costs surface).
- **Finer farming-source categories** — the Planner and Inventory now break materials
  down further: separate **Resonator EXP** / **Weapon EXP** / **Shell Credit** buckets,
  and the Forgery "Weapon and Skill" mats split into one bucket **per weapon type**
  (Sword, Rectifier, Broadblade, Gauntlets, Pistols), derived from the weapon `type`
  now carried in the cost bundle. Renamed for clarity: Boss Drops → **Resonator
  Ascension**, Weekly Boss → **Advanced Skill**, Enemy Drops → **Overworld Materials**.
- **Landing page** — the app now opens on a basic home page introducing the two tools.
- **Foldable sidebar navigation** — Home, Endstate Matrix, Material Calculator, How to
  use, and Changelog now live in a collapsible left rail (collapse state and the active
  view persist under `wuwa.ui.v1`). The plan export/import/reset menu moved into the
  sidebar footer.

### Changed

- **Renamed the `localStorage` namespace from `wwem` to `wuwa`.** As the project grows
  beyond the Endstate Matrix into a broader Wuthering Waves toolkit, the old
  `wwem.*` (WuWa Endstate Matrix) keys are now `wuwa.*` (plan, calculator, UI shell,
  game-data cache), and the plan export downloads as `wuwa-plan.json`. Existing saved
  data is migrated automatically on first load, so no plans are lost.
- **Clearer tool tabs.** The Material Calculator and Endstate Matrix tabs are now a
  prominent underlined tab bar below the heading (instead of a small floated pill
  group), so the Characters/Inventory/Planner and Teams/Inventory/How-to-use switches
  read as primary navigation. The redundant "+ Add Resonator" button under the
  Characters tabs was removed — the empty state and the inline "+" card both add one.
- The Endstate Matrix (Teams + Inventory) is now one entry in the sidebar, with its own
  internal Teams/Inventory toggle, instead of top-level tabs.
- **Material tiles expand one at a time.** On the Planner and Inventory tabs, tapping a
  material tile now opens only that tile's owned-count stepper — opening another closes
  the previous one — and clicking anywhere outside dismisses it (no more re-clicking the
  same tile to close). The Inventory tab's tiles now show their owned count and reveal
  the stepper on tap, matching the Planner.

### Fixed

- **Skill costs now respond to the level range.** The material bundle stored each skill
  level as the datamine's global row id instead of the 1–10 level, so skill upgrades
  contributed nothing to the goal cost and changing the skill dropdowns had no effect.
  Fixed in `build-materials.mjs` (uses `SkillId`, the in-group level) and regenerated.
- **Inherent skills now use the correct forgery material _and_ cost.** The datamine stamps
  every skill-tree node with one constant placeholder cost (Adagio Helix + MF Howler Core),
  which leaked through for the two inherent-skill nodes — so every Resonator's inherent
  skills demanded Helix regardless of their real set (e.g. Lucy asked for Helix instead of
  Combustor). Since every Resonator shares one upgrade-cost template (only the material
  family differs), the inherent skills are now authored from each Resonator's own forgery
  tiers: the tier-2 and tier-3 forgery sets (3 each) + 1 Gold-in-Memory-class mat + 15000
  Shell Credit apiece — one tier below the stat-node pair on the same branch, which the
  previous fix had over-counted. This drops every Resonator's forte from 750k to 630k Shell
  Credit and corrects the high-tier shard/pendant/Gold totals. Fixed in `build-materials.mjs`
  and regenerated.
- **Resonator leveling now charges Shell Credit.** The datamine's role-level tables only
  author EXP thresholds (no gold column), so the calculator counted the EXP potions for a
  1→90 level grind but none of the Shell Credit the game charges to apply them. It now
  adds the in-game rate of 0.35 Shell Credit per EXP (e.g. ~853k for a full 1→90), the
  resonator counterpart to the gold already baked into weapon leveling.

## [1.1.0] - 2026-06-20

### Added

- **Drag-and-drop team reordering** — grab a team card by its handle (⠿) to drag it
  into a new position. The existing ↑/↓ buttons remain as a keyboard/touch fallback.
- **Vigor system** — resonators can now only be placed in as many teams as they have
  Vigor (1 by default; 2 for dedicated healers: Baizhi, Verina, Shorekeeper, Buling,
  Mornye). The resonator picker shows Vigor dots on each card and disables (dims)
  resonators who are out of Vigor or already placed in the team being edited. All
  Rover variants share a single Vigor pool, so fielding any Rover dims every other
  Rover (you can still swap one Rover element for another in the same slot). Team
  cards flag any resonator placed in more teams than its Vigor allows (e.g. from an
  imported plan) with an amber **over Vigor** warning.
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

### Removed

- **Duplicate-team button** — removed. With the Vigor system, cloning a team's
  resonators wholesale instantly puts every 1-Vigor resonator in two teams at once,
  which contradicts the planner's core constraint. Add/rename/reorder/delete remain.

### Fixed

- **Weapon allocation no longer double-counts a multi-team resonator.** A resonator
  that appears in several teams (Vigor ≥ 2, e.g. a healer) is one physical unit
  holding one weapon, so equipping the same weapon on it across teams now consumes a
  single copy instead of one per team. The weapon picker also lets that resonator
  re-equip a weapon it already holds without reporting it as over-assigned.

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

[Unreleased]: https://github.com/barleyiced/wuwa-planner/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/barleyiced/wuwa-planner/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/barleyiced/wuwa-planner/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/barleyiced/wuwa-planner/releases/tag/v1.0.0
