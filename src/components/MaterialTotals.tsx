import { useMemo, useState } from "react";
import type { MaterialData } from "../game";
import {
  CAT_LABELS,
  DAILY_WAVEPLATE,
  planFarming,
  type FarmCategory,
  type FarmRow,
} from "../materials";
import { ItemIcon } from "./Icon";
import { CountStepper, TILE_MARK, useCloseOnOutside } from "./MaterialInventory";

/** "3.2 days" / "<1 day" / "—" from a fractional day count. */
function daysLabel(days: number): string {
  if (days < 0.05) return "—";
  if (days < 1) return "<1 day";
  return `${days.toFixed(days < 10 ? 1 : 0)} days`;
}

const fmt = (n: number) => Math.round(n).toLocaleString();

/**
 * The full-width "still to farm" plan, grouped by the Inventory tab's farming-source
 * categories. Each category nets the gross requirement against owned counts (folding
 * in lower→higher rarity synthesis) and estimates the Waveplate + days left to farm.
 *
 * Mats render as tiles (icon + name + remaining); tapping one reveals an owned-count
 * stepper that writes straight to the shared inventory, so edits here and on the
 * Inventory tab stay in sync both ways.
 */
export function MaterialTotals({
  totals,
  inventory,
  mat,
  setOwned,
}: {
  totals: Record<number, number>;
  inventory: Record<number, number>;
  mat: MaterialData;
  setOwned: (itemId: number, qty: number) => void;
}) {
  const plan = useMemo(
    () => planFarming(totals, inventory, mat),
    [totals, inventory, mat]
  );
  const [openId, setOpenId] = useState<number | null>(null);

  if (plan.totalItems === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-edge)] p-10 text-center text-sm text-slate-500">
        Add a Resonator or weapon and set a target to see what to farm.
      </div>
    );
  }

  const allDone = plan.remainingItems === 0;

  return (
    <div className="space-y-4">
      {/* summary bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-[var(--color-edge)] bg-[var(--color-panel)] px-4 py-3">
        <div>
          <div className="text-lg font-semibold leading-none">Still to farm</div>
          <div className="mt-1 text-xs text-slate-500">
            {allDone
              ? "Everything's covered by your inventory."
              : `${plan.remainingItems} of ${plan.totalItems} materials left`}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-6">
          <Stat label="Waveplate" value={fmt(plan.totalWaveplate)} />
          <Stat label="Est. days" value={daysLabel(plan.totalDays)} />
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Waveplate is charged by whole farming rounds — 40 per round for EXP, Shell Credit
        and Forgery mats, 60 for Ascension and Advanced Skill — so any shortfall in a
        category costs at least one full round. Days assume {DAILY_WAVEPLATE} Waveplate/day;
        surplus of a lower rarity is synthesized up to cover higher tiers. Overworld
        Materials and Specialties cost no Waveplate, and Advanced Skill mats are entry-gated,
        so neither counts toward the days estimate. Tap a material to set how many you own.
      </p>

      {/* categories laid out in four columns */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {plan.categories.map((c) => (
          <CategoryCard
            key={c.cat}
            category={c}
            inventory={inventory}
            setOwned={setOwned}
            openId={openId}
            setOpenId={setOpenId}
          />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right leading-tight">
      <div className="text-base font-semibold tabular-nums text-slate-100">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function CategoryCard({
  category,
  inventory,
  setOwned,
  openId,
  setOpenId,
}: {
  category: FarmCategory;
  inventory: Record<number, number>;
  setOwned: (itemId: number, qty: number) => void;
  openId: number | null;
  setOpenId: (id: number | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-edge)] bg-[var(--color-panel)]">
      <div className="flex items-baseline gap-2 border-b border-[var(--color-edge)] px-3 py-2.5">
        <h3 className="text-sm font-semibold">{CAT_LABELS[category.cat]}</h3>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2 p-2.5">
        {category.rows.map((r) => (
          <MatTile
            key={r.id}
            row={r}
            owned={inventory[r.id] ?? 0}
            setOwned={setOwned}
            open={openId === r.id}
            setOpenId={setOpenId}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * One material tile: icon + name + remaining-to-farm. Tapping it reveals an owned-count
 * stepper bound to the shared inventory (so editing here updates the Inventory tab too).
 */
function MatTile({
  row,
  owned,
  setOwned,
  open,
  setOpenId,
}: {
  row: FarmRow;
  owned: number;
  setOwned: (itemId: number, qty: number) => void;
  open: boolean;
  setOpenId: (id: number | null) => void;
}) {
  useCloseOnOutside(open, () => setOpenId(null));
  const done = row.remaining === 0;
  return (
    <div
      {...{ [TILE_MARK]: "" }}
      className={`flex flex-col items-center gap-1.5 rounded-xl border bg-[var(--color-panel)] p-2 transition ${
        open ? "col-span-2 border-sky-500/60" : "border-[var(--color-edge)]"
      }`}
    >
      <button
        onClick={() => setOpenId(open ? null : row.id)}
        title={`${row.item.name} — own ${row.owned.toLocaleString()} of ${row.need.toLocaleString()}`}
        className="transition hover:opacity-90"
        aria-expanded={open}
      >
        <ItemIcon item={row.item} size="sm" />
      </button>
      <span className="line-clamp-2 h-8 text-center text-[11px] leading-tight text-slate-300">
        {row.item.name}
      </span>
      {open ? (
        <CountStepper value={owned} onChange={(v) => setOwned(row.id, v)} />
      ) : done ? (
        <span className="text-xs font-medium text-emerald-400">✓ done</span>
      ) : (
        <span className="text-sm font-semibold tabular-nums text-amber-300">
          {row.remaining.toLocaleString()}
        </span>
      )}
    </div>
  );
}
