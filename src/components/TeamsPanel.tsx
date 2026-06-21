import { useMemo, useState } from "react";
import { MAX_TEAMS, type PlanApi, type Team } from "../store";
import {
  SONATA_BY_ID,
  WEAPON_TYPES,
  elementOf,
  vigorGroupKey,
  vigorOf,
  type GameData,
} from "../game";
import { CharIcon, SonataIcon, WeaponIcon, WeaponTypeIcon } from "./Icon";
import { CharacterPicker } from "./CharacterPicker";
import { WeaponPicker } from "./WeaponPicker";
import { SonataPicker } from "./SonataPicker";

type Editing = { teamId: string; slot: number; mode: "char" | "weapon" | "sonata" } | null;

export function TeamsPanel({ data, plan }: { data: GameData; plan: PlanApi }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const endDrag = () => {
    setDragId(null);
    setOverIndex(null);
  };

  const dropOn = (index: number) => {
    if (dragId) plan.reorderTeam(dragId, index);
    endDrag();
  };

  const editTeam = editing && plan.state.teams.find((t) => t.id === editing.teamId);
  const editSlot = editTeam ? editTeam.slots[editing!.slot] : null;
  const editChar = editSlot?.characterId ? data.characterById[editSlot.characterId] : null;

  // Resonators placed in more teams than their Vigor allows. The picker prevents
  // this for new picks, but imports (and 2-Vigor healers used a 3rd time) can
  // still produce it, so flag any offenders on their team cards.
  const overVigorIds = useMemo(() => {
    const groupCount: Record<string, number> = {};
    for (const t of plan.state.teams) {
      for (const sl of t.slots) {
        const c = sl.characterId ? data.characterById[sl.characterId] : null;
        if (c) {
          const k = vigorGroupKey(c);
          groupCount[k] = (groupCount[k] ?? 0) + 1;
        }
      }
    }
    const over = new Set<string>();
    for (const t of plan.state.teams) {
      for (const sl of t.slots) {
        const c = sl.characterId ? data.characterById[sl.characterId] : null;
        if (c && groupCount[vigorGroupKey(c)] > vigorOf(c.id)) over.add(c.id);
      }
    }
    return over;
  }, [plan.state.teams, data]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Teams</h2>
          <p className="text-xs text-slate-400">
            {plan.state.teams.length} / {MAX_TEAMS} teams · drag a card by its handle to reorder ·
            weapons can't be shared beyond owned copies
          </p>
        </div>
        <button
          onClick={plan.addTeam}
          disabled={plan.state.teams.length >= MAX_TEAMS}
          className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Add team
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {plan.state.teams.map((team, i) => (
          <TeamCard
            key={team.id}
            team={team}
            index={i}
            count={plan.state.teams.length}
            data={data}
            plan={plan}
            overVigorIds={overVigorIds}
            isDragging={dragId === team.id}
            isDropTarget={dragId != null && dragId !== team.id && overIndex === i}
            onDragStart={() => setDragId(team.id)}
            onDragEnterCard={() => dragId && setOverIndex(i)}
            onDropCard={() => dropOn(i)}
            onDragEndCard={endDrag}
            onEdit={(slot, mode) => setEditing({ teamId: team.id, slot, mode })}
          />
        ))}
      </div>

      {plan.state.teams.length === 0 && (
        <div className="py-16 text-center text-sm text-slate-500">
          No teams yet. Add one to start planning.
        </div>
      )}

      {editing && editing.mode === "char" && (
        <CharacterPicker
          data={data}
          plan={plan}
          current={editSlot?.characterId ?? null}
          disabledIds={
            new Set(
              (editTeam ? editTeam.slots : [])
                .filter((_, i) => i !== editing.slot)
                .map((s) => s.characterId)
                .filter((id): id is string => id != null)
            )
          }
          onPick={(cid) => plan.setSlotCharacter(editing.teamId, editing.slot, cid)}
          onClose={() => setEditing(null)}
        />
      )}
      {editing && editing.mode === "weapon" && editChar && (
        <WeaponPicker
          data={data}
          plan={plan}
          character={editChar}
          current={editSlot?.weaponId ?? null}
          onPick={(wid) => plan.setSlotWeapon(editing.teamId, editing.slot, wid)}
          onClose={() => setEditing(null)}
        />
      )}
      {editing && editing.mode === "sonata" && (
        <SonataPicker
          plan={plan}
          teamId={editing.teamId}
          slotIndex={editing.slot}
          character={editChar}
          selected={editSlot?.sonataIds ?? []}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function TeamCard({
  team,
  index,
  count,
  data,
  plan,
  overVigorIds,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnterCard,
  onDropCard,
  onDragEndCard,
  onEdit,
}: {
  team: Team;
  index: number;
  count: number;
  data: GameData;
  plan: PlanApi;
  overVigorIds: Set<string>;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: () => void;
  onDragEnterCard: () => void;
  onDropCard: () => void;
  onDragEndCard: () => void;
  onEdit: (slot: number, mode: "char" | "weapon" | "sonata") => void;
}) {
  // Only arm the native drag when the user grabs the handle, so the name input
  // stays selectable/editable and the card body doesn't initiate a drag.
  const [armed, setArmed] = useState(false);

  const slotColors = team.slots.map((s) => {
    const c = s.characterId ? data.characterById[s.characterId] : null;
    return c ? elementOf(c.element).color : null;
  });

  return (
    <div
      draggable={armed}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", team.id);
        onDragStart();
      }}
      onDragEnter={onDragEnterCard}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDropCard();
      }}
      onDragEnd={() => {
        setArmed(false);
        onDragEndCard();
      }}
      className={`rounded-2xl border bg-[var(--color-panel)] p-3 transition ${
        isDropTarget
          ? "border-sky-400 ring-2 ring-sky-400/60"
          : "border-[var(--color-edge)]"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <button
          title="Drag to reorder"
          aria-label="Drag to reorder team"
          onMouseDown={() => setArmed(true)}
          onMouseUp={() => setArmed(false)}
          className="flex h-7 w-6 cursor-grab items-center justify-center rounded-md text-slate-500 transition hover:bg-white/10 hover:text-white active:cursor-grabbing"
        >
          ⠿
        </button>
        <input
          value={team.name}
          onChange={(e) => plan.renameTeam(team.id, e.target.value)}
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 text-sm font-semibold outline-none hover:bg-white/5 focus:bg-white/5"
        />
        <div className="flex items-center gap-0.5 text-slate-400">
          <IconBtn title="Move up" disabled={index === 0} onClick={() => plan.moveTeam(team.id, -1)}>
            ↑
          </IconBtn>
          <IconBtn
            title="Move down"
            disabled={index === count - 1}
            onClick={() => plan.moveTeam(team.id, 1)}
          >
            ↓
          </IconBtn>
          <IconBtn title="Delete team" onClick={() => plan.removeTeam(team.id)} danger>
            ✕
          </IconBtn>
        </div>
      </div>

      <div className="mb-2 flex gap-1">
        {slotColors.map((c, i) => (
          <span
            key={i}
            className="h-1 flex-1 rounded-full"
            style={{ background: c ?? "var(--color-edge)" }}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {team.slots.map((slot, i) => (
          <Slot
            key={i}
            data={data}
            plan={plan}
            characterId={slot.characterId}
            weaponId={slot.weaponId}
            sonataIds={slot.sonataIds}
            overVigor={slot.characterId ? overVigorIds.has(slot.characterId) : false}
            onEditChar={() => onEdit(i, "char")}
            onEditWeapon={() => onEdit(i, "weapon")}
            onEditSonata={() => onEdit(i, "sonata")}
            onClear={() => plan.clearSlot(team.id, i)}
          />
        ))}
      </div>
    </div>
  );
}

function Slot({
  data,
  plan,
  characterId,
  weaponId,
  sonataIds,
  overVigor,
  onEditChar,
  onEditWeapon,
  onEditSonata,
  onClear,
}: {
  data: GameData;
  plan: PlanApi;
  characterId: string | null;
  weaponId: string | null;
  sonataIds: string[];
  overVigor: boolean;
  onEditChar: () => void;
  onEditWeapon: () => void;
  onEditSonata: () => void;
  onClear: () => void;
}) {
  const char = characterId ? data.characterById[characterId] : null;
  const weapon = weaponId ? data.weaponById[weaponId] : null;
  const overAllocated = weaponId ? plan.usage.remaining(weaponId) < 0 : false;

  if (!char) {
    return (
      <button
        onClick={onEditChar}
        className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--color-edge)] text-slate-500 transition hover:border-sky-500/60 hover:text-sky-300"
      >
        <span className="text-2xl leading-none">+</span>
        <span className="text-[10px]">Resonator</span>
      </button>
    );
  }

  const el = elementOf(char.element);
  return (
    <div
      className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 ${
        overVigor
          ? "border-amber-500/70 bg-amber-500/5"
          : "border-[var(--color-edge)] bg-[var(--color-panel2)]"
      }`}
    >
      <button
        onClick={onClear}
        title="Clear slot"
        className="absolute right-1 top-1 z-10 hidden h-5 w-5 items-center justify-center rounded-md bg-black/40 text-[11px] text-slate-300 hover:bg-rose-500/70 hover:text-white group-hover:flex"
      >
        ✕
      </button>

      <button onClick={onEditChar} className="flex flex-col items-center gap-1" title="Change Resonator">
        <CharIcon char={char} size="lg" />
        <span className="line-clamp-1 w-full text-center text-[11px] font-medium">{char.name}</span>
      </button>
      {overVigor && (
        <span
          className="text-[9px] font-semibold text-amber-400"
          title="This resonator is placed in more teams than its Vigor allows."
        >
          ⚠ over Vigor
        </span>
      )}

      <button
        onClick={onEditWeapon}
        title={weapon ? weapon.name : "Assign weapon"}
        className={`flex w-full items-center gap-1.5 rounded-lg border px-1.5 py-1 text-left transition ${
          overAllocated
            ? "border-amber-500/70 bg-amber-500/10"
            : weapon
            ? "border-[var(--color-edge)] hover:bg-white/5"
            : "border-dashed border-[var(--color-edge)] text-slate-500 hover:border-sky-500/60 hover:text-sky-300"
        }`}
      >
        {weapon ? (
          <>
            <WeaponIcon weapon={weapon} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-[10px] font-medium leading-tight">
                {weapon.name}
              </span>
              {overAllocated && (
                <span className="text-[9px] text-amber-400">over-assigned</span>
              )}
            </span>
          </>
        ) : (
          <span className="flex w-full items-center justify-center gap-1 py-1 text-[10px]">
            + <WeaponTypeIcon type={char.weaponType} className="h-3.5 w-3.5" />
            {WEAPON_TYPES[char.weaponType]}
          </span>
        )}
      </button>

      <button
        onClick={onEditSonata}
        title={
          sonataIds.length
            ? sonataIds.map((id) => SONATA_BY_ID[id]?.name).filter(Boolean).join(" · ")
            : "Assign Sonata sets"
        }
        className={`flex w-full items-center justify-center gap-1 rounded-lg border py-1 transition ${
          sonataIds.length
            ? "border-[var(--color-edge)] hover:bg-white/5"
            : "border-dashed border-[var(--color-edge)] text-slate-500 hover:border-sky-500/60 hover:text-sky-300"
        }`}
      >
        {sonataIds.length ? (
          sonataIds.map(
            (id) =>
              SONATA_BY_ID[id] && <SonataIcon key={id} sonata={SONATA_BY_ID[id]} className="h-4 w-4" />
          )
        ) : (
          <span className="text-[9px]">+ Sonata</span>
        )}
      </button>
      <span className="sr-only">{el.name}</span>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-sm transition disabled:opacity-25 ${
        danger ? "hover:bg-rose-500/20 hover:text-rose-300" : "hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
