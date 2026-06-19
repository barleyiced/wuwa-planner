import { useMemo, useState } from "react";
import { WEAPON_TYPES, type GameData } from "../game";
import type { PlanApi } from "../store";
import { FilterChip } from "./CharacterPicker";
import { WeaponTypeIcon } from "./Icon";
import { WeaponRow } from "./WeaponRow";

export function InventoryPanel({ data, plan }: { data: GameData; plan: PlanApi }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<number | null>(null);
  const [rarity, setRarity] = useState<number | null>(null);
  const [ownedOnly, setOwnedOnly] = useState(false);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.weapons
      .filter((w) => (needle ? w.name.toLowerCase().includes(needle) : true))
      .filter((w) => (type != null ? w.type === type : true))
      .filter((w) => (rarity != null ? w.rarity === rarity : true))
      .filter((w) => (ownedOnly ? plan.usage.owned(w.id) > 0 : true));
  }, [data.weapons, q, type, rarity, ownedOnly, plan.usage]);

  const totals = useMemo(() => {
    let copies = 0;
    let distinct = 0;
    let over = 0;
    for (const wid of Object.keys(plan.state.inventory)) {
      copies += plan.state.inventory[wid];
      distinct++;
    }
    for (const wid of new Set(Object.keys(plan.usage.used))) {
      if (plan.usage.remaining(wid) < 0) over++;
    }
    return { copies, distinct, over };
  }, [plan.state.inventory, plan.usage]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold">Weapon inventory</h2>
          <p className="text-xs text-slate-400">
            {totals.distinct} distinct · {totals.copies} copies owned
            {totals.over > 0 && (
              <span className="text-amber-400"> · {totals.over} over-assigned</span>
            )}
          </p>
        </div>
      </div>

      <div className="sticky top-[57px] z-10 -mx-4 space-y-2 border-b border-[var(--color-edge)] bg-[var(--color-bg)]/85 px-4 py-3 backdrop-blur">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search weapons…"
          className="w-full rounded-lg border border-[var(--color-edge)] bg-[var(--color-panel2)] px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-sky-500"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {Object.entries(WEAPON_TYPES).map(([id, name]) => {
            const n = Number(id);
            return (
              <FilterChip key={id} active={type === n} onClick={() => setType(type === n ? null : n)}>
                <span className="flex items-center gap-1">
                  <WeaponTypeIcon type={n} className="h-3.5 w-3.5" />
                  {name}
                </span>
              </FilterChip>
            );
          })}
          <span className="mx-1 h-4 w-px bg-[var(--color-edge)]" />
          {[5, 4, 3].map((r) => (
            <FilterChip key={r} active={rarity === r} onClick={() => setRarity(rarity === r ? null : r)}>
              {r}★
            </FilterChip>
          ))}
          <span className="mx-1 h-4 w-px bg-[var(--color-edge)]" />
          <FilterChip active={ownedOnly} onClick={() => setOwnedOnly((v) => !v)}>
            Owned only
          </FilterChip>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {list.map((w) => (
          <WeaponRow
            key={w.id}
            layout="card"
            weapon={w}
            owned={plan.usage.owned(w.id)}
            onAdjust={(d) => plan.adjustOwned(w.id, d)}
          />
        ))}
        {list.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-slate-500">No weapons match those filters.</div>
        )}
      </div>
    </div>
  );
}
