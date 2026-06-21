import { useMemo, useState } from "react";
import { WEAPON_TYPES, type Character, type GameData } from "../game";
import type { PlanApi } from "../store";
import { Modal } from "./Modal";
import { FilterChip } from "./CharacterPicker";
import { WeaponRow } from "./WeaponRow";

export function WeaponPicker({
  data,
  plan,
  character,
  current,
  onPick,
  onClose,
}: {
  data: GameData;
  plan: PlanApi;
  character: Character;
  current: string | null;
  onPick: (weaponId: string | null) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [rarity, setRarity] = useState<number | null>(null);
  const [ownedOnly, setOwnedOnly] = useState(true);

  const matching = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.weapons
      .filter((w) => w.type === character.weaponType)
      .filter((w) => (needle ? w.name.toLowerCase().includes(needle) : true))
      .filter((w) => (rarity != null ? w.rarity === rarity : true))
      .filter((w) => (ownedOnly ? plan.usage.owned(w.id) > 0 : true));
  }, [data.weapons, character.weaponType, q, rarity, ownedOnly, plan.usage]);

  // Weapons this same resonator already holds in another team. It's one unit, so
  // equipping such a weapon here costs no extra copy (the pair is already counted).
  const reusableForChar = useMemo(() => {
    const s = new Set<string>();
    for (const t of plan.state.teams) {
      for (const sl of t.slots) {
        if (sl.characterId === character.id && sl.weaponId) s.add(sl.weaponId);
      }
    }
    return s;
  }, [plan.state.teams, character.id]);

  return (
    <Modal
      title={`Weapon for ${character.name}`}
      subtitle={`${WEAPON_TYPES[character.weaponType]} · pick from your inventory`}
      onClose={onClose}
    >
      <div className="sticky top-0 z-10 space-y-2 border-b border-[var(--color-edge)] bg-[var(--color-panel)] px-4 py-3">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${WEAPON_TYPES[character.weaponType]}…`}
          className="w-full rounded-lg border border-[var(--color-edge)] bg-[var(--color-panel2)] px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-500"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {[5, 4, 3].map((r) => (
            <FilterChip key={r} active={rarity === r} onClick={() => setRarity(rarity === r ? null : r)}>
              {r}★
            </FilterChip>
          ))}
          <span className="mx-1 h-4 w-px bg-[var(--color-edge)]" />
          <FilterChip active={ownedOnly} onClick={() => setOwnedOnly(true)}>
            In my inventory
          </FilterChip>
          <FilterChip active={!ownedOnly} onClick={() => setOwnedOnly(false)}>
            All weapons
          </FilterChip>
          {current && (
            <button
              onClick={() => {
                onPick(null);
                onClose();
              }}
              className="ml-auto rounded-lg px-2.5 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-500/10"
            >
              Unequip
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 p-4">
        {matching.map((w) => {
          const equipped = current === w.id;
          return (
            <WeaponRow
              key={w.id}
              weapon={w}
              owned={plan.usage.owned(w.id)}
              remaining={plan.usage.remaining(w.id)}
              onAdjust={(d) => plan.adjustOwned(w.id, d)}
              equip={{
                equipped,
                reuse: reusableForChar.has(w.id),
                onEquip: () => {
                  onPick(equipped ? null : w.id);
                  onClose();
                },
              }}
            />
          );
        })}
        {matching.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-500">
            {ownedOnly
              ? "You don't own any matching weapons yet. Switch to “All weapons” to add some."
              : "No weapons match those filters."}
          </div>
        )}
      </div>
    </Modal>
  );
}
