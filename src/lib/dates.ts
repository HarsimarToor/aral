// Local-date helpers. All dates are plain "YYYY-MM-DD" strings in the student's own timezone.

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return toDateStr(new Date(y, m - 1, d + days));
}

export function yesterdayStr(): string {
  return addDays(todayStr(), -1);
}

/** Whole days from today until `dateStr` (negative = overdue). */
export function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - start) / 86_400_000);
}

export function formatDue(dateStr: string): string {
  const n = daysUntil(dateStr);
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  if (n === -1) return "Overdue by 1 day";
  if (n < 0) return `Overdue by ${-n} days`;
  return `Due in ${n} days`;
}
