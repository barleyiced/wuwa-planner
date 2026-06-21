import { useMemo, useState } from "react";
import {
  ECHO_SLOTS,
  MAX_SONATA,
  SONATA,
  sonataMinPieces,
  sonataPiecesUsed,
  type Character,
} from "../game";
import type { PlanApi } from "../store";
import { SonataIcon } from "./Icon";
import { Modal } from "./Modal";

/**
 * Multi-select Sonata picker for one slot. Each set activates at fixed echo counts
 * (2pc/5pc, 3pc, or 1pc) shown as a badge; a selection must fit the 5-echo budget,
 * so sets that no longer fit are dimmed until one is removed. Selection is a build
 * note only (no inventory), so there's nothing to validate against other teams.
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
  selected: string[];
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const used = sonataPiecesUsed(selected);
  const atSetCap = selected.length >= MAX_SONATA;

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? SONATA.filter((s) => s.name.toLowerCase().includes(needle)) : SONATA;
  }, [q]);

  return (
    <Modal
      title={character ? `Sonata sets · ${character.name}` : "Sonata sets"}
      subtitle={`${used} / ${ECHO_SLOTS} echoes · pick the set(s) this resonator runs`}
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
            onClick={() => selected.forEach((id) => plan.toggleSlotSonata(teamId, slotIndex, id))}
            className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-500/10"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-1.5 p-4 sm:grid-cols-2">
        {results.map((s) => {
          const on = selectedSet.has(s.id);
          const noRoom = used + sonataMinPieces(s.id) > ECHO_SLOTS;
          const disabled = !on && (atSetCap || noRoom);
          return (
            <button
              key={s.id}
              onClick={() => !disabled && plan.toggleSlotSonata(teamId, slotIndex, s.id)}
              disabled={disabled}
              title={
                disabled
                  ? noRoom
                    ? "Not enough echoes left"
                    : `Up to ${MAX_SONATA} sets`
                  : s.name
              }
              className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                on
                  ? "border-sky-400 bg-sky-400/10"
                  : disabled
                  ? "cursor-not-allowed border-[var(--color-edge)] opacity-40"
                  : "border-[var(--color-edge)] hover:border-sky-500/60 hover:bg-white/5"
              }`}
            >
              <SonataIcon sonata={s} className="h-8 w-8" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
              <span
                className="shrink-0 rounded-full border border-[var(--color-edge)] px-1.5 py-0.5 text-[10px] font-medium text-slate-400"
                title={`Activates at ${s.pieces.join(" / ")}-piece`}
              >
                {s.pieces.join("/")}pc
              </span>
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                  on ? "border-sky-400 bg-sky-400 text-slate-900" : "border-[var(--color-edge)]"
                }`}
              >
                {on ? "✓" : ""}
              </span>
            </button>
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
