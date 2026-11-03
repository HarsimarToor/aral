// XP table, level curve, coins rule and plant stages.
// Change the numbers ONLY in this file.

export type Priority = "low" | "medium" | "high";
export type TaskType = "todo" | "daily" | "habit";

export const XP_RULES = {
  todo: { low: 5, medium: 10, high: 20 },
  daily: 8,
  habit: 5,
  flashcardCorrect: 2,
  studySession: 15,
  examBossDefeated: 50,
} as const;

/** Coins are about half the XP, minimum 1 (5 XP -> 3, 8 XP -> 4, 20 XP -> 10). */
export function coinsForXp(xp: number): number {
  return Math.max(1, Math.ceil(xp / 2));
}

/** XP for finishing a task. Priority only matters for to-dos. */
export function xpForTask(type: TaskType, priority: Priority = "medium"): number {
  if (type === "todo") return XP_RULES.todo[priority];
  return type === "daily" ? XP_RULES.daily : XP_RULES.habit;
}

/** XP needed to go from `level` to `level + 1`: 50, 75, 100, 125, ... */
export function xpToNext(level: number): number {
  return 25 * (level + 1);
}

/** Total XP needed to reach `level` (level 1 = 0, level 2 = 50, level 3 = 125, ...). */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpToNext(l);
  return total;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  let remaining = Math.max(0, xp);
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  return level;
}

export interface LevelProgress {
  level: number;
  current: number; // XP earned inside this level
  needed: number; // XP needed to finish this level
  pct: number; // 0 - 100
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const current = Math.max(0, xp) - totalXpForLevel(level);
  const needed = xpToNext(level);
  return { level, current, needed, pct: Math.min(100, (current / needed) * 100) };
}

// ---------- Plant stages (driven by level) ----------

export type PlantStage = "seed" | "sprout" | "leafy" | "sapling" | "tree" | "flowering";

export function plantStageForLevel(level: number): PlantStage {
  if (level >= 18) return "flowering";
  if (level >= 12) return "tree";
  if (level >= 8) return "sapling";
  if (level >= 5) return "leafy";
  if (level >= 3) return "sprout";
  return "seed";
}

export const PLANT_STAGE_LABEL: Record<PlantStage, string> = {
  seed: "Seed",
  sprout: "Sprout",
  leafy: "Leafy Plant",
  sapling: "Sapling",
  tree: "Tree",
  flowering: "Flowering Tree",
};

// Placeholder visuals until the real plant artwork is built.
export const PLANT_STAGE_EMOJI: Record<PlantStage, string> = {
  seed: "🌰",
  sprout: "🌱",
  leafy: "🌿",
  sapling: "🪴",
  tree: "🌳",
  flowering: "🌸",
};
