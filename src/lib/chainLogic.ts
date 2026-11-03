// Pure routine-chain rules (no database), so they are easy to test.
import { addDays } from "@/lib/dates";
import type { TimeBlock } from "@/types";

export const MAX_SHIELDS = 3;
export const START_SHIELDS = 2;

export const TIME_BLOCKS: Record<TimeBlock, { label: string; emoji: string }> = {
  morning: { label: "Morning", emoji: "🌅" },
  afternoon: { label: "Afternoon", emoji: "☀️" },
  evening: { label: "Evening", emoji: "🌇" },
  night: { label: "Night", emoji: "🌙" },
  anytime: { label: "Anytime", emoji: "⏱️" },
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function blockForHour(hour: number): TimeBlock {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** An empty day list means "every day". */
export function isScheduled(days: number[], dateStr: string): boolean {
  return days.length === 0 || days.includes(dayOfWeek(dateStr));
}

export interface StreakState {
  days: number[];
  streak: number;
  shields: number;
  lastCompletedDate?: string;
}

/** Scheduled days strictly between `last` and `today` that were skipped. Stops counting past `cap`. */
function missedScheduled(days: number[], last: string, today: string, cap: number): number {
  let missed = 0;
  let d = addDays(last, 1);
  for (let guard = 0; d < today; guard++) {
    if (guard > 400) return cap + 1; // a very long gap: the streak is long gone
    if (isScheduled(days, d)) {
      missed++;
      if (missed > cap) return missed;
    }
    d = addDays(d, 1);
  }
  return missed;
}

/**
 * What the streak becomes when the chain is completed today.
 * Skipped scheduled days are covered by streak shields (one shield per missed day).
 * If there are not enough shields, the streak starts again at 1.
 */
export function nextStreak(chain: StreakState, today: string): { streak: number; shieldsUsed: number } {
  const last = chain.lastCompletedDate;
  if (!last) return { streak: 1, shieldsUsed: 0 };
  if (last >= today) return { streak: chain.streak, shieldsUsed: 0 };
  const missed = missedScheduled(chain.days, last, today, chain.shields);
  if (missed <= chain.shields) return { streak: chain.streak + 1, shieldsUsed: missed };
  return { streak: 1, shieldsUsed: 0 };
}

/** The streak to show right now (0 if it can no longer be saved by shields). */
export function currentStreak(chain: StreakState, today: string): number {
  const last = chain.lastCompletedDate;
  if (!last || chain.streak === 0) return 0;
  if (last >= today) return chain.streak;
  return missedScheduled(chain.days, last, today, chain.shields) <= chain.shields ? chain.streak : 0;
}

/** Longer streaks pay more XP per completed chain. */
export function chainXp(streak: number): number {
  const base = 15;
  if (streak >= 30) return base + 20;
  if (streak >= 14) return base + 12;
  if (streak >= 7) return base + 8;
  if (streak >= 3) return base + 4;
  return base;
}

export function nextMilestone(streak: number): { at: number; bonus: number } | null {
  const steps: [number, number][] = [
    [3, 4],
    [7, 8],
    [14, 12],
    [30, 20],
  ];
  for (const [at, bonus] of steps) if (streak < at) return { at, bonus };
  return null;
}
