// Wuthering Waves game data: types, display maps, icon URLs, and CDN loader.
//
// Data + assets are served by the community mirror at static.nanoka.cc (a
// mirror of hakush.in). Both expose `Access-Control-Allow-Origin: *`, so the
// browser can fetch them directly.

const CDN = "https://static.nanoka.cc";
const PINNED_VERSION = "3.4"; // fallback if the manifest can't be resolved

/** Raw entry shape from `<cdn>/ww/<ver>/character.json` (keyed by id). */
interface RawCharacter {
  icon: string;
  background: string;
  rank: number; // rarity, 4 or 5
  weapon: number; // weapon-type id (matches Weapon.type)
  element: number;
  en: string;
  nickname?: string;
}

/** Raw entry shape from `<cdn>/ww/<ver>/weapon.json` (keyed by id). */
interface RawWeapon {
  icon: string;
  rank: number; // rarity 1..5
  type: number; // weapon-type id
  en: string;
  atk?: number;
  sub?: string;
}

export interface Character {
  id: string;
  name: string;
  rarity: number;
  weaponType: number;
  element: number;
  icon: string;
  /** Tall in-game "role pile" portrait (waist-up), used by the resonator picker. */
  portrait: string;
}

export interface Weapon {
  id: string;
  name: string;
  rarity: number;
  type: number;
  sub?: string;
  icon: string;
}

export interface GameData {
  version: string;
  characters: Character[];
  weapons: Weapon[];
  characterById: Record<string, Character>;
  weaponById: Record<string, Weapon>;
}

// ---- display maps (derived by sampling the dataset) ---------------------

// Element and weapon-type icons come from the community-maintained asset repo
// ryanbenson/wuthering-waves-assets, served via jsDelivr and pinned to a commit
// for stability. (nanoka serves the data catalog + per-id portraits but has no
// standalone weapon-type icons; this repo has both fixed icon sets.)
const ASSETS =
  "https://cdn.jsdelivr.net/gh/ryanbenson/wuthering-waves-assets@b0d8623a4b87f1d672e45fbcbd5e0e0f2744a75d/images";

export const ELEMENTS: Record<number, { name: string; color: string; icon: string }> = {
  1: { name: "Glacio", color: "#5ec8f5", icon: `${ASSETS}/glacio.png` },
  2: { name: "Fusion", color: "#ff6a4d", icon: `${ASSETS}/fusion.png` },
  3: { name: "Electro", color: "#b780ff", icon: `${ASSETS}/electro.png` },
  4: { name: "Aero", color: "#54d6a0", icon: `${ASSETS}/aero.png` },
  5: { name: "Spectro", color: "#f2d24f", icon: `${ASSETS}/spectro.png` },
  6: { name: "Havoc", color: "#e85ca0", icon: `${ASSETS}/havoc.png` },
};

export const WEAPON_TYPES: Record<number, string> = {
  1: "Broadblade",
  2: "Sword",
  3: "Pistols",
  4: "Gauntlets",
  5: "Rectifier",
};

/** Weapon-type icon urls, keyed by weapon-type id (same repo as elements). */
export const WEAPON_TYPE_ICONS: Record<number, string> = {
  1: `${ASSETS}/broadblade.webp`,
  2: `${ASSETS}/sword.webp`,
  3: `${ASSETS}/pistol.webp`,
  4: `${ASSETS}/gauntlet.webp`,
  5: `${ASSETS}/rectifier.webp`,
};

export const RARITY: Record<number, { color: string; glow: string }> = {
  1: { color: "#9aa7bd", glow: "rgba(154,167,189,0.0)" },
  2: { color: "#67c98e", glow: "rgba(103,201,142,0.18)" },
  3: { color: "#5aa8ff", glow: "rgba(90,168,255,0.22)" },
  4: { color: "#c06bff", glow: "rgba(192,107,255,0.28)" },
  5: { color: "#f4b740", glow: "rgba(244,183,64,0.34)" },
};

export function elementOf(id: number) {
  return ELEMENTS[id] ?? { name: "Unknown", color: "#9aa7bd", icon: "" };
}

// ---- Vigor --------------------------------------------------------------
// Endstate Matrix rule: a resonator loses 1 Vigor each time they fight, so a
// resonator can be placed in as many teams as they have Vigor. Everyone has 1
// Vigor by default; dedicated healers get 2, letting them appear in two teams.
const HEALER_IDS = new Set([
  "1103", // Baizhi
  "1503", // Verina
  "1505", // Shorekeeper
  "1307", // Buling
  "1209", // Mornye
]);

export const DEFAULT_VIGOR = 1;
export const HEALER_VIGOR = 2;

/** Total Vigor (max teams a resonator can join) for the given character id. */
export function vigorOf(characterId: string): number {
  return HEALER_IDS.has(characterId) ? HEALER_VIGOR : DEFAULT_VIGOR;
}

/**
 * Key a resonator uses for Vigor accounting. Every Rover (Traveler) variant is
 * the same body and shares a single Vigor pool — fielding any Rover blocks all
 * the others — so they collapse to one key. Everyone else keys by their own id.
 */
export function vigorGroupKey(char: Character): string {
  return char.name.startsWith("Rover") ? "rover" : char.id;
}

// ---- icon url -----------------------------------------------------------

/** Convert an in-game asset path into a public CDN webp url. */
export function iconUrl(assetPath: string): string {
  if (!assetPath) return "";
  if (assetPath.startsWith("http")) return assetPath;
  const rel = assetPath.replace("/Game/Aki/UI/", "").split(".")[0];
  return `${CDN}/assets/ww/${rel}.webp`;
}

// ---- material calculator data -------------------------------------------
// Upgrade-material costs are not on nanoka; they are precomputed offline by
// scripts/build-materials.mjs into a committed bundle (joined from the Arikatsu
// datamine) and imported here. The bundle is pinned to a released version (≤3.4),
// so the calculator never covers unreleased content. Refresh it on a version bump.
import materialsBundle from "./data/materials.3.4.json";

/** A single (item, quantity) cost line. `id` indexes MaterialData.items. */
export interface CostEntry {
  id: number;
  qty: number;
}

/** One breakthrough/ascension tier (BreachLevel) with its material cost. */
export interface AscensionTier {
  level: number; // 1..6
  consume: CostEntry[];
}

/** Cost to raise one active skill to the given level (2..10). */
export interface SkillLevelCost {
  lvl: number;
  consume: CostEntry[];
}

export type SkillKey = "normal" | "skill" | "circuit" | "liberation" | "intro";

/** One active skill slot: its in-game name, icon, and 2→10 level costs. */
export interface MaterialSkill {
  name: string;
  icon: string; // relative asset path; feed to itemIconUrl()
  levels: SkillLevelCost[];
}

/**
 * One individually-investable forte node, attached to the active skill (`slot`) whose
 * tree branch it hangs off (each skill owns two). Either an Inherent Skill
 * (`kind: "skill"`, no value) or a stat-bonus node (`kind: "stat"`, e.g. CRIT/ATK +value).
 */
export interface ForteNode {
  slot: SkillKey | null; // owning skill branch (null only if the chain couldn't resolve)
  kind: "skill" | "stat";
  title: string;
  icon: string; // relative asset path; feed to itemIconUrl()
  value: string; // display value, e.g. "1.20%" (empty for inherent skills)
  consume: CostEntry[];
}

export interface MaterialCharacter {
  levelGroup: number;
  ascension: AscensionTier[];
  skills: Record<SkillKey, MaterialSkill>;
  /** One-time forte stat-bonus nodes, individually selectable. */
  nodes: ForteNode[];
}

export interface MaterialWeapon {
  levelId: number;
  ascension: AscensionTier[];
  type: number; // weapon-type id (1..5, matches Weapon.type / WEAPON_TYPES)
}

export interface MaterialItem {
  name: string;
  icon: string; // relative asset path; feed to itemIconUrl()
  rarity: number; // 1..5 (QualityId)
}

export interface ExpItem {
  id: number;
  exp: number;
  cost: number; // gold per item (weapon exp only; 0 for resonator exp)
}

export interface MaterialData {
  version: string;
  items: Record<string, MaterialItem>;
  characters: Record<string, MaterialCharacter>;
  weapons: Record<string, MaterialWeapon>;
  /** levelGroup -> cumulative resonator EXP to reach each level (index = level). */
  characterExp: Record<string, number[]>;
  /** levelId -> cumulative weapon EXP to reach each level (index = level). */
  weaponExp: Record<string, number[]>;
  expItems: { role: ExpItem[]; weapon: ExpItem[] };
}

/** The localized display name for one of the five active-skill slots. */
export const SKILL_LABELS: Record<SkillKey, string> = {
  normal: "Basic Attack",
  skill: "Resonance Skill",
  circuit: "Forte Circuit",
  liberation: "Resonance Liberation",
  intro: "Intro Skill",
};
export const SKILL_ORDER: SkillKey[] = ["normal", "skill", "circuit", "liberation", "intro"];

export const SHELL_CREDIT_ID = 2;

let materialCache: MaterialData | null = null;

/** The precomputed material-cost bundle (synchronous — it is bundled, not fetched). */
export function loadMaterialData(): MaterialData {
  if (!materialCache) materialCache = materialsBundle as unknown as MaterialData;
  return materialCache;
}

/** Convert a bundle item-icon path (already stripped of prefix/extension) to a url. */
export function itemIconUrl(iconPath: string): string {
  return iconPath ? `${CDN}/assets/ww/${iconPath}.webp` : "";
}

/**
 * Break a total EXP requirement into a count of EXP items, largest tier first,
 * rounding the remainder up onto the smallest tier. Returns the per-item counts
 * plus the gold spent (weapon EXP items carry a per-use gold cost).
 */
export function expBreakdown(
  totalExp: number,
  tiers: ExpItem[]
): { counts: CostEntry[]; gold: number } {
  const counts: CostEntry[] = [];
  let gold = 0;
  let remaining = Math.max(0, totalExp);
  const sorted = [...tiers].sort((a, b) => b.exp - a.exp);
  sorted.forEach((tier, i) => {
    if (remaining <= 0) return;
    const isSmallest = i === sorted.length - 1;
    const n = isSmallest ? Math.ceil(remaining / tier.exp) : Math.floor(remaining / tier.exp);
    if (n > 0) {
      counts.push({ id: tier.id, qty: n });
      gold += n * tier.cost;
      remaining -= n * tier.exp;
    }
  });
  return { counts, gold };
}

// ---- loader -------------------------------------------------------------

// v2 adds Character.portrait (the role-pile image) to the cached shape.
// v3 filters out cosmetic "Projection" weapon skins — bumped to force a refetch.
const CACHE_KEY = "wuwa.gamedata.v3";

async function resolveVersion(): Promise<string> {
  try {
    const res = await fetch(`${CDN}/manifest.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error(String(res.status));
    // Use `live` (the released game version), never `latest` — the latter
    // includes unreleased beta content (e.g. upcoming 3.5+ resonators). The
    // per-version catalog is cumulative, so the live dataset simply omits them.
    // If `live` is absent, fall back to the pinned released version rather than
    // `latest`, so we can never serve unreleased content.
    const m = (await res.json()) as { ww?: { live?: string } };
    return m.ww?.live ?? PINNED_VERSION;
  } catch {
    return PINNED_VERSION;
  }
}

function normalize(
  version: string,
  rawCh: Record<string, RawCharacter>,
  rawWp: Record<string, RawWeapon>
): GameData {
  const characters: Character[] = Object.entries(rawCh)
    .map(([id, c]) => ({
      id,
      name: c.en,
      rarity: c.rank,
      weaponType: c.weapon,
      element: c.element,
      icon: iconUrl(c.icon),
      portrait: iconUrl(c.background),
    }))
    .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));

  const weapons: Weapon[] = Object.entries(rawWp)
    // "Projection" entries are cosmetic weapon skins, not real weapons — drop them.
    .filter(([, w]) => !/^Projection\b/.test(w.en))
    .map(([id, w]) => ({
      id,
      name: w.en,
      rarity: w.rank,
      type: w.type,
      sub: w.sub,
      icon: iconUrl(w.icon),
    }))
    .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));

  const characterById = Object.fromEntries(characters.map((c) => [c.id, c]));
  const weaponById = Object.fromEntries(weapons.map((w) => [w.id, w]));
  return { version, characters, weapons, characterById, weaponById };
}

export async function loadGameData(): Promise<GameData> {
  const version = await resolveVersion();

  // Serve from localStorage if we already have this exact version.
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as GameData;
      if (parsed.version === version) return parsed;
    }
  } catch {
    /* ignore corrupt cache */
  }

  const fetchJson = async <T,>(file: string): Promise<T> => {
    const res = await fetch(`${CDN}/ww/${version}/${file}`);
    if (!res.ok) throw new Error(`Failed to load ${file} (${res.status})`);
    return res.json() as Promise<T>;
  };

  const [rawCh, rawWp] = await Promise.all([
    fetchJson<Record<string, RawCharacter>>("character.json"),
    fetchJson<Record<string, RawWeapon>>("weapon.json"),
  ]);

  const data = normalize(version, rawCh, rawWp);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* over-quota — fine, just refetch next time */
  }
  return data;
}
