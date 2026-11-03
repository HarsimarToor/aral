"use client";

import { useMemo, useRef, useState } from "react";
import { db } from "@/lib/db";
import { todayStr } from "@/lib/dates";
import { CATEGORY_COLOR, CATEGORY_LABEL, QUICK_EXPENSES, peso, sum, weekdayDate } from "@/lib/allowance";
import { confirmDialog } from "@/components/ui/ConfirmHost";
import { notifyReward, notifyUndo } from "@/components/ui/RewardToast";
import type { Expense, ExpenseCategory } from "@/types";

const input = "mt-0.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm";

export default function ExpenseLogger({ weekExpenses }: { weekExpenses: Expense[] }) {
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const amountRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    await db.expenses.add({ date, category, note: note.trim(), amount: amt });
    notifyReward(`${peso(amt)} logged`, "💸");
    setNote("");
    setAmount("");
  }

  async function deleteExpense(exp: Expense) {
    if (exp.id === undefined) return;
    await db.expenses.delete(exp.id);
    notifyUndo(`Deleted ${peso(exp.amount)} expense`, () => {
      db.expenses.put(exp);
    });
  }

  async function clearWeek() {
    const removed = weekExpenses;
    const ok = await confirmDialog({
      title: `Delete all ${removed.length} expenses this week?`,
      message: `That is ${peso(sum(removed))} in total. You can press Undo right after.`,
      confirmLabel: "Delete all",
    });
    if (!ok) return;
    await db.expenses.bulkDelete(removed.map((x) => x.id).filter((id): id is number => id !== undefined));
    notifyUndo(`Deleted ${removed.length} expenses`, () => {
      db.expenses.bulkPut(removed);
    });
  }

  // Group the selected week's expenses by day, newest first.
  const days = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of weekExpenses) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [weekExpenses]);

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-700">Expense logger</h3>
        {weekExpenses.length > 0 && (
          <button
            onClick={clearWeek}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50"
            title="Delete every expense of the week shown"
          >
            🗑 Clear week ({weekExpenses.length})
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {QUICK_EXPENSES.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => {
              setCategory(q.category);
              setNote(q.note);
              amountRef.current?.focus();
            }}
            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-emerald-50 hover:text-emerald-700"
          >
            + {q.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-5">
        <label className="text-xs font-medium text-slate-600">
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} required />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className={input}>
            {(Object.keys(CATEGORY_LABEL) as ExpenseCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600 sm:col-span-2">
          Note
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Jeepney to school" className={input} />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Amount (₱)
          <input ref={amountRef} type="number" min={0.01} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className={input} required />
        </label>
        <button className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 sm:col-span-5 sm:w-fit">
          Log expense
        </button>
      </form>

      {days.length === 0 ? (
        <p className="mt-4 text-center text-sm text-slate-500">No expenses logged for this week yet.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {days.map(([d, items]) => (
            <div key={d}>
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 text-sm">
                <span className="font-semibold text-slate-700">{weekdayDate(d)}</span>
                <span className="font-bold text-slate-800">{peso(sum(items))}</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {items.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[e.category] }} />
                    <span className="min-w-0 flex-1 truncate text-slate-700">
                      {e.note || CATEGORY_LABEL[e.category]}
                      <span className="ml-2 text-xs text-slate-400">{CATEGORY_LABEL[e.category]}</span>
                    </span>
                    <span className="font-medium text-slate-800">{peso(e.amount)}</span>
                    <button
                      onClick={() => deleteExpense(e)}
                      className="text-xs text-slate-400 hover:text-red-600"
                      aria-label={`Delete expense ${e.note || CATEGORY_LABEL[e.category]}`}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
