"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { todayStr } from "@/lib/dates";
import { addStarterChain, deleteChain } from "@/lib/chains";
import {
  DAY_LABELS,
  TIME_BLOCKS,
  blockForHour,
  currentStreak,
  isScheduled,
  nextMilestone,
} from "@/lib/chainLogic";
import { confirmDialog } from "@/components/ui/ConfirmHost";
import type { Chain, TimeBlock } from "@/types";
import ChainEditor from "./ChainEditor";
import FocusFlow from "./FocusFlow";

export default function ChainsSection() {
  const chains = useLiveQuery(() => db.chains.toArray(), []);
  const steps = useLiveQuery(() => db.chainSteps.toArray(), []);
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Chain | null>(null);
  const [running, setRunning] = useState<number | null>(null);
  const [nowBlock, setNowBlock] = useState<TimeBlock | null>(null);

  // The current time of day is read in the browser only (never while the server renders).
  useEffect(() => {
    setNowBlock(blockForHour(new Date().getHours()));
  }, []);

  if (!chains || !steps || !tasks) {
    return (
      <section id="routines" className="section-card accent-teal scroll-mt-24">
        <h2 className="text-lg font-bold text-slate-800">🔗 Routine chains</h2>
        <p className="mt-2 text-sm text-slate-500">Loading...</p>
      </section>
    );
  }

  const today = todayStr();
  const stepsOf = (id?: number) => steps.filter((s) => s.chainId === id).sort((a, b) => a.order - b.order);
  const runningChain = chains.find((c) => c.id === running);
  const showEditor = creating || editing !== null;

  return (
    <section id="routines" className="section-card accent-teal scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-800">🔗 Routine chains</h2>
          <p className="text-sm text-slate-500">
            Bundle small habits into a guided sequence. Finish a chain to grow your streak and your plant.
          </p>
        </div>
        {!showEditor && (
          <button
            onClick={() => setCreating(true)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            ＋ New routine
          </button>
        )}
      </div>

      {showEditor && (
        <div className="mt-4">
          <ChainEditor
            key={editing?.id ?? "new"}
            editing={editing}
            editingSteps={editing ? stepsOf(editing.id) : []}
            tasks={tasks}
            onDone={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      {chains.length === 0 && !showEditor ? (
        <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
          <div className="bob text-5xl" aria-hidden>
            🌙
          </div>
          <p className="mt-2 font-semibold text-slate-700">No routines yet</p>
          <p className="mx-auto max-w-md text-sm text-slate-500">
            A routine is a short list of steps you do in order, like a “Nightly Reset”. Build your own or start from an
            example.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button onClick={() => setCreating(true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
              ＋ Build my own
            </button>
            <button
              onClick={() => addStarterChain()}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              ✨ Add the “Nightly Reset” example
            </button>
          </div>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 lg:grid-cols-2">
          {chains.map((c) => {
            const list = stepsOf(c.id);
            const minutes = list.reduce((t, s) => t + s.minutes, 0);
            const doneToday = c.lastCompletedDate === today;
            const scheduled = isScheduled(c.days, today);
            const streak = currentStreak(c, today);
            const milestone = nextMilestone(streak);
            const goodTime = !doneToday && scheduled && (c.timeBlock === nowBlock || c.timeBlock === "anytime");
            const everyDay = c.days.length === 0 || c.days.length === 7;

            return (
              <li
                key={c.id}
                className={`lift rounded-2xl border bg-white p-4 ${goodTime ? "border-emerald-300 ring-pulse" : "border-slate-200"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-base font-bold text-slate-800">
                      {TIME_BLOCKS[c.timeBlock].emoji} {c.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {TIME_BLOCKS[c.timeBlock].label} · {list.length} step{list.length === 1 ? "" : "s"} · {minutes} min ·{" "}
                      {everyDay ? "every day" : c.days.map((d) => DAY_LABELS[d]).join(" ")}
                    </div>
                  </div>
                  {doneToday ? (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">✓ Done today</span>
                  ) : goodTime ? (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">⏰ Good time to start</span>
                  ) : !scheduled ? (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">Rest day</span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold text-orange-600" title="Consecutive completed days for this routine">
                    🔥 {streak}-day streak
                  </span>
                  <span className="font-semibold text-sky-600" title="Shields automatically save your streak if you miss a day">
                    🛡️ {c.shields} shield{c.shields === 1 ? "" : "s"}
                  </span>
                  {milestone && (
                    <span className="text-xs text-slate-400">
                      Day {milestone.at}: +{milestone.bonus} bonus XP per run
                    </span>
                  )}
                </div>

                <ol className="mt-3 space-y-1 text-sm text-slate-600">
                  {list.map((s, i) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{s.title}</span>
                      {s.linkedTaskId !== undefined && <span title="Linked to a task">🔗</span>}
                      <span className="text-xs text-slate-400">{s.minutes} min</span>
                    </li>
                  ))}
                </ol>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => c.id !== undefined && setRunning(c.id)}
                    disabled={list.length === 0}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
                  >
                    {doneToday ? "↻ Run again" : "▶ Start chain"}
                  </button>
                  <button
                    onClick={() => {
                      setCreating(false);
                      setEditing(c);
                    }}
                    className="ml-auto text-xs text-slate-500 hover:text-emerald-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (c.id === undefined) return;
                      const ok = await confirmDialog({
                        title: `Delete "${c.name}"?`,
                        message: "The routine, its steps and its streak will be removed.",
                        confirmLabel: "Delete routine",
                      });
                      if (ok) await deleteChain(c.id);
                    }}
                    className="text-xs text-slate-400 hover:text-red-600"
                    aria-label={`Delete routine ${c.name}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {runningChain && (
        <FocusFlow
          chain={runningChain}
          steps={stepsOf(runningChain.id)}
          tasks={tasks}
          onClose={() => setRunning(null)}
        />
      )}
    </section>
  );
}
