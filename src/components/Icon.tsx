import { useState } from "react";
import {
  RARITY,
  WEAPON_TYPES,
  WEAPON_TYPE_ICONS,
  elementOf,
  type Character,
  type Weapon,
} from "../game";

/** Image that fades in and hides itself if the asset fails to load. */
function Img({ src, alt, className }: { src: string; alt: string; className?: string }) {
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
      <Img src={char.icon} alt={char.name} className="h-full w-full object-cover" />
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
      <Img src={weapon.icon} alt={weapon.name} className="h-full w-full object-contain p-1" />
    </div>
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
