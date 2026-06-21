import { useMemo, useState, type ReactNode } from "react";
import type { MaterialData } from "../game";
import {
  CAT_LABELS,
  DAILY_WAVEPLATE,
  ROUND_WAVEPLATE,
  planFarming,
  type Cat,
  type FarmCategory,
  type FarmRow,
} from "../materials";
import { AssetImg, ItemIcon, WaveplateIcon } from "./Icon";
import { CountStepper, TILE_MARK, useCloseOnOutside } from "./MaterialInventory";

/**
 * A Resonator that needs materials from a given category, shown as a head on the card so
 * you can see who a category is for. `done` (nothing left to farm there given the shared
 * inventory) surfaces only in the head's tooltip — done item *tiles* are what get dimmed.
 */
export interface CategoryContributor {
  id: string;
  name: string;
  icon: string;
  done: boolean;
}

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
 * Categories are grouped into sections by their per-round Waveplate cost (0 / 40 / 60),
 * and each category card shows its own Waveplate total on the right of its header.
 *
 * Mats render as tiles (icon + remaining); tapping one expands it to reveal the name
 * plus an owned-count stepper that writes straight to the shared inventory, so edits
 * here and on the Inventory tab stay in sync both ways.
 */
export function MaterialTotals({
  totals,
  inventory,
  mat,
  setOwned,
  controls,
  contributors,
}: {
  totals: Record<number, number>;
  inventory: Record<number, number>;
  mat: MaterialData;
  setOwned: (itemId: number, qty: number) => void;
  /** Optional left-hand content for the summary bar (e.g. include-in-totals toggles). */
  controls?: ReactNode;
  /** Per-category Resonators that need that category's materials (with done state). */
  contributors?: Partial<Record<Cat, CategoryContributor[]>>;
}) {
  const plan = useMemo(
    () => planFarming(totals, inventory, mat),
    [totals, inventory, mat]
  );
  const [openId, setOpenId] = useState<number | null>(null);

  if (plan.totalItems === 0) {
    // `controls` present means there ARE built Resonators — the totals are empty only
    // because they're all toggled off. Keep the toggle bar visible (so they can be
    // switched back on) and say so, rather than implying nothing has been planned.
    if (controls) {
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-[var(--color-edge)] bg-[var(--color-panel)] px-4 py-3">
            {controls}
          </div>
          <div className="rounded-2xl border border-dashed border-[var(--color-edge)] p-10 text-center text-sm text-slate-500">
            No materials to farm. Tap a head above to include a Resonator, or set a target
            above its current level.
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-edge)] p-10 text-center text-sm text-slate-500">
        Add a Resonator or weapon and set a target to see what to farm.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* summary bar: toggles on the left, Waveplate / days on the right */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-[var(--color-edge)] bg-[var(--color-panel)] px-4 py-3">
        {controls}
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

      {/* categories grouped by their per-round Waveplate cost (0 / 40 / 60) */}
      {WAVEPLATE_SECTIONS.map((wp) => {
        const cats = plan.categories.filter((c) => ROUND_WAVEPLATE[c.cat] === wp);
        if (cats.length === 0) return null;
        return (
          <section key={wp} className="space-y-2.5">
            <div className="flex items-center gap-2 px-0.5">
              <WaveplateIcon className="h-5 w-5" />
              <h2 className="text-sm font-semibold text-slate-200">
                {wp} Waveplate{" "}
                <span className="text-xs font-normal text-slate-500">
                  {wp === 0 ? "· open-world gather" : "per farming round"}
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cats.map((c) => (
                <CategoryCard
                  key={c.cat}
                  category={c}
                  contributors={contributors?.[c.cat]}
                  inventory={inventory}
                  setOwned={setOwned}
                  openId={openId}
                  setOpenId={setOpenId}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Per-round Waveplate tiers the categories are grouped under, in display order. */
const WAVEPLATE_SECTIONS = [0, 40, 60] as const;

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
  contributors,
  inventory,
  setOwned,
  openId,
  setOpenId,
}: {
  category: FarmCategory;
  contributors?: CategoryContributor[];
  inventory: Record<number, number>;
  setOwned: (itemId: number, qty: number) => void;
  openId: number | null;
  setOpenId: (id: number | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-edge)] bg-[var(--color-panel)]">
      <div className="border-b border-[var(--color-edge)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{CAT_LABELS[category.cat]}</h3>
          {category.waveplate > 0 && (
            <span
              className="ml-auto flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums text-slate-300"
              title={`${fmt(category.waveplate)} Waveplate${
                category.gated ? " (entry-gated — not counted in the days estimate)" : ""
              }`}
            >
              {fmt(category.waveplate)}
              <WaveplateIcon className="h-4 w-4" />
            </span>
          )}
        </div>
        {contributors && contributors.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {contributors.map((c) => (
              <span
                key={c.id}
                title={`${c.name} — ${c.done ? "covered by inventory" : "still needs to farm"}`}
                className="h-6 w-6 overflow-hidden rounded-full border border-[var(--color-edge)]"
              >
                <AssetImg src={c.icon} alt={c.name} className="h-full w-full object-cover" />
              </span>
            ))}
          </div>
        )}
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
      } ${done && !open ? "opacity-40" : ""}`}
    >
      <button
        onClick={() => setOpenId(open ? null : row.id)}
        title={`${row.item.name} — own ${row.owned.toLocaleString()} of ${row.need.toLocaleString()}`}
        className="transition hover:opacity-90"
        aria-expanded={open}
      >
        <ItemIcon item={row.item} size="sm" />
      </button>
      {open ? (
        <>
          <span className="line-clamp-2 text-center text-[11px] leading-tight text-slate-300">
            {row.item.name}
          </span>
          <CountStepper value={owned} onChange={(v) => setOwned(row.id, v)} />
        </>
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
