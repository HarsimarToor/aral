"use client";

import { useState } from "react";
import { db } from "@/lib/db";
import { daysLeftInWeek, peso } from "@/lib/allowance";
import { confirmDialog } from "@/components/ui/ConfirmHost";
import { notifyUndo } from "@/components/ui/RewardToast";
import type { Allowance } from "@/types";

const input = "mt-0.5 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm";

function BaonForm({
  weekStart,
  initial,
  isNew,
  onDone,
}: {
  weekStart: string;
  initial: { amount: number; savingsTarget: number; limitWarn: number };
  isNew: boolean;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(initial.amount ? String(initial.amount) : "");
  const [target, setTarget] = useState(initial.savingsTarget ? String(initial.savingsTarget) : "");
  const [warn, setWarn] = useState(String(initial.limitWarn || 80));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    await db.allowance.put({
      weekStart,
      amount: amt,
      savingsTarget: Math.max(0, Number(target) || 0),
      limitWarn: Math.min(100, Math.max(1, Number(warn) || 80)),
    });
    onDone();
  }

  return (
    <form onSubmit={save} className="mt-3 grid gap-3 sm:grid-cols-4">
      <label className="text-xs font-medium text-slate-600">
        Weekly baon (₱)
        <input type="number" min={1} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className={input} required />
      </label>
      <label className="text-xs font-medium text-slate-600">
        Savings target (₱)
        <input type="number" min={0} step="any" value={target} onChange={(e) => setTarget(e.target.value)} className={input} />
      </label>
      <label className="text-xs font-medium text-slate-600">
        Warn me at (% spent)
        <input type="number" min={1} max={100} value={warn} onChange={(e) => setWarn(e.target.value)} className={input} />
      </label>
      <div className="flex items-end gap-2">
        <button className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
          {isNew ? "Set baon" : "Save"}
        </button>
        {!isNew && (
          <button type="button" onClick={onDone} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function BaonTracker({
  weekStart,
  row,
  previous,
  spent,
}: {
  weekStart: string;
  row: Allowance | undefined;
  previous: Allowance | undefined;
  spent: number;
}) {
  const [editing, setEditing] = useState(false);

  if (!row) {
    return (
      <div className="rounded-xl bg-slate-50 p-4">
        <h3 className="text-sm font-bold text-slate-700">Set your baon for this week</h3>
        <p className="text-xs text-slate-500">Enter how much allowance you have so ARAL can track what is left.</p>
        <BaonForm
          weekStart={weekStart}
          initial={{
            amount: previous?.amount ?? 0,
            savingsTarget: previous?.savingsTarget ?? 0,
            limitWarn: previous?.limitWarn ?? 80,
          }}
          isNew
          onDone={() => {}}
        />
      </div>
    );
  }

  async function removeBaon() {
    if (!row) return;
    const saved = row;
    const ok = await confirmDialog({
      title: "Remove this week's baon?",
      message: "Your logged expenses stay. You can set a new baon afterwards, or press Undo right after.",
      confirmLabel: "Remove baon",
    });
    if (!ok) return;
    await db.allowance.delete(saved.weekStart);
    setEditing(false);
    notifyUndo("Baon removed", () => {
      db.allowance.put(saved);
    });
  }

  const remaining = row.amount - spent;
  const pct = Math.min(100, (spent / row.amount) * 100);
  const over = spent > row.amount;
  const nearLimit = !over && pct >= row.limitWarn;
  const belowTarget = !over && row.savingsTarget > 0 && remaining < row.savingsTarget;
  const barColor = over ? "bg-red-500" : nearLimit ? "bg-amber-500" : "bg-emerald-500";
  const daysLeft = daysLeftInWeek(weekStart);

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-700">Weekly baon</h3>
        <div className="flex items-center gap-2">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:text-emerald-700"
            >
              ✏️ Edit baon
            </button>
          )}
          <button
            onClick={removeBaon}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50"
            title="Remove the baon for this week (your expenses are kept)"
          >
            🗑 Remove baon
          </button>
        </div>
      </div>

      {editing ? (
        <BaonForm
          weekStart={weekStart}
          initial={{ amount: row.amount, savingsTarget: row.savingsTarget, limitWarn: row.limitWarn }}
          isNew={false}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-slate-500">Allowance</div>
              <div className="text-lg font-extrabold text-slate-800">{peso(row.amount)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Spent</div>
              <div className="text-lg font-extrabold text-slate-800">{peso(spent)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Remaining</div>
              <div className={`text-lg font-extrabold ${over ? "text-red-600" : "text-emerald-600"}`}>
                {over ? `-${peso(-remaining)}` : peso(remaining)}
              </div>
            </div>
          </div>

          <div
            className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Share of allowance spent"
          >
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-right text-xs text-slate-500">{Math.round(pct)}% spent</div>

          <ul className="mt-2 space-y-1 text-sm">
            {over && <li className="font-medium text-red-600">⚠ You are over your baon by {peso(-remaining)}.</li>}
            {nearLimit && (
              <li className="font-medium text-amber-700">
                ⚠ You have used {Math.round(pct)}% of your baon. Slow down on non-essentials.
              </li>
            )}
            {belowTarget && (
              <li className="text-amber-700">
                You are dipping into your {peso(row.savingsTarget)} savings target ({peso(remaining)} left).
              </li>
            )}
            {!over && row.savingsTarget > 0 && !belowTarget && (
              <li className="text-emerald-700">✓ On track to save {peso(row.savingsTarget)} this week.</li>
            )}
            {!over && daysLeft !== null && remaining > 0 && (
              <li className="text-slate-600">
                About {peso(Math.floor(Math.max(0, remaining - row.savingsTarget) / daysLeft))} per day to spare for the
                next {daysLeft} day{daysLeft === 1 ? "" : "s"} while still keeping your savings target.
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
