import { useState } from "react";
import { RARITY, elementOf, type Character, type Weapon } from "../game";

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
