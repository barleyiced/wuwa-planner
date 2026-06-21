// Material Calculator state: a list of upgrade "goals" (per resonator/weapon),
// persisted to localStorage, plus the derived aggregated material totals.
//
// Mirrors store.ts/usePlan(): the hook owns all state + mutations and exposes a
// derived view. Cost data comes from the precomputed bundle via loadMaterialData().
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  expBreakdown,
  loadMaterialData,
  SHELL_CREDIT_ID,
  SKILL_ORDER,
  type CostEntry,
  type MaterialData,
  type SkillKey,
} from "./game";
import { migrateLegacy } from "./storage";

export const MAX_LEVEL = 90;
export const MIN_LEVEL = 1;
export const MAX_ASCENSION = 6;
export const MAX_SKILL = 10;
export const MIN_SKILL = 1;
export const MAX_GOALS = 40;

/**
 * Shell Credit charged per point of resonator EXP when leveling (a fixed in-game
 * rate of 0.35). The datamine's role-level tables only author EXP thresholds — no
 * gold column — so this universal cost is applied here rather than in the bundle.
 * (Weapon leveling carries its own gold, baked into the bundle's weapon EXP items.)
 */
export const ROLE_LEVEL_SHELL_PER_EXP = 0.35;

export interface Range {
  from: number;
  to: number;
}

export interface CalcGoal {
  id: string;
  characterId: string | null;
  level: Range; // 1..90
  ascension: Range; // 0..6
  skills: Record<SkillKey, Range>; // 1..10 each
  /** Forte stat-bonus nodes: index → included. Absent index = included (default on). */
  nodes: Record<number, boolean>;
  weaponId: string | null;
  weaponLevel: Range; // 1..90
  weaponAscension: Range; // 0..6
}

export interface CalcState {
  goals: CalcGoal[];
  /** Materials the user already owns, by item id. Subtracted from totals to show
   *  what is left to farm. Absent/zero entries mean "none owned". */
  inventory: Record<number, number>;
  /** Goal ids excluded from the aggregated totals. Present = excluded; absent =
   *  included (default on). Lets the Planner toggle a Resonator out of the list. */
  excluded: Record<string, true>;
}

const STORAGE_KEY = "wuwa.calc.v1";
// Pre-1.2 builds stored calculator goals under the old "wwem" prefix.
const LEGACY_STORAGE_KEY = "wwem.calc.v1";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const fullSkills = (): Record<SkillKey, Range> =>
  Object.fromEntries(SKILL_ORDER.map((k) => [k, { from: MIN_SKILL, to: MAX_SKILL }])) as Record<
    SkillKey,
    Range
  >;

function makeGoal(): CalcGoal {
  return {
    id: uid(),
    characterId: null,
    level: { from: MIN_LEVEL, to: MAX_LEVEL },
    ascension: { from: 0, to: MAX_ASCENSION },
    skills: fullSkills(),
    nodes: {},
    weaponId: null,
    weaponLevel: { from: MIN_LEVEL, to: MAX_LEVEL },
    weaponAscension: { from: 0, to: MAX_ASCENSION },
  };
}

/** Repair a persisted goal so older/partial shapes can't break the reducer. */
function reviveGoal(raw: Partial<CalcGoal>): CalcGoal {
  const base = makeGoal();
  const g: CalcGoal = {
    ...base,
    ...raw,
    id: raw.id ?? base.id,
    skills: { ...base.skills, ...(raw.skills ?? {}) },
    nodes: reviveNodes(raw.nodes),
  };
  // Level and ascension are now coupled; snap legacy/freeform pairs onto valid stops.
  const c = snapStops(g.level, g.ascension);
  const w = snapStops(g.weaponLevel, g.weaponAscension);
  return {
    ...g,
    level: c.level,
    ascension: c.asc,
    weaponLevel: w.level,
    weaponAscension: w.asc,
  };
}

/** Keep only the explicit per-node selections (excluded nodes); default is included. */
function reviveNodes(raw: unknown): Record<number, boolean> {
  const out: Record<number, boolean> = {};
  if (raw && typeof raw === "object") {
    for (const [i, on] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof on === "boolean") out[Number(i)] = on;
    }
  }
  return out;
}

/** Keep only the explicit exclusions (value true); everything else is included. */
function reviveExcluded(raw: unknown): Record<string, true> {
  const out: Record<string, true> = {};
  if (raw && typeof raw === "object") {
    for (const [id, on] of Object.entries(raw as Record<string, unknown>)) {
      if (on === true) out[id] = true;
    }
  }
  return out;
}

/** Keep only positive, integer owned counts so storage and math stay clean. */
function reviveInventory(raw: unknown): Record<number, number> {
  const out: Record<number, number> = {};
  if (raw && typeof raw === "object") {
    for (const [id, qty] of Object.entries(raw as Record<string, unknown>)) {
      const n = Math.floor(Number(qty));
      if (Number.isFinite(n) && n > 0) out[Number(id)] = n;
    }
  }
  return out;
}

/** Repair an arbitrary persisted/imported blob into a sound CalcState. */
function reviveState(raw: unknown): CalcState | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Partial<CalcState>;
  if (!Array.isArray(parsed.goals)) return null;
  return {
    goals: parsed.goals.map(reviveGoal),
    inventory: reviveInventory(parsed.inventory),
    excluded: reviveExcluded(parsed.excluded),
  };
}

function initialState(): CalcState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? migrateLegacy(LEGACY_STORAGE_KEY, STORAGE_KEY);
    if (raw) {
      const revived = reviveState(JSON.parse(raw));
      if (revived) return revived;
    }
  } catch {
    /* fall through to default */
  }
  return { goals: [makeGoal()], inventory: {}, excluded: {} };
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

/** Part of a range to edit; setting `from` above `to` (or vice-versa) drags the other along. */
export type RangePart = "from" | "to";

/**
 * A selectable level "stop". Level caps are gated by ascension (breakthrough), so
 * level and ascension are picked together rather than separately. Each cap level
 * (20/40/50/60/70/80) appears twice: a non-ascended variant (just reached the cap)
 * and an ascended variant (breakthrough done → next cap unlocked, its mats counted).
 * Ascension count by cap: 0→Lv20, 1→Lv40, 2→Lv50, 3→Lv60, 4→Lv70, 5→Lv80, 6→Lv90.
 * Shared by characters and weapons (same breakthrough rules). Ordered, so the array
 * index is a monotonic ordering of both level and ascension.
 */
export interface LevelStop {
  level: number;
  ascension: number; // breakthroughs completed at this stop (0..6)
  ascended: boolean; // true = the breakthrough at this cap is done (filled marker)
}

export const LEVEL_STOPS: LevelStop[] = [
  { level: 1, ascension: 0, ascended: false },
  { level: 20, ascension: 0, ascended: false },
  { level: 20, ascension: 1, ascended: true },
  { level: 40, ascension: 1, ascended: false },
  { level: 40, ascension: 2, ascended: true },
  { level: 50, ascension: 2, ascended: false },
  { level: 50, ascension: 3, ascended: true },
  { level: 60, ascension: 3, ascended: false },
  { level: 60, ascension: 4, ascended: true },
  { level: 70, ascension: 4, ascended: false },
  { level: 70, ascension: 5, ascended: true },
  { level: 80, ascension: 5, ascended: false },
  { level: 80, ascension: 6, ascended: true },
  { level: 90, ascension: 6, ascended: true },
];

/** Index of the stop nearest a (level, ascension) pair — coerces legacy/freeform data. */
export function stopIndexOf(level: number, ascension: number): number {
  let best = 0;
  let bestScore = Infinity;
  LEVEL_STOPS.forEach((s, i) => {
    const score = Math.abs(s.level - level) * 100 + Math.abs(s.ascension - ascension);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

/** Snap a level+ascension range onto valid stops, keeping current ≤ target. */
function snapStops(level: Range, asc: Range): { level: Range; asc: Range } {
  const from = stopIndexOf(level.from, asc.from);
  const to = Math.max(from, stopIndexOf(level.to, asc.to));
  const sf = LEVEL_STOPS[from];
  const st = LEVEL_STOPS[to];
  return {
    level: { from: sf.level, to: st.level },
    asc: { from: sf.ascension, to: st.ascension },
  };
}

/** Materials a single goal requires (gross — not netted against inventory). */
export function goalCost(g: CalcGoal, mat: MaterialData): Record<number, number> {
  const acc: Record<number, number> = {};
  const add = (entries: CostEntry[]) => {
    for (const e of entries) acc[e.id] = (acc[e.id] ?? 0) + e.qty;
  };

  // ----- resonator -----
  const ch = g.characterId ? mat.characters[g.characterId] : null;
  if (ch) {
    // ascension tiers in (from, to]
    for (const t of ch.ascension)
      if (t.level > g.ascension.from && t.level <= g.ascension.to) add(t.consume);
    // each active skill, levels in (from, to]
    for (const key of SKILL_ORDER) {
      const r = g.skills[key];
      for (const lv of ch.skills[key]?.levels ?? [])
        if (lv.lvl > r.from && lv.lvl <= r.to) add(lv.consume);
    }
    // one-time stat-bonus nodes (per-node selection; absent index = included)
    ch.nodes.forEach((n, i) => {
      if (g.nodes[i] !== false) add(n.consume);
    });
    // leveling EXP (+ the Shell Credit the game charges per EXP applied)
    const cum = mat.characterExp[String(ch.levelGroup)];
    if (cum) {
      const exp = (cum[g.level.to] ?? 0) - (cum[g.level.from] ?? 0);
      if (exp > 0) {
        add(expBreakdown(exp, mat.expItems.role).counts);
        add([{ id: SHELL_CREDIT_ID, qty: Math.round(exp * ROLE_LEVEL_SHELL_PER_EXP) }]);
      }
    }
  }

  // ----- weapon -----
  const wp = g.weaponId ? mat.weapons[g.weaponId] : null;
  if (wp) {
    for (const t of wp.ascension)
      if (t.level > g.weaponAscension.from && t.level <= g.weaponAscension.to) add(t.consume);
    const cum = mat.weaponExp[String(wp.levelId)];
    if (cum) {
      const exp = (cum[g.weaponLevel.to] ?? 0) - (cum[g.weaponLevel.from] ?? 0);
      if (exp > 0) {
        const { counts, gold } = expBreakdown(exp, mat.expItems.weapon);
        add(counts);
        if (gold > 0) add([{ id: SHELL_CREDIT_ID, qty: gold }]);
      }
    }
  }
  return acc;
}

export function useCalc() {
  const [state, setState] = useState<CalcState>(initialState);
  const mat = loadMaterialData();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state]);

  const patchGoal = useCallback((id: string, fn: (g: CalcGoal) => CalcGoal) => {
    setState((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? fn(g) : g)) }));
  }, []);

  /** Append a goal (optionally pre-assigned a Resonator) and return its id. */
  const addGoal = useCallback((characterId: string | null = null) => {
    const goal = makeGoal();
    if (characterId) goal.characterId = characterId;
    setState((s) =>
      s.goals.length >= MAX_GOALS ? s : { ...s, goals: [...s.goals, goal] }
    );
    return goal.id;
  }, []);

  const removeGoal = useCallback((id: string) => {
    setState((s) => {
      const excluded = { ...s.excluded };
      delete excluded[id];
      return { ...s, goals: s.goals.filter((g) => g.id !== id), excluded };
    });
  }, []);

  /** Toggle whether a goal's materials count toward the aggregated totals. */
  const toggleGoalIncluded = useCallback((id: string) => {
    setState((s) => {
      const excluded = { ...s.excluded };
      if (excluded[id]) delete excluded[id];
      else excluded[id] = true;
      return { ...s, excluded };
    });
  }, []);

  const setCharacter = useCallback(
    (id: string, characterId: string | null) => {
      // Switching resonator invalidates the weapon (type differs) and node selection
      // (forte nodes are per-character; their indices no longer line up).
      patchGoal(id, (g) => ({ ...g, characterId, weaponId: null, nodes: {} }));
    },
    [patchGoal]
  );

  const setWeapon = useCallback(
    (id: string, weaponId: string | null) => patchGoal(id, (g) => ({ ...g, weaponId })),
    [patchGoal]
  );

  /** Toggle whether a single forte node is included (default included). */
  const toggleNode = useCallback(
    (id: string, index: number) =>
      patchGoal(id, (g) => {
        const nodes = { ...g.nodes };
        if (g.nodes[index] !== false) nodes[index] = false; // include -> exclude
        else delete nodes[index]; // exclude -> back to default (include)
        return { ...g, nodes };
      }),
    [patchGoal]
  );

  /** Include or exclude all forte nodes at once (count = the character's node count). */
  const setAllNodes = useCallback(
    (id: string, included: boolean, count: number) =>
      patchGoal(id, (g) => {
        const nodes: Record<number, boolean> = {};
        if (!included) for (let i = 0; i < count; i++) nodes[i] = false;
        return { ...g, nodes };
      }),
    [patchGoal]
  );

  /**
   * Set one end of a combined level+ascension target to a stop (by LEVEL_STOPS
   * index), writing both the level and ascension fields and keeping current ≤ target.
   */
  const setLevelStop = useCallback(
    (id: string, scope: "char" | "weapon", part: RangePart, index: number) => {
      const i = clamp(index, 0, LEVEL_STOPS.length - 1);
      const levelField = scope === "char" ? "level" : "weaponLevel";
      const ascField = scope === "char" ? "ascension" : "weaponAscension";
      patchGoal(id, (g) => {
        let from = stopIndexOf(g[levelField].from, g[ascField].from);
        let to = stopIndexOf(g[levelField].to, g[ascField].to);
        if (part === "from") from = i;
        else to = i;
        if (from > to) {
          if (part === "from") to = from;
          else from = to;
        }
        const sf = LEVEL_STOPS[from];
        const st = LEVEL_STOPS[to];
        const next = { ...g };
        next[levelField] = { from: sf.level, to: st.level };
        next[ascField] = { from: sf.ascension, to: st.ascension };
        return next;
      });
    },
    [patchGoal]
  );

  const setSkillRange = useCallback(
    (id: string, key: SkillKey, part: RangePart, value: number) => {
      patchGoal(id, (g) => {
        const next = { ...g.skills[key], [part]: clamp(value, MIN_SKILL, MAX_SKILL) };
        if (next.from > next.to) {
          if (part === "from") next.to = next.from;
          else next.from = next.to;
        }
        return { ...g, skills: { ...g.skills, [key]: next } };
      });
    },
    [patchGoal]
  );

  const resetAll = useCallback(
    () => setState((s) => ({ ...s, goals: [makeGoal()], excluded: {} })),
    []
  );

  /** Replace all calculator state from an imported blob, reviving partial shapes. */
  const importState = useCallback((raw: unknown) => {
    const revived = reviveState(raw);
    if (revived) setState(revived);
    return revived !== null;
  }, []);

  /** Set how many of a material the user already owns (0 clears the entry). */
  const setOwned = useCallback((itemId: number, qty: number) => {
    setState((s) => {
      const n = clamp(qty, 0, Number.MAX_SAFE_INTEGER);
      const inventory = { ...s.inventory };
      if (n > 0) inventory[itemId] = n;
      else delete inventory[itemId];
      return { ...s, inventory };
    });
  }, []);

  const clearInventory = useCallback(
    () => setState((s) => ({ ...s, inventory: {} })),
    []
  );

  // ---- derived: aggregated material totals across all goals ----
  const totals = useMemo<Record<number, number>>(() => {
    const acc: Record<number, number> = {};
    for (const g of state.goals) {
      if (state.excluded[g.id]) continue; // toggled out of the totals
      const cost = goalCost(g, mat);
      for (const id in cost) acc[id] = (acc[Number(id)] ?? 0) + cost[Number(id)];
    }
    return acc;
  }, [state.goals, state.excluded, mat]);

  return {
    state,
    mat,
    totals,
    addGoal,
    removeGoal,
    toggleGoalIncluded,
    setCharacter,
    setWeapon,
    toggleNode,
    setAllNodes,
    setLevelStop,
    setSkillRange,
    resetAll,
    importState,
    setOwned,
    clearInventory,
  };
}

export type CalcApi = ReturnType<typeof useCalc>;
