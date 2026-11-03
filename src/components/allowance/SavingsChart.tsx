"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORY_COLOR, CATEGORY_LABEL, buildSavingsSeries, categoryTotals, peso } from "@/lib/allowance";
import type { Allowance, Expense } from "@/types";

export default function SavingsChart({ allowances, expenses }: { allowances: Allowance[]; expenses: Expense[] }) {
  const series = buildSavingsSeries(allowances, expenses);
  const categories = categoryTotals(expenses);
  const grandTotal = categories.reduce((t, c) => t + c.total, 0);
  const totalSaved = series.length ? series[series.length - 1].totalSaved : 0;

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-700">Spending and savings over time</h3>
        <span className="text-sm font-semibold text-emerald-700">Total saved: {peso(totalSaved)}</span>
      </div>

      {series.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          Set your baon for a week to start seeing your spending and savings here.
        </p>
      ) : (
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={48} />
              <Tooltip formatter={(value) => peso(Number(value))} />
              <Legend />
              <Bar dataKey="spent" name="Spent" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="totalSaved" name="Total saved" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      {series.length > 0 && (
        <p className="mt-1 text-xs text-slate-500">
          Saved = baon left unspent each week. The current week counts what is left so far.
        </p>
      )}

      {categories.length > 0 && (
        <div className="mt-5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Where your money goes (all time)</h4>
          <ul className="mt-2 space-y-2">
            {categories.map((c) => {
              const pct = Math.round((c.total / grandTotal) * 100);
              return (
                <li key={c.category}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{CATEGORY_LABEL[c.category]}</span>
                    <span className="text-slate-500">
                      {peso(c.total)} · {pct}%
                    </span>
                  </div>
                  <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLOR[c.category] }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
