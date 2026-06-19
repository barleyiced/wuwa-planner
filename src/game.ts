// Wuthering Waves game data: types, display maps, icon URLs, and CDN loader.
//
// Data + assets are served by the community mirror at static.nanoka.cc (a
// mirror of hakush.in). Both expose `Access-Control-Allow-Origin: *`, so the
// browser can fetch them directly.

const CDN = "https://static.nanoka.cc";
const PINNED_VERSION = "3.5.2"; // fallback if the manifest can't be resolved

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

// In-game element ("attribute") icons live under this folder on the CDN; the
// per-element filenames were derived by sampling the dataset's skill trees.
const ATTR_ICONS = "/Game/Aki/UI/UIResources/Common/Image/IconAttribute";

export const ELEMENTS: Record<number, { name: string; color: string; icon: string }> = {
  1: { name: "Glacio", color: "#5ec8f5", icon: iconUrl(`${ATTR_ICONS}/T_Iconpropertyredice_UI`) },
  2: { name: "Fusion", color: "#ff6a4d", icon: iconUrl(`${ATTR_ICONS}/T_Iconpropertyredhot_UI`) },
  3: { name: "Electro", color: "#b780ff", icon: iconUrl(`${ATTR_ICONS}/T_Iconpropertyredmine_UI`) },
  4: { name: "Aero", color: "#54d6a0", icon: iconUrl(`${ATTR_ICONS}/T_Iconpropertyredwind_UI`) },
  5: { name: "Spectro", color: "#f2d24f", icon: iconUrl(`${ATTR_ICONS}/T_Iconpropertyredlight_UI`) },
  6: { name: "Havoc", color: "#e85ca0", icon: iconUrl(`${ATTR_ICONS}/T_Iconpropertyreddark_UI`) },
};

export const WEAPON_TYPES: Record<number, string> = {
  1: "Broadblade",
  2: "Sword",
  3: "Pistols",
  4: "Gauntlets",
  5: "Rectifier",
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

// ---- icon url -----------------------------------------------------------

/** Convert an in-game asset path into a public CDN webp url. */
export function iconUrl(assetPath: string): string {
  if (!assetPath) return "";
  if (assetPath.startsWith("http")) return assetPath;
  const rel = assetPath.replace("/Game/Aki/UI/", "").split(".")[0];
  return `${CDN}/assets/ww/${rel}.webp`;
}

// ---- loader -------------------------------------------------------------

const CACHE_KEY = "wwem.gamedata.v1";

async function resolveVersion(): Promise<string> {
  try {
    const res = await fetch(`${CDN}/manifest.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error(String(res.status));
    const m = (await res.json()) as { ww?: { latest?: string } };
    return m.ww?.latest ?? PINNED_VERSION;
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
    }))
    .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));

  const weapons: Weapon[] = Object.entries(rawWp)
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
