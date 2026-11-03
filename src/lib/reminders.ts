import { daysUntil } from "@/lib/dates";
import type { Task } from "@/types";

// 5 -> 3 -> 1 day escalation, then overdue.
export type ReminderLevel = "early" | "prep" | "critical" | "today" | "overdue";

export interface Reminder {
  task: Task;
  days: number; // negative = overdue
  level: ReminderLevel;
}

export const HEALTH_PENALTY_PER_OVERDUE = 15;

export function levelForDays(days: number): ReminderLevel | null {
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "critical";
  if (days <= 3) return "prep";
  if (days <= 5) return "early";
  return null; // too far away to nag about
}

export const LEVEL_LABEL: Record<ReminderLevel, string> = {
  early: "Early warning",
  prep: "Time to prepare",
  critical: "Due tomorrow",
  today: "Due today",
  overdue: "Overdue",
};

export const LEVEL_STYLE: Record<ReminderLevel, string> = {
  early: "bg-blue-100 text-blue-700",
  prep: "bg-amber-100 text-amber-800",
  critical: "bg-orange-100 text-orange-800",
  today: "bg-red-100 text-red-700",
  overdue: "bg-red-600 text-white",
};

/** Unfinished to-dos with a deadline close enough to matter, most urgent first. */
export function getReminders(tasks: Task[]): Reminder[] {
  const out: Reminder[] = [];
  for (const task of tasks) {
    if (task.type !== "todo" || task.done || !task.dueDate) continue;
    const days = daysUntil(task.dueDate);
    const level = levelForDays(days);
    if (level) out.push({ task, days, level });
  }
  return out.sort((a, b) => a.days - b.days);
}

export function countOverdue(tasks: Task[]): number {
  return tasks.filter((t) => t.type === "todo" && !t.done && !!t.dueDate && daysUntil(t.dueDate) < 0).length;
}

/** Plant health is worked out from the tasks, so finishing or rescheduling an overdue task restores it. */
export function computeHealth(tasks: Task[]): number {
  return Math.max(0, 100 - HEALTH_PENALTY_PER_OVERDUE * countOverdue(tasks));
}
