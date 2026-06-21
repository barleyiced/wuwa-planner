import { useState } from "react";
import {
  RARITY,
  WAVEPLATE_ICON,
  WEAPON_TYPES,
  WEAPON_TYPE_ICONS,
  elementOf,
  itemIconUrl,
  type Character,
  type MaterialItem,
  type Sonata,
  type Weapon,
} from "../game";

/** Image that fades in and hides itself if the asset fails to load. */
export function AssetImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src)
    return (
      <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
        {alt.slice(0, 6)}
      </span>
    );
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

const sizeMap: Record<string, string> = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-16 w-16",
};

/** The element's in-game icon. Renders nothing if the asset is missing/fails. */
export function ElementIcon({
  element,
  className = "h-4 w-4",
}: {
  element: number;
  className?: string;
}) {
  const el = elementOf(element);
  const [failed, setFailed] = useState(false);
  if (!el.icon || failed) return null;
  return (
    <img
      src={el.icon}
      alt={el.name}
      title={el.name}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className={`${className} object-contain`}
    />
  );
}

/** The in-game Waveplate icon. Renders nothing if the asset is missing/fails. */
export function WaveplateIcon({ className = "h-4 w-4" }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!WAVEPLATE_ICON || failed) return null;
  return (
    <img
      src={WAVEPLATE_ICON}
      alt="Waveplate"
      title="Waveplate"
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className={`${className} object-contain`}
    />
  );
}

/** The weapon-type icon. Renders nothing if the asset is missing/fails. */
export function WeaponTypeIcon({
  type,
  className = "h-4 w-4",
}: {
  type: number;
  className?: string;
}) {
  const src = WEAPON_TYPE_ICONS[type];
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt={WEAPON_TYPES[type] ?? "Weapon"}
      title={WEAPON_TYPES[type]}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className={`${className} object-contain`}
    />
  );
}

export function CharIcon({
  char,
  size = "md",
}: {
  char: Character;
  size?: keyof typeof sizeMap;
}) {
  const r = RARITY[char.rarity] ?? RARITY[4];
  const el = elementOf(char.element);
  return (
    <div
      className={`relative ${sizeMap[size]} shrink-0 overflow-hidden rounded-xl`}
      style={{
        background: `linear-gradient(160deg, ${r.color}33, ${el.color}22)`,
        boxShadow: `inset 0 0 0 1.5px ${r.color}aa`,
      }}
      title={char.name}
    >
      <AssetImg src={char.icon} alt={char.name} className="h-full w-full object-cover" />
      {el.icon && (
        <span
          className="absolute left-0.5 top-0.5 flex items-center justify-center rounded-full bg-black/45 p-0.5 backdrop-blur-sm"
          style={{ boxShadow: `inset 0 0 0 1px ${el.color}88` }}
        >
          <ElementIcon element={char.element} className="h-3.5 w-3.5" />
        </span>
      )}
      <span
        className="absolute bottom-0 left-0 right-0 h-[3px]"
        style={{ background: el.color }}
      />
    </div>
  );
}

/**
 * Tall "role pile" portrait tile (waist-up) used by the resonator picker.
 * Renders the element badge, a rarity accent, and the name over a gradient.
 */
export function CharPortrait({ char }: { char: Character }) {
  const r = RARITY[char.rarity] ?? RARITY[4];
  const el = elementOf(char.element);
  return (
    <div
      className="relative aspect-[3/4] w-full overflow-hidden rounded-xl"
      style={{
        background: `linear-gradient(160deg, ${r.color}33, ${el.color}22)`,
        boxShadow: `inset 0 0 0 1.5px ${r.color}aa`,
      }}
    >
      <AssetImg
        src={char.portrait || char.icon}
        alt={char.name}
        className="h-full w-full object-cover object-top"
      />
      {el.icon && (
        <span
          className="absolute left-1 top-1 flex items-center justify-center rounded-full bg-black/45 p-0.5 backdrop-blur-sm"
          style={{ boxShadow: `inset 0 0 0 1px ${el.color}88` }}
        >
          <ElementIcon element={char.element} className="h-4 w-4" />
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-1.5 pb-1 pt-5">
        <div className="line-clamp-1 text-center text-xs font-semibold text-white drop-shadow">
          {char.name}
        </div>
        <div className="flex justify-center">
          <RarityStars rarity={char.rarity} />
        </div>
      </div>
    </div>
  );
}

export function WeaponIcon({
  weapon,
  size = "md",
}: {
  weapon: Weapon;
  size?: keyof typeof sizeMap;
}) {
  const r = RARITY[weapon.rarity] ?? RARITY[3];
  return (
    <div
      className={`relative ${sizeMap[size]} shrink-0 overflow-hidden rounded-xl`}
      style={{
        background: `radial-gradient(circle at 50% 30%, ${r.color}2e, transparent 70%)`,
        boxShadow: `inset 0 0 0 1.5px ${r.color}99`,
      }}
      title={weapon.name}
    >
      <AssetImg src={weapon.icon} alt={weapon.name} className="h-full w-full object-contain p-1" />
    </div>
  );
}

/** A material item tile (rarity-tinted), used by the calculator shopping list. */
export function ItemIcon({
  item,
  size = "md",
}: {
  item: MaterialItem;
  size?: keyof typeof sizeMap;
}) {
  const r = RARITY[item.rarity] ?? RARITY[3];
  return (
    <div
      className={`relative ${sizeMap[size]} shrink-0 overflow-hidden rounded-lg`}
      style={{
        background: `radial-gradient(circle at 50% 30%, ${r.color}33, transparent 72%)`,
        boxShadow: `inset 0 0 0 1.5px ${r.color}99`,
      }}
      title={item.name}
    >
      <AssetImg
        src={itemIconUrl(item.icon)}
        alt={item.name}
        className="h-full w-full object-contain p-0.5"
      />
    </div>
  );
}

/** Up-to-two-letter monogram from a set name, e.g. "Freezing Frost" → "FF". */
function sonataMonogram(name: string): string {
  const words = name.split(/[\s'-]+/).filter(Boolean);
  return (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
}

/**
 * A Sonata set's emblem, sized by `className`. Older sets ship an emblem image;
 * for the rest (and on load failure) it falls back to a rounded monogram, so the
 * tile is always present and labelled via its title.
 */
export function SonataIcon({
  sonata,
  className = "h-5 w-5",
}: {
  sonata: Sonata;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (sonata.icon && !failed)
    return (
      <img
        src={sonata.icon}
        alt={sonata.name}
        title={sonata.name}
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
        className={`${className} shrink-0 rounded-full object-contain`}
      />
    );
  return (
    <span
      title={sonata.name}
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-[var(--color-panel2)] text-[8px] font-semibold uppercase leading-none text-slate-300 ring-1 ring-[var(--color-edge)]`}
    >
      {sonataMonogram(sonata.name)}
    </span>
  );
}

export function RarityStars({ rarity }: { rarity: number }) {
  const r = RARITY[rarity] ?? RARITY[3];
  return (
    <span className="text-[11px] leading-none tracking-tight" style={{ color: r.color }}>
      {"★".repeat(rarity)}
    </span>
  );
}
