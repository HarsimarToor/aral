"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { addDays, todayStr } from "@/lib/dates";
import { expensesInWeek, shortDate, sum, weekStartOf } from "@/lib/allowance";
import BaonTracker from "./BaonTracker";
import ExpenseLogger from "./ExpenseLogger";
import SavingsChart from "./SavingsChart";

export default function AllowanceSection() {
  const expenses = useLiveQuery(() => db.expenses.toArray(), []);
  const allowances = useLiveQuery(() => db.allowance.toArray(), []);
  // Today's date is only read in the browser. Reading it while Next.js prerenders
  // the page on the server is what caused the "unstable value new Date()" error.
  const [weekStart, setWeekStart] = useState<string | null>(null);
  useEffect(() => {
    setWeekStart(weekStartOf(todayStr()));
  }, []);

  if (!expenses || !allowances || !weekStart) {
    return (
      <section id="allowance" className="scroll-mt-24 section-card accent-amber">
        <h2 className="text-lg font-bold text-slate-800">💰 Allowance</h2>
        <p className="mt-2 text-sm text-slate-500">Loading...</p>
      </section>
    );
  }

  const thisWeek = weekStartOf(todayStr());
  const weekExpenses = expensesInWeek(expenses, weekStart);
  const row = allowances.find((a) => a.weekStart === weekStart);
  const previous = [...allowances]
    .filter((a) => a.weekStart < weekStart)
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))[0];

  return (
    <section id="allowance" className="scroll-mt-24 section-card accent-amber">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-800">💰 Allowance</h2>
          <p className="text-sm text-slate-500">Track your baon, log expenses and watch your savings grow.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100"
            aria-label="Previous week"
          >
            ←
          </button>
          <span className="min-w-[150px] text-center font-semibold text-slate-700">
            {shortDate(weekStart)} – {shortDate(addDays(weekStart, 6))}
            {weekStart === thisWeek && <span className="ml-1 text-xs font-normal text-emerald-600">(this week)</span>}
          </span>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100"
            aria-label="Next week"
          >
            →
          </button>
          {weekStart !== thisWeek && (
            <button onClick={() => setWeekStart(thisWeek)} className="text-xs font-medium text-emerald-700 hover:underline">
              This week
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <BaonTracker
          key={weekStart}
          weekStart={weekStart}
          row={row}
          previous={previous}
          spent={sum(weekExpenses)}
        />
        <ExpenseLogger weekExpenses={weekExpenses} />
        <SavingsChart allowances={allowances} expenses={expenses} />
      </div>
    </section>
  );
}
