// Persistent planner state: weapon inventory + teams, saved to localStorage.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ECHO_SLOTS,
  MAX_SONATA,
  sonataMinPieces,
  sonataPiecesUsed,
  type SonataPick,
} from "./game";
import { migrateLegacy } from "./storage";

export const TEAM_SIZE = 3;
export const MAX_TEAMS = 20;

export interface Slot {
  characterId: string | null;
  weaponId: string | null;
  /** Sonata sets (with their piece tier) this resonator runs — a build note, no inventory. */
  sonata: SonataPick[];
}

export interface Team {
  id: string;
  name: string;
  slots: Slot[];
}

export interface PlanState {
  /** weaponId -> number of copies owned */
  inventory: Record<string, number>;
  teams: Team[];
}

const STORAGE_KEY = "wuwa.plan.v1";
// Pre-1.2 builds stored the plan under the old "wwem" (Endstate Matrix) prefix.
const LEGACY_STORAGE_KEY = "wwem.plan.v1";

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function emptySlot(): Slot {
  return { characterId: null, weaponId: null, sonata: [] };
}

/** Coerce a stored slot's Sonata into the current `SonataPick[]` shape. Handles the
 *  earlier `sonataIds: string[]` form (mapped to each set's minimum tier) and the
 *  current `sonata: {id,pieces}[]`, dropping malformed entries. */
function normalizeSonata(sl: unknown): SonataPick[] {
  const raw = sl as { sonata?: unknown; sonataIds?: unknown };
  let picks: SonataPick[] = [];
  if (Array.isArray(raw.sonata)) {
    picks = raw.sonata
      .filter(
        (p): p is SonataPick =>
          !!p && typeof p.id === "string" && Number.isFinite(p.pieces)
      )
      .map((p) => ({ id: p.id, pieces: p.pieces }));
  } else if (Array.isArray(raw.sonataIds)) {
    picks = raw.sonataIds
      .filter((id): id is string => typeof id === "string")
      .map((id) => ({ id, pieces: sonataMinPieces(id) }));
  }
  return picks.slice(0, MAX_SONATA);
}

function emptySlots(): Slot[] {
  return Array.from({ length: TEAM_SIZE }, emptySlot);
}

function makeTeam(name: string): Team {
  return { id: uid(), name, slots: emptySlots() };
}

function initialState(): PlanState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? migrateLegacy(LEGACY_STORAGE_KEY, STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlanState;
      if (parsed && parsed.inventory && Array.isArray(parsed.teams)) {
        // make sure every team has exactly TEAM_SIZE slots, and that each slot's
        // Sonata is in the current shape (added after the original plan.v1 shape and
        // since migrated from `sonataIds` to `sonata` — both are normalized here, so
        // old plans load without a key bump).
        parsed.teams.forEach((t) => {
          while (t.slots.length < TEAM_SIZE) t.slots.push(emptySlot());
          t.slots = t.slots.slice(0, TEAM_SIZE).map((sl) => ({
            characterId: sl.characterId ?? null,
            weaponId: sl.weaponId ?? null,
            sonata: normalizeSonata(sl),
          }));
        });
        return parsed;
      }
    }
  } catch {
    /* fall through to default */
  }
  return { inventory: {}, teams: [makeTeam("Team 1")] };
}

export interface UsageInfo {
  /** weaponId -> total times assigned across all team slots */
  used: Record<string, number>;
  /** remaining = owned - used (can be negative when over-allocated) */
  remaining: (weaponId: string) => number;
  owned: (weaponId: string) => number;
}

export function usePlan() {
  const [state, setState] = useState<PlanState>(initialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state]);

  // ---- inventory ----
  const setOwned = useCallback((weaponId: string, count: number) => {
    setState((s) => {
      const inventory = { ...s.inventory };
      const n = Math.max(0, Math.floor(count));
      if (n === 0) delete inventory[weaponId];
      else inventory[weaponId] = n;
      return { ...s, inventory };
    });
  }, []);

  const adjustOwned = useCallback(
    (weaponId: string, delta: number) => {
      setState((s) => {
        const inventory = { ...s.inventory };
        const n = Math.max(0, (inventory[weaponId] ?? 0) + delta);
        if (n === 0) delete inventory[weaponId];
        else inventory[weaponId] = n;
        return { ...s, inventory };
      });
    },
    []
  );

  // ---- teams ----
  const addTeam = useCallback(() => {
    setState((s) => {
      if (s.teams.length >= MAX_TEAMS) return s;
      return { ...s, teams: [...s.teams, makeTeam(`Team ${s.teams.length + 1}`)] };
    });
  }, []);

  const removeTeam = useCallback((teamId: string) => {
    setState((s) => ({ ...s, teams: s.teams.filter((t) => t.id !== teamId) }));
  }, []);

  const renameTeam = useCallback((teamId: string, name: string) => {
    setState((s) => ({
      ...s,
      teams: s.teams.map((t) => (t.id === teamId ? { ...t, name } : t)),
    }));
  }, []);

  const moveTeam = useCallback((teamId: string, dir: -1 | 1) => {
    setState((s) => {
      const idx = s.teams.findIndex((t) => t.id === teamId);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= s.teams.length) return s;
      const teams = [...s.teams];
      [teams[idx], teams[j]] = [teams[j], teams[idx]];
      return { ...s, teams };
    });
  }, []);

  const reorderTeam = useCallback((teamId: string, toIndex: number) => {
    setState((s) => {
      const from = s.teams.findIndex((t) => t.id === teamId);
      if (from < 0) return s;
      const to = Math.max(0, Math.min(toIndex, s.teams.length - 1));
      if (from === to) return s;
      const teams = [...s.teams];
      const [moved] = teams.splice(from, 1);
      teams.splice(to, 0, moved);
      return { ...s, teams };
    });
  }, []);

  const updateSlot = useCallback(
    (teamId: string, slotIndex: number, patch: Partial<Slot>) => {
      setState((s) => ({
        ...s,
        teams: s.teams.map((t) => {
          if (t.id !== teamId) return t;
          const slots = t.slots.map((sl, i) =>
            i === slotIndex ? { ...sl, ...patch } : sl
          );
          return { ...t, slots };
        }),
      }));
    },
    []
  );

  const setSlotCharacter = useCallback(
    (teamId: string, slotIndex: number, characterId: string | null) => {
      // changing the character clears an incompatible weapon at the call site;
      // here we set character and reset weapon + sonata (a per-build note) to be safe.
      updateSlot(teamId, slotIndex, { characterId, weaponId: null, sonata: [] });
    },
    [updateSlot]
  );

  const setSlotWeapon = useCallback(
    (teamId: string, slotIndex: number, weaponId: string | null) => {
      updateSlot(teamId, slotIndex, { weaponId });
    },
    [updateSlot]
  );

  // Set a Sonata set on a slot at a piece tier. Tapping the tier a set is already
  // at removes it; tapping a different tier switches it. Adding/switching is a no-op
  // when it wouldn't fit the 5-echo budget or the distinct-set cap — the picker dims
  // those, this guards imports/races.
  const setSlotSonata = useCallback(
    (teamId: string, slotIndex: number, sonataId: string, pieces: number) => {
      setState((s) => ({
        ...s,
        teams: s.teams.map((t) => {
          if (t.id !== teamId) return t;
          const slots = t.slots.map((sl, i) => {
            if (i !== slotIndex) return sl;
            const existing = sl.sonata.find((p) => p.id === sonataId);
            if (existing && existing.pieces === pieces)
              return { ...sl, sonata: sl.sonata.filter((p) => p.id !== sonataId) };
            const others = sl.sonata.filter((p) => p.id !== sonataId);
            if (!existing && sl.sonata.length >= MAX_SONATA) return sl;
            if (sonataPiecesUsed(others) + pieces > ECHO_SLOTS) return sl;
            return { ...sl, sonata: [...others, { id: sonataId, pieces }] };
          });
          return { ...t, slots };
        }),
      }));
    },
    []
  );

  const clearSlot = useCallback(
    (teamId: string, slotIndex: number) => {
      updateSlot(teamId, slotIndex, { characterId: null, weaponId: null, sonata: [] });
    },
    [updateSlot]
  );

  const resetAll = useCallback(() => {
    setState({ inventory: {}, teams: [makeTeam("Team 1")] });
  }, []);

  const importState = useCallback((next: PlanState) => {
    setState(next);
  }, []);

  // ---- derived: weapon usage across all teams ----
  const usage = useMemo<UsageInfo>(() => {
    const used: Record<string, number> = {};
    // A resonator can appear in several teams (Vigor ≥ 2), but it's one physical
    // unit holding one weapon — so a given (resonator, weapon) pair only consumes
    // one copy no matter how many teams it shows up in. Count distinct pairs.
    const counted = new Set<string>();
    for (const t of state.teams) {
      for (let i = 0; i < t.slots.length; i++) {
        const sl = t.slots[i];
        if (!sl.weaponId) continue;
        const key = sl.characterId
          ? `${sl.characterId}|${sl.weaponId}`
          : `${t.id}:${i}|${sl.weaponId}`; // weapon with no resonator: count alone
        if (counted.has(key)) continue;
        counted.add(key);
        used[sl.weaponId] = (used[sl.weaponId] ?? 0) + 1;
      }
    }
    return {
      used,
      remaining: (wid) => (state.inventory[wid] ?? 0) - (used[wid] ?? 0),
      owned: (wid) => state.inventory[wid] ?? 0,
    };
  }, [state]);

  return {
    state,
    usage,
    setOwned,
    adjustOwned,
    addTeam,
    removeTeam,
    renameTeam,
    moveTeam,
    reorderTeam,
    setSlotCharacter,
    setSlotWeapon,
    setSlotSonata,
    clearSlot,
    resetAll,
    importState,
  };
}

export type PlanApi = ReturnType<typeof usePlan>;
