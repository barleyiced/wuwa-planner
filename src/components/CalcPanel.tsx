import { useMemo, useState } from "react";
import {
  ELEMENTS,
  itemIconUrl,
  SKILL_LABELS,
  SKILL_ORDER,
  WEAPON_TYPES,
  type Character,
  type ForteNode,
  type GameData,
  type MaterialCharacter,
  type MaterialSkill,
  type SkillKey,
} from "../game";
import {
  goalCost,
  LEVEL_STOPS,
  MAX_GOALS,
  MAX_LEVEL,
  MAX_SKILL,
  MIN_LEVEL,
  MIN_SKILL,
  stopIndexOf,
  type CalcApi,
  type CalcGoal,
  type LevelStop,
} from "../calc";
import {
  AssetImg,
  CharIcon,
  CharPortrait,
  ElementIcon,
  ItemIcon,
  RarityStars,
  WeaponIcon,
  WeaponTypeIcon,
} from "./Icon";
import { compareByFamily, planFarming, type Cat } from "../materials";
import { Modal } from "./Modal";
import { FilterChip } from "./CharacterPicker";
import { MaterialTotals, type CategoryContributor } from "./MaterialTotals";
import { MaterialInventory } from "./MaterialInventory";

/**
 * Label for a level stop, e.g. "80" (cap, not ascended) vs "80 ◆" (ascended).
 * The min (1) and max (90) stops are unambiguous, so they carry no diamond.
 */
const stopLabel = (s: LevelStop) =>
  s.level === MIN_LEVEL || s.level === MAX_LEVEL
    ? `${s.level}`
    : `${s.level}${s.ascended ? " ◆" : " ◇"}`;

type CalcTab = "characters" | "inventory" | "planner";

export function CalcPanel({ data, calc }: { data: GameData; calc: CalcApi }) {
  const [tab, setTab] = useState<CalcTab>("characters");

  return (
    <div>
      <div className="border-b border-[var(--color-edge)] bg-gradient-to-b from-[color-mix(in_oklab,var(--color-accent)_5%,transparent)] to-transparent">
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <div className="leading-tight">
            <h1 className="tech-head tech-tick text-base font-bold">Material Calculator</h1>
            <p className="mt-1.5 hidden pl-[0.85rem] text-xs text-slate-500 sm:block">
              Plan upgrades, track what you own, and see what's left to farm.
            </p>
          </div>
          <nav className="-mb-px mt-3 flex items-center gap-1">
            <TabBtn active={tab === "characters"} onClick={() => setTab("characters")}>
              Characters
            </TabBtn>
            <TabBtn active={tab === "inventory"} onClick={() => setTab("inventory")}>
              Inventory
            </TabBtn>
            <TabBtn active={tab === "planner"} onClick={() => setTab("planner")}>
              Planner
            </TabBtn>
          </nav>
        </div>
      </div>

      {tab === "characters" && <CharactersTab data={data} calc={calc} />}
      {tab === "inventory" && (
        <MaterialInventory
          inventory={calc.state.inventory}
          mat={calc.mat}
          setOwned={calc.setOwned}
          clearInventory={calc.clearInventory}
        />
      )}
      {tab === "planner" && <PlannerTab data={data} calc={calc} />}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`tech-head relative border-b-2 px-4 pb-2.5 text-xs font-bold transition ${
        active
          ? "border-cyan-400 text-cyan-300 drop-shadow-[0_0_6px_color-mix(in_oklab,var(--color-accent)_55%,transparent)]"
          : "border-transparent text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function CharactersTab({ data, calc }: { data: GameData; calc: CalcApi }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const atCap = calc.state.goals.length >= MAX_GOALS;
  const openGoal = openId ? calc.state.goals.find((g) => g.id === openId) ?? null : null;
  // Resonators already on some goal — locked out of the picker to avoid duplicates.
  const usedIds = useMemo(
    () =>
      new Set(
        calc.state.goals
          .map((g) => g.characterId)
          .filter((id): id is string => Boolean(id))
      ),
    [calc.state.goals]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <p className="hidden text-xs text-slate-500 sm:block">
        Add the Resonators you want to build. Tap a portrait to set its targets.
      </p>

      {calc.state.goals.length === 0 ? (
        <button
          onClick={() => setAdding(true)}
          className="mt-4 flex w-full flex-col items-center gap-1 rounded-2xl border border-dashed border-[var(--color-edge)] p-10 text-center text-sm text-slate-500 transition hover:border-cyan-500/60 hover:text-cyan-300"
        >
          <span className="text-3xl leading-none">+</span>
          No Resonators yet. Add one to start planning.
        </button>
      ) : (
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-2.5">
          {calc.state.goals.map((goal) => {
            const character = goal.characterId ? data.characterById[goal.characterId] : null;
            return (
              <button
                key={goal.id}
                onClick={() => setOpenId(goal.id)}
                className="overflow-hidden rounded-xl border border-[var(--color-edge)] transition hover:-translate-y-0.5 hover:border-cyan-500/60"
                title={character ? character.name : "Choose a Resonator"}
              >
                {character ? (
                  <CharPortrait char={character} />
                ) : (
                  <div className="flex aspect-[3/4] w-full items-center justify-center text-3xl text-slate-500">
                    ?
                  </div>
                )}
              </button>
            );
          })}
          {!atCap && (
            <button
              onClick={() => setAdding(true)}
              className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--color-edge)] text-slate-500 transition hover:border-cyan-500/60 hover:text-cyan-300"
            >
              <span className="text-3xl leading-none">+</span>
              <span className="text-xs">Add</span>
            </button>
          )}
        </div>
      )}

      {openGoal && (
        <GoalModal
          data={data}
          calc={calc}
          goal={openGoal}
          onClose={() => setOpenId(null)}
        />
      )}
      {adding && (
        <CalcCharacterPicker
          data={data}
          current={null}
          taken={usedIds}
          onPick={(id) => {
            const newId = calc.addGoal(id);
            setOpenId(newId);
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

function PlannerTab({ data, calc }: { data: GameData; calc: CalcApi }) {
  // The Resonators that actually contribute materials — a goal with a resolvable
  // character. Each gets a head-icon toggle that folds its cost in or out of totals.
  const built = useMemo(
    () =>
      calc.state.goals
        .map((goal) => ({ goal, char: goal.characterId ? data.characterById[goal.characterId] : null }))
        .filter((x): x is { goal: CalcGoal; char: Character } => Boolean(x.char)),
    [calc.state.goals, data.characterById]
  );

  // Per-category heads: which (included) Resonators need each category's materials.
  // Each Resonator's own cost is planned against the shared inventory, so `done` means
  // it has nothing left to farm there — heads not-done first, so "who still needs it"
  // reads first.
  const contributors = useMemo<Partial<Record<Cat, CategoryContributor[]>>>(() => {
    const out: Partial<Record<Cat, CategoryContributor[]>> = {};
    for (const { goal, char } of built) {
      if (calc.state.excluded[goal.id]) continue; // only goals that shape the totals
      const plan = planFarming(goalCost(goal, calc.mat), calc.state.inventory, calc.mat);
      for (const c of plan.categories) {
        (out[c.cat] ??= []).push({
          id: goal.id,
          name: char.name,
          icon: char.icon,
          done: c.remainingItems === 0,
        });
      }
    }
    for (const cat of Object.keys(out) as Cat[])
      out[cat]!.sort((a, b) => Number(a.done) - Number(b.done));
    return out;
  }, [built, calc.state.excluded, calc.state.inventory, calc.mat]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 space-y-4">
      <MaterialTotals
        totals={calc.totals}
        inventory={calc.state.inventory}
        mat={calc.mat}
        setOwned={calc.setOwned}
        contributors={contributors}
        controls={
          built.length > 0 ? (
            <div
              className="flex flex-wrap gap-1.5"
              title="Tap a Resonator to add or remove its materials from the totals."
            >
              {built.map(({ goal, char }) => (
                <GoalToggle
                  key={goal.id}
                  char={char}
                  included={!calc.state.excluded[goal.id]}
                  onToggle={() => calc.toggleGoalIncluded(goal.id)}
                />
              ))}
            </div>
          ) : undefined
        }
      />
    </div>
  );
}

/** A tiny head-icon toggle: on = counted in totals, off = dimmed and excluded. */
function GoalToggle({
  char,
  included,
  onToggle,
}: {
  char: Character;
  included: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={included}
      title={`${char.name} — ${included ? "counted (tap to exclude)" : "excluded (tap to include)"}`}
      className={`relative h-9 w-9 shrink-0 overflow-hidden rounded-full border transition ${
        included
          ? "border-cyan-500/60 ring-1 ring-cyan-400/40"
          : "border-[var(--color-edge)] opacity-40 grayscale hover:opacity-70"
      }`}
    >
      <AssetImg src={char.icon} alt={char.name} className="h-full w-full object-cover" />
      {!included && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-bold text-slate-200">
          ✕
        </span>
      )}
    </button>
  );
}

type GoalTab = "level" | "skills" | "weapon";

/**
 * Per-Resonator editor, popped out as a modal (mirrors the Endstate Matrix
 * resonator picker). Targets are split across Level / Skills / Weapon sub-tabs.
 */
function GoalModal({
  data,
  calc,
  goal,
  onClose,
}: {
  data: GameData;
  calc: CalcApi;
  goal: CalcGoal;
  onClose: () => void;
}) {
  const [sub, setSub] = useState<GoalTab>("level");
  const [picker, setPicker] = useState<"char" | "weapon" | null>(null);
  const character = goal.characterId ? data.characterById[goal.characterId] : null;
  const weapon = goal.weaponId ? data.weaponById[goal.weaponId] : null;
  const hasData = character ? Boolean(calc.mat.characters[character.id]) : false;
  const cost = useMemo(() => goalCost(goal, calc.mat), [goal, calc.mat]);
  // Resonators on the other goals — locked out so this goal can't duplicate them.
  const takenIds = useMemo(
    () =>
      new Set(
        calc.state.goals
          .filter((g) => g.id !== goal.id)
          .map((g) => g.characterId)
          .filter((id): id is string => Boolean(id))
      ),
    [calc.state.goals, goal.id]
  );

  const remove = () => {
    calc.removeGoal(goal.id);
    onClose();
  };

  return (
    <Modal
      title={character ? character.name : "Choose a Resonator"}
      subtitle={character ? WEAPON_TYPES[character.weaponType] : "Pick from the catalog"}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPicker("char")}
            className="flex items-center gap-3 rounded-xl text-left transition hover:opacity-90"
          >
            {character ? (
              <CharIcon char={character} size="md" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-[var(--color-edge)] text-2xl text-slate-500">
                +
              </div>
            )}
            <span className="text-xs text-slate-400 underline-offset-2 hover:underline">
              {character ? "Change Resonator" : "Choose a Resonator"}
            </span>
          </button>
          <button
            onClick={remove}
            className="ml-auto rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
            title="Remove"
            aria-label="Remove Resonator"
          >
            🗑 Delete
          </button>
        </div>

        {character && !hasData && (
          <p className="text-xs text-amber-400/80">
            No upgrade data is available for this Resonator yet.
          </p>
        )}

        {character && hasData && (
          <>
            <nav className="grid grid-cols-3 gap-1 rounded-lg bg-[var(--color-panel2)] p-0.5">
              <GoalSubTab active={sub === "level"} onClick={() => setSub("level")}>
                Level
              </GoalSubTab>
              <GoalSubTab active={sub === "skills"} onClick={() => setSub("skills")}>
                Skills
              </GoalSubTab>
              <GoalSubTab active={sub === "weapon"} onClick={() => setSub("weapon")}>
                Weapon
              </GoalSubTab>
            </nav>

            {sub === "level" && (
              <div className="space-y-3">
                <LevelStopRow
                  label="Level"
                  from={stopIndexOf(goal.level.from, goal.ascension.from)}
                  to={stopIndexOf(goal.level.to, goal.ascension.to)}
                  onFrom={(i) => calc.setLevelStop(goal.id, "char", "from", i)}
                  onTo={(i) => calc.setLevelStop(goal.id, "char", "to", i)}
                />
                <p className="text-xs text-slate-500">
                  ◆ marks an ascension (breakthrough) — it unlocks the next level cap and
                  adds that breakthrough's materials.
                </p>
              </div>
            )}

            {sub === "skills" && (
              <SkillsTab character={calc.mat.characters[character.id]} goal={goal} calc={calc} />
            )}

            {sub === "weapon" && (
              <div className="space-y-3">
                <button
                  onClick={() => setPicker("weapon")}
                  className="flex w-full items-center gap-3 rounded-xl text-left transition hover:opacity-90"
                >
                  {weapon ? (
                    <WeaponIcon weapon={weapon} size="sm" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-[var(--color-edge)] text-slate-500">
                      +
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {weapon ? weapon.name : "Add a weapon"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {WEAPON_TYPES[character.weaponType]}
                    </div>
                  </div>
                </button>

                {weapon && (
                  <>
                    <LevelStopRow
                      label="Weapon level"
                      from={stopIndexOf(goal.weaponLevel.from, goal.weaponAscension.from)}
                      to={stopIndexOf(goal.weaponLevel.to, goal.weaponAscension.to)}
                      onFrom={(i) => calc.setLevelStop(goal.id, "weapon", "from", i)}
                      onTo={(i) => calc.setLevelStop(goal.id, "weapon", "to", i)}
                    />
                    <button
                      onClick={() => calc.setWeapon(goal.id, null)}
                      className="text-xs text-rose-300/80 hover:text-rose-300"
                    >
                      Remove weapon
                    </button>
                  </>
                )}
              </div>
            )}

            <GoalCostList cost={cost} calc={calc} />
          </>
        )}
      </div>

      {picker === "char" && (
        <CalcCharacterPicker
          data={data}
          current={goal.characterId}
          taken={takenIds}
          onPick={(id) => calc.setCharacter(goal.id, id)}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === "weapon" && character && (
        <CalcWeaponPicker
          data={data}
          weaponType={character.weaponType}
          current={goal.weaponId}
          onPick={(id) => calc.setWeapon(goal.id, id)}
          onClose={() => setPicker(null)}
        />
      )}
    </Modal>
  );
}

function GoalSubTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-cyan-500 text-white" : "text-slate-300 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

/** This Resonator's own material cost (gross), shown at the bottom of its editor. */
function GoalCostList({ cost, calc }: { cost: Record<number, number>; calc: CalcApi }) {
  const rows = useMemo(
    () =>
      Object.entries(cost)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ id, qty, item: calc.mat.items[id] }))
        .filter((r) => r.item)
        // Group tiered materials by family then rarity, matching the Inventory/Planner tabs.
        .sort((a, b) => compareByFamily(Number(a.id), Number(b.id), calc.mat)),
    [cost, calc.mat]
  );

  return (
    <div className="border-t border-[var(--color-edge)] pt-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Goal cost
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          Set a target above the current value to see its cost.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-panel2)] px-1.5 py-1"
              title={r.item.name}
            >
              <ItemIcon item={r.item} size="sm" />
              <span className="pr-0.5 text-xs font-semibold tabular-nums text-slate-200">
                {r.qty.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The Skills sub-tab: the five active skills, each with current→target steppers and
 * its two attached forte nodes (the in-game tree groups two nodes under each skill).
 */
function SkillsTab({
  character,
  goal,
  calc,
}: {
  character: MaterialCharacter;
  goal: CalcGoal;
  calc: CalcApi;
}) {
  // Pair every forte node with its flat index (selection is keyed by index).
  const indexed = character.nodes.map((node, i) => ({ node, i }));
  const allOn = character.nodes.every((_, i) => goal.nodes[i] !== false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          Each skill includes its two forte nodes.
        </span>
        {character.nodes.length > 0 && (
          <button
            onClick={() => calc.setAllNodes(goal.id, !allOn, character.nodes.length)}
            className="text-xs text-cyan-300 hover:text-cyan-200"
          >
            {allOn ? "Clear all nodes" : "Select all nodes"}
          </button>
        )}
      </div>
      {SKILL_ORDER.map((key) => (
        <SkillRow
          key={key}
          skillKey={key}
          goal={goal}
          calc={calc}
          skill={character.skills[key]}
          nodes={indexed.filter((x) => x.node.slot === key)}
        />
      ))}
    </div>
  );
}

/** One active-skill row: icon + in-game name, current→target steppers, and its 2 nodes. */
function SkillRow({
  skillKey,
  goal,
  calc,
  skill,
  nodes,
}: {
  skillKey: SkillKey;
  goal: CalcGoal;
  calc: CalcApi;
  skill: MaterialSkill;
  nodes: { node: ForteNode; i: number }[];
}) {
  const r = goal.skills[skillKey];
  return (
    <div className="flex items-stretch gap-2">
      {/* the skill block */}
      <div className="flex flex-1 items-center gap-2.5 rounded-xl bg-[var(--color-panel2)] px-2.5 py-2">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-black/25 p-0.5">
          <AssetImg
            src={itemIconUrl(skill.icon)}
            alt={skill.name}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{skill.name || SKILL_LABELS[skillKey]}</div>
          <div className="text-[11px] text-slate-500">{SKILL_LABELS[skillKey]}</div>
        </div>
        <MiniStepper
          value={r.from}
          min={MIN_SKILL}
          max={MAX_SKILL}
          onChange={(v) => calc.setSkillRange(goal.id, skillKey, "from", v)}
        />
        <span className="text-slate-500">→</span>
        <MiniStepper
          value={r.to}
          min={MIN_SKILL}
          max={MAX_SKILL}
          onChange={(v) => calc.setSkillRange(goal.id, skillKey, "to", v)}
        />
      </div>

      {/* the skill's two forte nodes, as squares */}
      {nodes.map(({ node, i }) => (
        <NodeSquare
          key={i}
          node={node}
          on={goal.nodes[i] !== false}
          onClick={() => calc.toggleNode(goal.id, i)}
        />
      ))}
    </div>
  );
}

/** A single toggleable forte node (inherent skill or stat bonus), as a compact square. */
function NodeSquare({
  node,
  on,
  onClick,
}: {
  node: ForteNode;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={`${node.title} ${node.value}`.trim()}
      aria-pressed={on}
      className={`flex w-[3.75rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 transition ${
        on
          ? "border-cyan-500/60 bg-cyan-500/10"
          : "border-[var(--color-edge)] bg-[var(--color-panel2)] opacity-45 hover:opacity-80"
      }`}
    >
      <AssetImg
        src={itemIconUrl(node.icon)}
        alt={node.title}
        className="h-7 w-7 object-contain"
      />
      <span className="w-full truncate text-center text-[10px] font-medium leading-tight text-slate-300">
        {node.kind === "skill" ? node.title : node.value}
      </span>
    </button>
  );
}

/** Compact −/+ number stepper with a type-able value, clamped to [min, max]. */
function MiniStepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  // Local draft so the field can be cleared/half-typed without snapping back.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    setDraft(null);
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
  };

  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-[var(--color-edge)]">
      <button
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        className="px-2 py-1 text-sm text-slate-300 enabled:hover:bg-white/10 disabled:opacity-30"
        aria-label="Decrease"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={draft ?? value}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
        onFocus={(e) => e.target.select()}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          else if (e.key === "Escape") {
            setDraft(null);
            e.currentTarget.blur();
          }
        }}
        aria-label="Value"
        className="w-7 bg-transparent text-center text-sm tabular-nums outline-none focus:bg-white/10"
      />
      <button
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className="px-2 py-1 text-sm text-slate-300 enabled:hover:bg-white/10 disabled:opacity-30"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

/** A combined level+ascension range row (current → target), picked as level stops. */
function LevelStopRow({
  label,
  from,
  to,
  onFrom,
  onTo,
}: {
  label: string;
  from: number; // LEVEL_STOPS index
  to: number; // LEVEL_STOPS index
  onFrom: (index: number) => void;
  onTo: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5 text-sm">
      <span className="w-36 shrink-0 text-slate-400">{label}</span>
      <StopSelect value={from} onChange={onFrom} />
      <span className="text-slate-500">→</span>
      <StopSelect value={to} onChange={onTo} />
    </div>
  );
}

function StopSelect({
  value,
  onChange,
}: {
  value: number; // LEVEL_STOPS index
  onChange: (index: number) => void;
}) {
  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-[4.25rem] cursor-pointer appearance-none rounded-lg border border-[var(--color-edge)] bg-[var(--color-panel2)] py-1.5 pl-3 pr-7 text-sm font-semibold tabular-nums text-slate-100 outline-none transition hover:border-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40"
      >
        {LEVEL_STOPS.map((s, i) => (
          <option key={i} value={i}>
            {stopLabel(s)}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
      >
        <path
          d="M6 8l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ---- lightweight pickers (no inventory/vigor constraints) ----

function CalcCharacterPicker({
  data,
  current,
  taken,
  onPick,
  onClose,
}: {
  data: GameData;
  current: string | null;
  /** Resonator ids already used by other goals — locked out to prevent duplicates. */
  taken: ReadonlySet<string>;
  onPick: (id: string) => void;
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
          className="w-full rounded-lg border border-[var(--color-edge)] bg-[var(--color-panel2)] px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-500"
        />
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(ELEMENTS).map(([id, el]) => {
            const n = Number(id);
            const on = element === n;
            return (
              <FilterChip key={id} active={on} color={el.color} onClick={() => setElement(on ? null : n)}>
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
          {[5, 4].map((r) => (
            <FilterChip key={r} active={rarity === r} onClick={() => setRarity(rarity === r ? null : r)}>
              {r}★
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-2.5 p-4">
        {results.map((c) => {
          const isTaken = taken.has(c.id);
          return (
            <button
              key={c.id}
              disabled={isTaken}
              onClick={() => {
                onPick(c.id);
                onClose();
              }}
              title={isTaken ? `${c.name} — already added` : c.name}
              className={`relative overflow-hidden rounded-xl border transition ${
                isTaken
                  ? "cursor-not-allowed border-[var(--color-edge)] opacity-40"
                  : c.id === current
                    ? "border-cyan-400 ring-2 ring-cyan-400/50 hover:-translate-y-0.5"
                    : "border-[var(--color-edge)] hover:-translate-y-0.5 hover:border-cyan-500/60"
              }`}
            >
              <CharPortrait char={c} />
              {isTaken && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-semibold text-slate-200">
                  Added
                </span>
              )}
            </button>
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

function CalcWeaponPicker({
  data,
  weaponType,
  current,
  onPick,
  onClose,
}: {
  data: GameData;
  weaponType: number;
  current: string | null;
  onPick: (id: string | null) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [rarity, setRarity] = useState<number | null>(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.weapons
      .filter((w) => w.type === weaponType)
      .filter((w) => (needle ? w.name.toLowerCase().includes(needle) : true))
      .filter((w) => (rarity != null ? w.rarity === rarity : true));
  }, [data.weapons, weaponType, q, rarity]);

  return (
    <Modal
      title="Choose a weapon"
      subtitle={`${WEAPON_TYPES[weaponType]} · ${results.length} weapons`}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
    >
      <div className="sticky top-0 z-10 space-y-2 border-b border-[var(--color-edge)] bg-[var(--color-panel)] px-4 py-3">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${WEAPON_TYPES[weaponType]}…`}
          className="w-full rounded-lg border border-[var(--color-edge)] bg-[var(--color-panel2)] px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-500"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {[5, 4, 3].map((r) => (
            <FilterChip key={r} active={rarity === r} onClick={() => setRarity(rarity === r ? null : r)}>
              {r}★
            </FilterChip>
          ))}
          {current && (
            <button
              onClick={() => {
                onPick(null);
                onClose();
              }}
              className="ml-auto rounded-lg px-2.5 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-500/10"
            >
              Remove weapon
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((w) => (
          <button
            key={w.id}
            onClick={() => {
              onPick(w.id);
              onClose();
            }}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
              w.id === current
                ? "border-cyan-400 ring-1 ring-cyan-400/40"
                : "border-[var(--color-edge)] bg-[var(--color-panel2)] hover:-translate-y-0.5 hover:border-cyan-500/60"
            }`}
          >
            <WeaponIcon weapon={w} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{w.name}</div>
              <div className="flex items-center gap-2">
                <RarityStars rarity={w.rarity} />
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <WeaponTypeIcon type={w.type} className="h-3.5 w-3.5" />
                  {WEAPON_TYPES[w.type]}
                </span>
              </div>
            </div>
          </button>
        ))}
        {results.length === 0 && (
          <div className="col-span-full py-10 text-center text-sm text-slate-500">
            No weapons match those filters.
          </div>
        )}
      </div>
    </Modal>
  );
}
