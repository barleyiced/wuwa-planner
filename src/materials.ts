// Farming-plan data layer for the Material Calculator's Planner tab.
//
// Pure, React-free (like game.ts). It turns the aggregated gross `totals` plus the
// owned `inventory` into a per-category "still to farm" plan: remaining counts after
// netting against what you own (including lower→higher rarity synthesis), and a
// rough Waveplate / days-to-farm estimate per category.
//
// Waveplate is charged per *farming round*, not per drop. A round is an indivisible
// chunk (40 or 60 Waveplate by source — see ROUND_WAVEPLATE): you spend the whole
// chunk even to obtain a single missing material. So each category's cost is rounded
// UP to a whole number of rounds. The per-drop yields below (see WAVEPLATE) only set
// how many of a material one round produces; they are assumptions, tune as needed.
import {
  expBreakdown,
  SHELL_CREDIT_ID,
  WEAPON_TYPES,
  type MaterialData,
  type MaterialItem,
} from "./game";

// ---- categories (shared with the Inventory tab) -------------------------------

/**
 * Material buckets by farming source. Items carry no category field, so these are
 * inferred from how the cost bundle consumes each one (see `categorize`).
 *
 * The five `ws*` buckets are the Forgery "Weapon and Skill" materials, split by the
 * weapon type that consumes them (the keys mirror WEAPON_TYPES: 1 Broadblade … 5
 * Rectifier). Resonator and weapon EXP get their own buckets, as does Shell Credit.
 */
export type Cat =
  | "roleExp"
  | "weaponExp"
  | "credits"
  | "ws1"
  | "ws2"
  | "ws3"
  | "ws4"
  | "ws5"
  | "boss"
  | "weekly"
  | "enemy"
  | "specialty";

/** The Forgery "Weapon and Skill" bucket for a weapon-type id (1..5). */
const wsCat = (type: number): Cat => `ws${type}` as Cat;

// Ordered cheapest-to-pricier by Waveplate, then by drop source within a tier:
// EXP and Credits (per-point) first, then the five Forgery domains, then the
// boss/weekly/overworld/specialty drops.
export const CAT_ORDER: Cat[] = [
  "roleExp",
  "weaponExp",
  "credits",
  "ws2", // Sword
  "ws5", // Rectifier
  "ws1", // Broadblade
  "ws4", // Gauntlets
  "ws3", // Pistols
  "boss",
  "weekly",
  "enemy",
  "specialty",
];

export const CAT_LABELS: Record<Cat, string> = {
  roleExp: "Resonator EXP",
  weaponExp: "Weapon EXP",
  credits: "Shell Credit",
  ws1: `Weapon and Skill: ${WEAPON_TYPES[1]}`,
  ws2: `Weapon and Skill: ${WEAPON_TYPES[2]}`,
  ws3: `Weapon and Skill: ${WEAPON_TYPES[3]}`,
  ws4: `Weapon and Skill: ${WEAPON_TYPES[4]}`,
  ws5: `Weapon and Skill: ${WEAPON_TYPES[5]}`,
  boss: "Resonator Ascension",
  weekly: "Advanced Skill",
  enemy: "Overworld Materials",
  specialty: "Specialties",
};

/**
 * Classify every item into exactly one farming-source bucket, inferred from where
 * the cost bundle consumes it. Discriminators (in priority order):
 *  - Shell Credit and EXP (potions/cores) are pinned by id; EXP splits into the
 *    Resonator and Weapon pools.
 *  - Specialties are the rarity-1 collectibles.
 *  - Resonator-ascension-only mats are the field-boss Tacet Cores ("Resonator
 *    Ascension").
 *  - Forte-only named mats (not used by weapons) are "Advanced Skill" weekly-boss
 *    drops.
 *  - Anything else used in resonator ascension is an "Overworld Material" (the
 *    tiered cores/rings shared with weapons and forte).
 *  - Everything left is a Forgery "Weapon and Skill" material (Metallic Drip,
 *    Phlogiston, Helix, Residue, Cadence, Polarizer, Combustor, String, Carved
 *    Crystal, Waveworn Shard); each one is consumed by weapons of exactly one type,
 *    so it goes in that type's `ws*` bucket.
 */
export function categorize(mat: MaterialData): Record<number, Cat> {
  const inRole = new Set<number>();
  const inForte = new Set<number>();
  const inWeapon = new Set<number>();
  // Forgery mats are consumed by weapons of a single type; record that type by item id.
  const weaponTypeOf: Record<number, number> = {};
  for (const ch of Object.values(mat.characters)) {
    for (const tier of ch.ascension) for (const c of tier.consume) inRole.add(c.id);
    for (const skill of Object.values(ch.skills))
      for (const lvl of skill.levels) for (const c of lvl.consume) inForte.add(c.id);
    for (const node of ch.nodes) for (const c of node.consume) inForte.add(c.id);
  }
  for (const w of Object.values(mat.weapons))
    for (const tier of w.ascension)
      for (const c of tier.consume) {
        inWeapon.add(c.id);
        weaponTypeOf[c.id] = w.type;
      }

  const roleExpIds = new Set<number>(mat.expItems.role.map((e) => e.id));
  const weaponExpIds = new Set<number>(mat.expItems.weapon.map((e) => e.id));

  const out: Record<number, Cat> = {};
  for (const [key, item] of Object.entries(mat.items)) {
    const id = Number(key);
    out[id] =
      id === SHELL_CREDIT_ID
        ? "credits"
        : roleExpIds.has(id)
          ? "roleExp"
          : weaponExpIds.has(id)
            ? "weaponExp"
            : item.rarity === 1
              ? "specialty"
              : inRole.has(id) && !inForte.has(id)
                ? "boss"
                : inForte.has(id) && !inWeapon.has(id) && !inRole.has(id)
                  ? "weekly"
                  : inRole.has(id)
                    ? "enemy"
                    : wsCat(weaponTypeOf[id]);
  }
  return out;
}

// ---- rarity-tier families (for lower→higher synthesis) ------------------------

/** How many lower-tier mats synthesize into one of the next tier up (in-game rule). */
export const CONVERT_RATIO = 3;

/**
 * The tier-family key for an item. The cost bundle's ids encode the rarity tier in
 * their last digit (e.g. Whisperin Core 4110001`1`..`4` = LF/MF/HF/FF), so items
 * sharing every digit but the last are tier siblings of one family.
 */
export function familyKey(id: number | string): string {
  const s = String(id);
  return s.length > 1 ? s.slice(0, -1) : s;
}

/**
 * Group items into rarity-tier families (see `familyKey`). Returns only true families
 * (≥2 members), each sorted ascending by rarity (lowest tier first).
 */
function tierFamilies(mat: MaterialData): number[][] {
  const groups: Record<string, number[]> = {};
  for (const id of Object.keys(mat.items)) {
    (groups[familyKey(id)] ||= []).push(Number(id));
  }
  return Object.values(groups)
    .filter((g) => g.length >= 2)
    .map((g) => g.sort((a, b) => mat.items[a].rarity - mat.items[b].rarity));
}

/**
 * Order items by tier family first, then rarity — so siblings (e.g. all weapon EXP,
 * all Polarizers) sit next to each other, highest tier first within each family.
 */
export function compareByFamily(aId: number, bId: number, mat: MaterialData): number {
  const fa = familyKey(aId);
  const fb = familyKey(bId);
  if (fa !== fb) return fa.localeCompare(fb);
  return mat.items[bId].rarity - mat.items[aId].rarity;
}

// ---- Waveplate / days model (ASSUMPTIONS — tune freely) -----------------------

/** Waveplate that regenerates in a day (≈ the natural cap's worth, 1 per 6 min). */
export const DAILY_WAVEPLATE = 240;

/**
 * Waveplate cost of ONE farming round, by source. A round is indivisible — you spend
 * the whole chunk even to obtain a single missing drop — so per-category costs are
 * rounded up to whole rounds (see planFarming). Enemy/Specialty drops cost no Waveplate.
 */
export const ROUND_WAVEPLATE: Record<Cat, number> = {
  roleExp: 40,
  weaponExp: 40,
  credits: 40,
  ws1: 40,
  ws2: 40,
  ws3: 40,
  ws4: 40,
  ws5: 40,
  boss: 60, // Resonator Ascension
  weekly: 60, // Advanced Skill
  enemy: 0,
  specialty: 0,
};

/**
 * Fractional Waveplate "cost" to obtain ONE unit of a material, by farming source —
 * derived from recorded drops per round. This only sets a category's drops-per-round
 * basis: summing it over a category's shortfall and dividing by that category's
 * ROUND_WAVEPLATE gives the fractional round count, which is then rounded up.
 *
 * Tiered drops (forgery mats, rings) are priced at their lowest tier; each higher tier
 * costs CONVERT_RATIO× the one below it, mirroring synthesis — so a 5★ drop is worth
 * 3³ = 27 of the 2★ base. EXP and Credits are priced per point.
 *
 * Recorded: Forgery 40 WP → 51 LF-equiv mats · Boss 60 WP → 4.5 cores · Weekly 60 WP →
 * 3 mats (gated 3/week, excluded from the days estimate) · Shell Credit 40 WP → 84,000 ·
 * EXP (resonator & weapon) 40 WP → 72,000 each · Enemy drops & Specialties cost no
 * Waveplate (open-world / Forgery bonus drops).
 */
const WAVEPLATE = {
  enemyBase: 0, // open-world / Forgery bonus drop — no Waveplate
  forgeryBase: 40 / 51, // 40 WP → 51 LF-equiv forgery mats; ×3 per tier up
  bossUnit: 60 / 4.5, // 60 WP → 4.5 field-boss Tacet Cores
  weeklyUnit: 60 / 3, // 60 WP → 3 weekly-boss mats (gated; excluded from days)
  perRoleExp: 40 / 72000, // resonator EXP per point
  perWeaponExp: 40 / 72000, // weapon EXP per point
  perCredit: 40 / 84000, // Shell Credit per point
  specialtyUnit: 0, // open-world gather — no Waveplate
} as const;

/** Weekly-boss drops are entry-gated (3/week), so their Waveplate is left out of the
 *  days budget — farming time there is paced by the weekly cap, not Waveplate. */
const GATED_CATS: ReadonlySet<Cat> = new Set<Cat>(["weekly"]);

// ---- the plan -----------------------------------------------------------------

export interface FarmRow {
  id: number;
  item: MaterialItem;
  need: number; // gross required across all goals
  owned: number; // from the Inventory tab
  remaining: number; // after netting owned + lower-tier synthesis
  waveplate: number; // estimated Waveplate to farm `remaining`
}

export interface FarmCategory {
  cat: Cat;
  rows: FarmRow[];
  remainingItems: number; // rows still needing farming (remaining > 0)
  waveplate: number;
  days: number;
  gated: boolean; // entry-gated (e.g. weekly) — excluded from the days budget
}

export interface FarmPlan {
  categories: FarmCategory[];
  totalItems: number; // distinct mats with any requirement
  remainingItems: number; // distinct mats still left to farm
  totalWaveplate: number;
  totalDays: number;
}

/**
 * Build the full farming plan: net the gross `totals` against `inventory`, fold in
 * lower→higher rarity synthesis, and estimate Waveplate + days per category.
 */
export function planFarming(
  totals: Record<number, number>,
  inventory: Record<number, number>,
  mat: MaterialData
): FarmPlan {
  const cats = categorize(mat);
  const need = (id: number) => totals[id] ?? 0;
  const owned = (id: number) => inventory[id] ?? 0;

  // Start every item at its raw shortfall; conversions below only reduce these.
  const remaining: Record<number, number> = {};
  for (const id of Object.keys(mat.items)) {
    const n = Number(id);
    remaining[n] = Math.max(0, need(n) - owned(n));
  }

  // EXP pools are fungible by value, so net the whole pool's EXP (owned potions of
  // any tier count) and re-break the shortfall into items. Handle them here and
  // exclude them from the fixed-ratio synthesis pass below.
  const expWaveplate: Record<number, number> = {};
  const expIds = new Set<number>();
  for (const [pool, perExp] of [
    [mat.expItems.role, WAVEPLATE.perRoleExp],
    [mat.expItems.weapon, WAVEPLATE.perWeaponExp],
  ] as const) {
    let neededExp = 0;
    let ownedExp = 0;
    for (const e of pool) {
      expIds.add(e.id);
      expWaveplate[e.id] = e.exp * perExp;
      neededExp += need(e.id) * e.exp;
      ownedExp += owned(e.id) * e.exp;
      remaining[e.id] = 0;
    }
    const remExp = Math.max(0, neededExp - ownedExp);
    if (remExp > 0)
      for (const c of expBreakdown(remExp, [...pool]).counts) remaining[c.id] = c.qty;
  }

  // Lower→higher synthesis: walk each tier family low→high, carrying surplus upward
  // (3 lower = 1 higher) to cover higher-tier shortfalls.
  for (const fam of tierFamilies(mat)) {
    if (fam.some((id) => expIds.has(id))) continue; // EXP handled by value above
    let carry = 0; // surplus carried up, already in the current tier's units
    for (const id of fam) {
      const surplus = Math.max(0, owned(id) - need(id));
      let avail = surplus + carry;
      const used = Math.min(avail, remaining[id]);
      remaining[id] -= used;
      avail -= used;
      carry = Math.floor(avail / CONVERT_RATIO);
    }
  }

  const waveplateFor = (id: number, item: MaterialItem, cat: Cat): number => {
    switch (cat) {
      case "specialty":
        return WAVEPLATE.specialtyUnit;
      case "credits":
        return WAVEPLATE.perCredit;
      case "roleExp":
      case "weaponExp":
        return expWaveplate[id] ?? 0;
      case "enemy":
        return WAVEPLATE.enemyBase * CONVERT_RATIO ** (item.rarity - 2);
      case "ws1":
      case "ws2":
      case "ws3":
      case "ws4":
      case "ws5":
        return WAVEPLATE.forgeryBase * CONVERT_RATIO ** (item.rarity - 2);
      case "boss":
        return WAVEPLATE.bossUnit;
      case "weekly":
        return WAVEPLATE.weeklyUnit;
    }
  };

  const byCat = new Map<Cat, FarmRow[]>();
  for (const [key, item] of Object.entries(mat.items)) {
    const id = Number(key);
    const nd = need(id);
    if (nd <= 0) continue; // only mats some goal actually requires
    const cat = cats[id];
    const rem = remaining[id] ?? 0;
    const row: FarmRow = {
      id,
      item,
      need: nd,
      owned: owned(id),
      remaining: rem,
      waveplate: rem * waveplateFor(id, item, cat),
    };
    (byCat.get(cat) ?? byCat.set(cat, []).get(cat)!).push(row);
  }

  const categories: FarmCategory[] = [];
  let totalItems = 0;
  let remainingItems = 0;
  let totalWaveplate = 0;
  for (const cat of CAT_ORDER) {
    const rows = byCat.get(cat);
    if (!rows || rows.length === 0) continue;
    rows.sort((a, b) => compareByFamily(a.id, b.id, mat));
    // Charge by whole rounds, not per drop: sum the continuous per-drop estimate, then
    // round UP to a whole number of indivisible 40/60-Waveplate rounds. So any shortfall
    // in a category costs at least one full round (enemy/specialty cost nothing).
    const roundWp = ROUND_WAVEPLATE[cat];
    const rawWaveplate = rows.reduce((s, r) => s + r.waveplate, 0);
    const waveplate = roundWp > 0 ? Math.ceil(rawWaveplate / roundWp) * roundWp : 0;
    const remCount = rows.filter((r) => r.remaining > 0).length;
    const gated = GATED_CATS.has(cat);
    totalItems += rows.length;
    remainingItems += remCount;
    if (!gated) totalWaveplate += waveplate; // gated sources aren't Waveplate-paced
    categories.push({
      cat,
      rows,
      remainingItems: remCount,
      waveplate,
      days: waveplate / DAILY_WAVEPLATE,
      gated,
    });
  }

  return {
    categories,
    totalItems,
    remainingItems,
    totalWaveplate,
    totalDays: totalWaveplate / DAILY_WAVEPLATE,
  };
}
