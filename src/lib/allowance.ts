import { addDays, daysUntil } from "@/lib/dates";
import type { Allowance, Expense, ExpenseCategory } from "@/types";

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  transit: "Transit",
  food: "Food",
  school: "School",
  other: "Other",
};

export const CATEGORY_COLOR: Record<ExpenseCategory, string> = {
  transit: "#3b82f6",
  food: "#f59e0b",
  school: "#8b5cf6",
  other: "#64748b",
};

/** Quick-add chips on the expense form. */
export const QUICK_EXPENSES: { label: string; note: string; category: ExpenseCategory }[] = [
  { label: "Jeepney", note: "Jeepney fare", category: "transit" },
  { label: "Habal-habal", note: "Habal-habal fare", category: "transit" },
  { label: "Lunch", note: "Lunch", category: "food" },
  { label: "Snack", note: "Snack", category: "food" },
  { label: "School", note: "School supplies", category: "school" },
];

export function peso(n: number): string {
  return `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

/** Monday of the week that contains `dateStr`. */
export function weekStartOf(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // Monday = 0
  return addDays(dateStr, -dow);
}

export function shortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function weekdayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function sum(expenses: Expense[]): number {
  return expenses.reduce((total, e) => total + e.amount, 0);
}

export function expensesInWeek(expenses: Expense[], weekStart: string): Expense[] {
  const end = addDays(weekStart, 6);
  return expenses.filter((e) => e.date >= weekStart && e.date <= end);
}

/** Days left in the week including today, or null when the week is not the current one. */
export function daysLeftInWeek(weekStart: string): number | null {
  const untilEnd = daysUntil(addDays(weekStart, 6));
  const sinceStart = -daysUntil(weekStart);
  if (untilEnd < 0 || sinceStart < 0) return null;
  return untilEnd + 1;
}

export interface WeekPoint {
  week: string; // label, e.g. "Oct 26"
  allowance: number;
  spent: number;
  saved: number; // unspent allowance that week (never below 0)
  totalSaved: number; // running total
}

/** One point per week that has an allowance set. Savings = what was left unspent. */
export function buildSavingsSeries(allowances: Allowance[], expenses: Expense[]): WeekPoint[] {
  const sorted = [...allowances].sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
  let running = 0;
  return sorted.map((a) => {
    const spent = sum(expensesInWeek(expenses, a.weekStart));
    const saved = Math.max(0, a.amount - spent);
    running += saved;
    return { week: shortDate(a.weekStart), allowance: a.amount, spent, saved, totalSaved: running };
  });
}

export function categoryTotals(expenses: Expense[]): { category: ExpenseCategory; total: number }[] {
  const totals: Record<ExpenseCategory, number> = { transit: 0, food: 0, school: 0, other: 0 };
  for (const e of expenses) totals[e.category] += e.amount;
  return (Object.keys(totals) as ExpenseCategory[])
    .map((category) => ({ category, total: totals[category] }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}
