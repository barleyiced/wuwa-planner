import { useEffect, useMemo, useState } from "react";
import type { MaterialData, MaterialItem } from "../game";
import { categorize, CAT_LABELS, CAT_ORDER, compareByFamily, type Cat } from "../materials";
import { ItemIcon } from "./Icon";

/** Marker attribute every expandable material tile carries (see `useCloseOnOutside`). */
export const TILE_MARK = "data-mat-tile";

/**
 * Closes the open tile when the user clicks anywhere that isn't a material tile.
 * Clicks that land on *any* tile are ignored so that tile's own toggle can do the
 * switch in a single state update — closing here first would reflow the grid mid-
 * gesture (an open tile spans two columns) and swallow the click on later tiles.
 * Shared by the Inventory and Planner tabs so both behave the same.
 */
export function useCloseOnOutside(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      const el = e.target as Element | null;
      if (!el || !el.closest(`[${TILE_MARK}]`)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [active, onClose]);
}

/**
 * The "current possessions" tab: every upgrade material in the catalog with an
 * editable owned count. These counts feed the Characters tab's "still to farm"
 * list (remaining = needed − owned). Owned amounts live in the calc state.
 */
export function MaterialInventory({
  inventory,
  mat,
  setOwned,
  clearInventory,
}: {
  inventory: Record<number, number>;
  mat: MaterialData;
  setOwned: (itemId: number, qty: number) => void;
  clearInventory: () => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Cat | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  // The single farming-source bucket each item belongs to, derived from how the
  // cost bundle consumes it (items carry no category field).
  const membership = useMemo(() => categorize(mat), [mat]);

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return Object.entries(mat.items)
      .map(([id, item]) => ({ id, item }))
      .filter((r) => (needle ? r.item.name.toLowerCase().includes(needle) : true))
      .filter((r) => (cat != null ? membership[Number(r.id)] === cat : true))
      .sort((a, b) => compareByFamily(Number(a.id), Number(b.id), mat));
  }, [mat, q, cat, membership]);

  const ownedCount = Object.values(inventory).filter((n) => n > 0).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="leading-tight">
          <p className="text-sm text-slate-400">
            Enter how many of each material you already own. These counts are
            subtracted from your targets on the Characters tab.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">{ownedCount} stocked</span>
          {ownedCount > 0 && (
            <button
              onClick={clearInventory}
              className="rounded-lg border border-[var(--color-edge)] px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-rose-500/50 hover:text-rose-300"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {CAT_ORDER.map((c) => (
          <button
            key={c}
            onClick={() => setCat(cat === c ? null : c)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              cat === c
                ? "bg-sky-500 text-white"
                : "bg-[var(--color-panel2)] text-slate-300 hover:bg-white/5"
            }`}
          >
            {CAT_LABELS[c]}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search materials…"
          className="ml-auto w-48 rounded-lg border border-[var(--color-edge)] bg-[var(--color-panel2)] px-3 py-1.5 text-sm outline-none placeholder:text-slate-500 focus:border-sky-500"
        />
      </div>

      <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2.5">
        {items.map(({ id, item }) => (
          <InvTile
            key={id}
            id={Number(id)}
            item={item}
            owned={inventory[Number(id)] || 0}
            setOwned={setOwned}
            open={openId === Number(id)}
            setOpenId={setOpenId}
          />
        ))}
        {items.length === 0 && (
          <div className="col-span-full py-10 text-center text-sm text-slate-500">
            No materials match those filters.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * One material tile: icon + name, showing the owned count. Tapping it reveals the
 * editable stepper (one tile open at a time; clicking away closes it), matching the
 * Planner tab's tiles.
 */
function InvTile({
  id,
  item,
  owned,
  setOwned,
  open,
  setOpenId,
}: {
  id: number;
  item: MaterialItem;
  owned: number;
  setOwned: (itemId: number, qty: number) => void;
  open: boolean;
  setOpenId: (id: number | null) => void;
}) {
  useCloseOnOutside(open, () => setOpenId(null));
  return (
    <div
      {...{ [TILE_MARK]: "" }}
      className={`flex flex-col items-center gap-1.5 rounded-xl border bg-[var(--color-panel)] p-2 transition ${
        open ? "col-span-2 border-sky-500/60" : "border-[var(--color-edge)]"
      }`}
    >
      <button
        onClick={() => setOpenId(open ? null : id)}
        className="transition hover:opacity-90"
        aria-expanded={open}
        title={item.name}
      >
        <ItemIcon item={item} size="md" />
      </button>
      <span className="line-clamp-2 h-8 text-center text-[11px] leading-tight text-slate-300">
        {item.name}
      </span>
      {open ? (
        <CountStepper value={owned} onChange={(v) => setOwned(id, v)} />
      ) : (
        <span
          className={`text-sm font-semibold tabular-nums ${
            owned > 0 ? "text-slate-200" : "text-slate-600"
          }`}
        >
          {owned.toLocaleString()}
        </span>
      )}
    </div>
  );
}

/**
 * −/+ counter matching the skill planner's stepper aesthetic, but with a typeable
 * middle since material counts can run into the thousands. Clamped to ≥ 0.
 */
export function CountStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const set = (v: number) => onChange(Math.max(0, Number.isFinite(v) ? v : 0));
  return (
    <div className="flex w-full items-center overflow-hidden rounded-lg border border-[var(--color-edge)] bg-[var(--color-panel2)] focus-within:border-sky-500">
      <button
        onClick={() => set(value - 1)}
        disabled={value <= 0}
        className="px-2 py-1 text-sm text-slate-300 enabled:hover:bg-white/10 disabled:opacity-30"
        aria-label="Decrease"
      >
        −
      </button>
      <input
        autoFocus
        type="text"
        inputMode="numeric"
        value={value ? value.toLocaleString() : ""}
        placeholder="0"
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          set(digits ? Number(digits) : 0);
        }}
        onFocus={(e) => e.target.select()}
        className="min-w-0 flex-1 bg-transparent px-0.5 py-1 text-center text-sm tabular-nums text-slate-200 outline-none placeholder:text-slate-500"
      />
      <button
        onClick={() => set(value + 1)}
        className="px-2 py-1 text-sm text-slate-300 hover:bg-white/10"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}
