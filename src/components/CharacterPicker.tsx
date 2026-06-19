import { useMemo, useState } from "react";
import { ELEMENTS, WEAPON_TYPES, type Character, type GameData } from "../game";
import { CharIcon, ElementIcon, RarityStars } from "./Icon";
import { Modal } from "./Modal";

export function CharacterPicker({
  data,
  current,
  onPick,
  onClose,
}: {
  data: GameData;
  current: string | null;
  onPick: (characterId: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [element, setElement] = useState<number | null>(null);
  const [weaponType, setWeaponType] = useState<number | null>(null);
  const [rarity, setRarity] = useState<number | null>(null);

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
      title="Choose a resonator"
      subtitle={`${results.length} of ${data.characters.length}`}
      onClose={onClose}
    >
      <div className="sticky top-0 z-10 space-y-2 border-b border-[var(--color-edge)] bg-[var(--color-panel)] px-4 py-3">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search resonators…"
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
                {name}
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

      <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2 p-4">
        {results.map((c) => (
          <CharacterCard
            key={c.id}
            char={c}
            selected={c.id === current}
            onPick={() => {
              onPick(c.id);
              onClose();
            }}
          />
        ))}
        {results.length === 0 && (
          <div className="col-span-full py-10 text-center text-sm text-slate-500">
            No resonators match those filters.
          </div>
        )}
      </div>
    </Modal>
  );
}

function CharacterCard({
  char,
  selected,
  onPick,
}: {
  char: Character;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition hover:bg-white/5 ${
        selected ? "border-sky-400 bg-sky-400/10" : "border-transparent"
      }`}
    >
      <CharIcon char={char} size="md" />
      <span className="line-clamp-1 w-full text-[11px] font-medium">{char.name}</span>
      <span className="flex items-center gap-1">
        <RarityStars rarity={char.rarity} />
        <ElementIcon element={char.element} className="h-3.5 w-3.5" />
      </span>
    </button>
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
