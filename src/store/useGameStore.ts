import { create } from "zustand";
import { db } from "@/lib/db";
import { notifyReward } from "@/components/ui/RewardToast";
import {
  coinsForXp,
  levelFromXp,
  plantStageForLevel,
  type PlantStage,
} from "@/lib/game/levels";

export interface AwardInput {
  source: string;
  xp: number;
  /** Unique id for what is being paid, e.g. `task:12` or `daily:3:2026-10-27`. Pays only once. */
  refId?: string;
  /** Override the coins. Default is half the XP (minimum 1). */
  coins?: number;
}

export interface AwardResult {
  xp: number;
  coins: number;
  leveledUp: boolean;
}

interface GameState {
  xp: number;
  coins: number;
  level: number;
  plantStage: PlantStage;
  health: number; // 0 - 100
  owned: string[]; // bought plant cosmetics
  pendingLevelUp: number | null; // level number to show in the popup
  loaded: boolean;
  paid: Record<string, { xp: number; coins: number }>; // refId -> what it paid

  load: () => Promise<void>;
  awardXp: (input: AwardInput) => AwardResult | null;
  revokeXp: (refId: string) => boolean;
  dismissLevelUp: () => void;
  /** Takes coins if the student can afford it. Returns false (and deducts nothing) if not. */
  spendCoins: (amount: number) => boolean;
  addOwned: (itemId: string) => void;
  setHealth: (health: number) => void;
}

function snapshot(s: GameState) {
  return {
    id: 1,
    xp: s.xp,
    coins: s.coins,
    level: s.level,
    plantStage: s.plantStage,
    health: s.health,
    owned: s.owned,
  };
}

// Save to Dexie in the background. The UI never waits on the database.
function saveGame(s: GameState) {
  db.game.put(snapshot(s)).catch(() => {});
}

export const useGameStore = create<GameState>((set, get) => ({
  xp: 0,
  coins: 0,
  level: 1,
  plantStage: "seed",
  health: 100,
  owned: [],
  pendingLevelUp: null,
  loaded: false,
  paid: {},

  load: async () => {
    if (get().loaded) return; // React strict mode runs effects twice in dev
    try {
      const row = await db.game.get(1);
      const ledger = await db.ledger.toArray();
      const paid: GameState["paid"] = {};
      for (const e of ledger) {
        if (!e.refId.startsWith("anon:")) paid[e.refId] = { xp: e.xp, coins: e.coins };
      }
      if (row) {
        set({
          xp: row.xp,
          coins: row.coins,
          level: row.level,
          plantStage: row.plantStage,
          health: row.health,
          owned: row.owned,
          paid,
          loaded: true,
        });
      } else {
        set({ paid, loaded: true });
        saveGame(get());
      }
    } catch {
      // Storage blocked (private window, etc.). The app still works until refresh.
      set({ loaded: true });
    }
  },

  awardXp: ({ source, xp, refId, coins }) => {
    const state = get();
    if (refId && state.paid[refId]) return null; // already paid once

    const earnedCoins = coins ?? coinsForXp(xp);
    const newXp = state.xp + xp;
    const newLevel = levelFromXp(newXp);
    const leveledUp = newLevel > state.level;

    set({
      xp: newXp,
      coins: state.coins + earnedCoins,
      level: newLevel,
      plantStage: plantStageForLevel(newLevel),
      pendingLevelUp: leveledUp ? newLevel : state.pendingLevelUp,
      paid: refId ? { ...state.paid, [refId]: { xp, coins: earnedCoins } } : state.paid,
    });
    saveGame(get());

    db.ledger
      .put({
        refId: refId ?? `anon:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        source,
        xp,
        coins: earnedCoins,
        createdAt: new Date().toISOString(),
      })
      .catch(() => {});

    notifyReward(`+${xp} XP · +${earnedCoins} coins`, "⭐");
    return { xp, coins: earnedCoins, leveledUp };
  },

  revokeXp: (refId) => {
    const state = get();
    const entry = state.paid[refId];
    if (!entry) return false;

    const newXp = Math.max(0, state.xp - entry.xp);
    const newLevel = levelFromXp(newXp);
    const { [refId]: _removed, ...rest } = state.paid;
    void _removed;

    set({
      xp: newXp,
      coins: Math.max(0, state.coins - entry.coins),
      level: newLevel,
      plantStage: plantStageForLevel(newLevel),
      paid: rest,
    });
    saveGame(get());
    db.ledger.delete(refId).catch(() => {});
    notifyReward(`-${entry.xp} XP taken back`, "↩️");
    return true;
  },

  dismissLevelUp: () => set({ pendingLevelUp: null }),

  spendCoins: (amount) => {
    const state = get();
    if (amount < 0 || state.coins < amount) return false;
    set({ coins: state.coins - amount });
    saveGame(get());
    return true;
  },

  addOwned: (itemId) => {
    const state = get();
    if (state.owned.includes(itemId)) return;
    set({ owned: [...state.owned, itemId] });
    saveGame(get());
  },

  setHealth: (health) => {
    set({ health: Math.max(0, Math.min(100, Math.round(health))) });
    saveGame(get());
  },
}));
