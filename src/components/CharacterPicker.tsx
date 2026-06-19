import { useMemo, useState } from "react";
import {
  ELEMENTS,
  WEAPON_TYPES,
  vigorGroupKey,
  vigorOf,
  type Character,
  type GameData,
} from "../game";
import type { PlanApi } from "../store";
import { CharPortrait, ElementIcon, WeaponTypeIcon } from "./Icon";
import { Modal } from "./Modal";

export function CharacterPicker({
  data,
  plan,
  current,
  disabledIds,
  onPick,
  onClose,
}: {
  data: GameData;
  plan: PlanApi;
  current: string | null;
  /** Resonators already placed in other slots of this team (can't repeat). */
  disabledIds: Set<string>;
  onPick: (characterId: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [element, setElement] = useState<number | null>(null);
  const [weaponType, setWeaponType] = useState<number | null>(null);
  const [rarity, setRarity] = useState<number | null>(null);

  // Vigor spent per accounting group across the whole plan (Rovers share a group).
  const groupUsed = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of plan.state.teams) {
      for (const sl of t.slots) {
        const ch = sl.characterId ? data.characterById[sl.characterId] : null;
        if (ch) {
          const k = vigorGroupKey(ch);
          m[k] = (m[k] ?? 0) + 1;
        }
      }
    }
    return m;
  }, [plan.state.teams, data]);

  // The slot being edited will be vacated, so its occupant shouldn't count
  // against candidates sharing its group (lets you swap e.g. one Rover element
  // for another in the same slot).
  const currentChar = current ? data.characterById[current] : null;
  const currentGroup = currentChar ? vigorGroupKey(currentChar) : null;

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.characters.filter((c) => {
      if (needle && !c.name.toLowerCase().includes(needle)) return false;
      if (element != null && c.element !== element) return false;
      if (weaponType != null && c.weaponType !== weaponType) return false;
      if (rarity != null && c.rarity !== rarity) return false;
      return true;
    });
  }, [data.characters, q, element, weaponType, rarity]);

  return (
    <Modal
      title="Choose a Resonator"
      subtitle={`${results.length} of ${data.characters.length}`}
      onClose={onClose}
      maxWidthClass="max-w-6xl"
    >
      <div className="sticky top-0 z-10 space-y-2 border-b border-[var(--color-edge)] bg-[var(--color-panel)] px-4 py-3">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Resonators…"
          className="w-full rounded-lg border border-[var(--color-edge)] bg-[var(--color-panel2)] px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-sky-500"
        />
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(ELEMENTS).map(([id, el]) => {
            const n = Number(id);
            const on = element === n;
            return (
              <FilterChip
                key={id}
                active={on}
                color={el.color}
                onClick={() => setElement(on ? null : n)}
              >
                <span className="flex items-center gap-1">
                  <ElementIcon element={n} className="h-3.5 w-3.5" />
                  {el.name}
                </span>
              </FilterChip>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(WEAPON_TYPES).map(([id, name]) => {
            const n = Number(id);
            const on = weaponType === n;
            return (
              <FilterChip key={id} active={on} onClick={() => setWeaponType(on ? null : n)}>
                <span className="flex items-center gap-1">
                  <WeaponTypeIcon type={n} className="h-3.5 w-3.5" />
                  {name}
                </span>
              </FilterChip>
            );
          })}
          {[5, 4].map((r) => {
            const on = rarity === r;
            return (
              <FilterChip key={r} active={on} onClick={() => setRarity(on ? null : r)}>
                {r}★
              </FilterChip>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-2.5 p-4">
        {results.map((c) => {
          const isCurrent = c.id === current;
          const group = vigorGroupKey(c);
          // Don't count the slot we're editing against its own group.
          const used = (groupUsed[group] ?? 0) - (group === currentGroup ? 1 : 0);
          const inTeam = disabledIds.has(c.id);
          const noVigor = used >= vigorOf(c.id);
          const disabled = !isCurrent && (inTeam || noVigor);
          return (
            <CharacterCard
              key={c.id}
              char={c}
              selected={isCurrent}
              disabled={disabled}
              disabledReason={inTeam ? "In this team" : "No Vigor left"}
              used={Math.max(0, used)}
              onPick={() => {
                if (disabled) return;
                onPick(c.id);
                onClose();
              }}
            />
          );
        })}
        {results.length === 0 && (
          <div className="col-span-full py-10 text-center text-sm text-slate-500">
            No Resonators match those filters.
          </div>
        )}
      </div>
    </Modal>
  );
}

function CharacterCard({
  char,
  selected,
  disabled,
  disabledReason,
  used,
  onPick,
}: {
  char: Character;
  selected: boolean;
  disabled: boolean;
  disabledReason: string;
  used: number;
  onPick: () => void;
}) {
  const max = vigorOf(char.id);
  return (
    <button
      onClick={onPick}
      disabled={disabled}
      title={disabled ? disabledReason : char.name}
      aria-disabled={disabled}
      className={`group relative overflow-hidden rounded-xl border transition ${
        selected
          ? "border-sky-400 ring-2 ring-sky-400/50"
          : "border-[var(--color-edge)] hover:border-sky-500/60"
      } ${disabled ? "cursor-not-allowed" : "hover:-translate-y-0.5"}`}
    >
      <div className={disabled ? "opacity-35 grayscale" : ""}>
        <CharPortrait char={char} />
      </div>

      <VigorPips used={used} max={max} />

      {disabled && (
        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-200">
          {disabledReason}
        </span>
      )}
    </button>
  );
}

/** Small Vigor dots in the corner: filled = spent, hollow = available. */
function VigorPips({ used, max }: { used: number; max: number }) {
  return (
    <span
      className="absolute right-1 top-1 flex gap-0.5 rounded-full bg-black/55 px-1 py-0.5 backdrop-blur-sm"
      title={`${Math.max(0, max - used)} of ${max} Vigor left`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${
            i < used ? "bg-amber-400" : "bg-white/35 ring-1 ring-white/50"
          }`}
        />
      ))}
    </span>
  );
}

export function FilterChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
        active
          ? "border-transparent text-slate-900"
          : "border-[var(--color-edge)] text-slate-300 hover:bg-white/5"
      }`}
      style={active ? { background: color ?? "#7dd3fc" } : undefined}
    >
      {children}
    </button>
  );
}
