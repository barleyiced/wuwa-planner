import { useMemo, useState } from "react";
import {
  ECHO_SLOTS,
  MAX_SONATA,
  SONATA,
  sonataPiecesUsed,
  type Character,
  type SonataPick,
} from "../game";
import type { PlanApi } from "../store";
import { SonataIcon } from "./Icon";
import { Modal } from "./Modal";

/**
 * Multi-select Sonata picker for one slot. Each set lists its activation tiers as
 * buttons — a 2/5pc set offers both 2 and 5, single-tier sets (3pc, 1pc) just one —
 * so you choose how many pieces you run it at. A selection must fit the 5-echo budget,
 * so tiers that no longer fit are dimmed. Selection is a build note only (no inventory).
 */
export function SonataPicker({
  plan,
  teamId,
  slotIndex,
  character,
  selected,
  onClose,
}: {
  plan: PlanApi;
  teamId: string;
  slotIndex: number;
  character: Character | null;
  selected: SonataPick[];
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const pickById = useMemo(() => new Map(selected.map((p) => [p.id, p])), [selected]);
  const used = sonataPiecesUsed(selected);
  const atSetCap = selected.length >= MAX_SONATA;

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? SONATA.filter((s) => s.name.toLowerCase().includes(needle)) : SONATA;
  }, [q]);

  return (
    <Modal
      title={character ? `Sonata sets · ${character.name}` : "Sonata sets"}
      subtitle={`${used} / ${ECHO_SLOTS} echoes · tap a set's piece count to run it`}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
    >
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--color-edge)] bg-[var(--color-panel)] px-4 py-3">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Sonata sets…"
          className="w-full rounded-lg border border-[var(--color-edge)] bg-[var(--color-panel2)] px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-sky-500"
        />
        {selected.length > 0 && (
          <button
            onClick={() =>
              selected.forEach((p) => plan.setSlotSonata(teamId, slotIndex, p.id, p.pieces))
            }
            className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-500/10"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-1.5 p-4 sm:grid-cols-2">
        {results.map((s) => {
          const pick = pickById.get(s.id);
          const usedOthers = used - (pick?.pieces ?? 0);
          return (
            <div
              key={s.id}
              className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition ${
                pick ? "border-sky-400/70 bg-sky-400/10" : "border-[var(--color-edge)]"
              }`}
            >
              <SonataIcon sonata={s} className="h-8 w-8" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
              <span className="flex shrink-0 gap-1">
                {s.pieces.map((tier) => {
                  const active = pick?.pieces === tier;
                  const fits = usedOthers + tier <= ECHO_SLOTS;
                  const disabled = !active && ((!pick && atSetCap) || !fits);
                  return (
                    <button
                      key={tier}
                      onClick={() =>
                        !disabled && plan.setSlotSonata(teamId, slotIndex, s.id, tier)
                      }
                      disabled={disabled}
                      title={
                        disabled
                          ? !pick && atSetCap
                            ? `Up to ${MAX_SONATA} sets`
                            : "Not enough echoes left"
                          : `Run as ${tier}-piece`
                      }
                      className={`min-w-[2.1rem] rounded-md border px-1.5 py-1 text-[11px] font-semibold transition ${
                        active
                          ? "border-sky-400 bg-sky-400 text-slate-900"
                          : disabled
                          ? "cursor-not-allowed border-[var(--color-edge)] text-slate-500 opacity-40"
                          : "border-[var(--color-edge)] text-slate-300 hover:border-sky-500/60 hover:bg-white/5"
                      }`}
                    >
                      {tier}pc
                    </button>
                  );
                })}
              </span>
            </div>
          );
        })}
        {results.length === 0 && (
          <div className="col-span-full py-10 text-center text-sm text-slate-500">
            No Sonata sets match “{q}”.
          </div>
        )}
      </div>
    </Modal>
  );
}
