import { WEAPON_TYPES, type Weapon } from "../game";
import { RarityStars, WeaponIcon, WeaponTypeIcon } from "./Icon";

export function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (delta: number) => void;
}) {
  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-[var(--color-edge)]">
      <button
        onClick={() => onChange(-1)}
        disabled={value <= 0}
        className="px-2 py-1 text-sm text-slate-300 enabled:hover:bg-white/10 disabled:opacity-30"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="w-7 text-center text-sm tabular-nums">{value}</span>
      <button
        onClick={() => onChange(1)}
        className="px-2 py-1 text-sm text-slate-300 hover:bg-white/10"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

export function WeaponRow({
  weapon,
  owned,
  remaining,
  onAdjust,
  equip,
}: {
  weapon: Weapon;
  owned: number;
  /** copies still free across the plan; only meaningful in equip mode */
  remaining?: number;
  onAdjust: (delta: number) => void;
  equip?: { equipped: boolean; onEquip: () => void };
}) {
  const canEquip =
    equip && owned > 0 && (equip.equipped || (remaining ?? 0) > 0);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-edge)] bg-[var(--color-panel2)] px-3 py-2">
      <WeaponIcon weapon={weapon} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{weapon.name}</span>
          <RarityStars rarity={weapon.rarity} />
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <WeaponTypeIcon type={weapon.type} className="h-3.5 w-3.5" />
          <span>
            {WEAPON_TYPES[weapon.type]}
            {weapon.sub ? ` · ${weapon.sub}` : ""}
            {owned > 0 && equip != null && (
              <>
                {" · "}
                <span className={remaining! <= 0 && !equip.equipped ? "text-amber-400" : "text-emerald-400"}>
                  {remaining} of {owned} free
                </span>
              </>
            )}
          </span>
        </div>
      </div>

      <Stepper value={owned} onChange={onAdjust} />

      {equip && (
        <button
          onClick={equip.onEquip}
          disabled={!canEquip && !equip.equipped}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            equip.equipped
              ? "bg-sky-500 text-white"
              : canEquip
              ? "border border-sky-500/60 text-sky-300 hover:bg-sky-500/15"
              : "cursor-not-allowed border border-[var(--color-edge)] text-slate-600"
          }`}
        >
          {equip.equipped ? "Equipped" : owned === 0 ? "Add first" : canEquip ? "Equip" : "None free"}
        </button>
      )}
    </div>
  );
}
