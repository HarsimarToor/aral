"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { daysUntil, formatDue, todayStr } from "@/lib/dates";
import { expensesInWeek, peso, sum, weekStartOf } from "@/lib/allowance";
import { currentStreak } from "@/lib/chainLogic";
import { isTaskDone, toggleTask } from "@/lib/tasks";
import type { Task } from "@/types";
import { useGameStore } from "@/store/useGameStore";
import { PLANT_STAGE_EMOJI, PLANT_STAGE_LABEL, levelProgress } from "@/lib/game/levels";

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Tile({ href, icon, label, value, sub, tone }: { href: string; icon: string; label: string; value: string; sub: string; tone: string }) {
  return (
    <a href={href} className="lift block rounded-2xl bg-white/90 p-4 text-slate-800 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span aria-hidden className="text-base">
          {icon}
        </span>
        {label}
      </div>
      <div className={`mt-1 text-2xl font-extrabold ${tone}`}>{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </a>
  );
}

export default function HomeHero() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);
  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const cards = useLiveQuery(() => db.flashcards.count(), []);
  const chains = useLiveQuery(() => db.chains.toArray(), []);
  const allowances = useLiveQuery(() => db.allowance.toArray(), []);
  const expenses = useLiveQuery(() => db.expenses.toArray(), []);

  const xp = useGameStore((s) => s.xp);
  const plantStage = useGameStore((s) => s.plantStage);
  const { level, current, needed } = levelProgress(xp);

  const [greeting, setGreeting] = useState("Welcome back");
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    const now = new Date();
    setGreeting(greetingFor(now.getHours()));
    setDateLabel(now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  const ready = tasks && subjects && cards !== undefined && chains && allowances && expenses;

  let attention = 0;
  let overdue = 0;
  let baonValue = "—";
  let baonSub = "Set your baon";
  let bestStreak = 0;
  let hasBaon = false;
  let next: Task | null = null;
  let caughtUp = false;
  if (ready) {
    const today = todayStr();
    // "Next up": the nearest deadline first (then priority), then any other pending task.
    const rank = { high: 0, medium: 1, low: 2 } as const;
    const pending = tasks.filter((t) => !isTaskDone(t, today));
    const dated = pending
      .filter((t) => t.type === "todo" && t.dueDate)
      .sort((a, b) =>
        a.dueDate! === b.dueDate! ? rank[a.priority] - rank[b.priority] : a.dueDate! < b.dueDate! ? -1 : 1
      );
    next = dated[0] ?? pending.find((t) => t.type === "todo") ?? pending[0] ?? null;
    caughtUp = tasks.length > 0 && pending.length === 0;
    for (const t of tasks) {
      if (isTaskDone(t, today)) continue;
      if (t.type !== "todo") attention++;
      else if (t.dueDate && daysUntil(t.dueDate) <= 0) {
        attention++;
        if (daysUntil(t.dueDate) < 0) overdue++;
      }
    }
    const week = weekStartOf(today);
    const row = allowances.find((a) => a.weekStart === week);
    if (row) {
      hasBaon = true;
      const left = row.amount - sum(expensesInWeek(expenses, week));
      baonValue = left < 0 ? `-${peso(-left)}` : peso(left);
      baonSub = left < 0 ? "Over budget this week" : "left this week";
    }
    bestStreak = chains.reduce((best, c) => Math.max(best, currentStreak(c, today)), 0);
  }

  const checklist = ready
    ? [
        { label: "Add a subject", done: subjects.length > 0, href: "#assignments" },
        { label: "Add your first task", done: tasks.length > 0, href: "#assignments" },
        { label: "Build a routine chain", done: chains.length > 0, href: "#routines" },
        { label: "Set this week's baon", done: hasBaon, href: "#allowance" },
        { label: "Make some flashcards", done: (cards ?? 0) > 0, href: "#learning" },
      ]
    : [];
  const doneCount = checklist.filter((c) => c.done).length;
  const nextTask = next as Task | null;

  return (
    <section className="space-y-4" aria-label="Today at a glance">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10" aria-hidden />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-50">{dateLabel || "Today"}</p>
            <h1 className="text-3xl font-extrabold sm:text-4xl">{greeting}! 👋</h1>
            <p className="mt-1 max-w-md text-emerald-50">
              {ready && attention > 0
                ? `You have ${attention} thing${attention === 1 ? "" : "s"} to take care of today. Every task you finish grows your plant.`
                : "Plan your tasks, track your baon and study smarter. Every task you finish grows your plant."}
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-white/15 px-5 py-3 backdrop-blur">
            <span className="bob text-5xl" aria-hidden>
              {PLANT_STAGE_EMOJI[plantStage]}
            </span>
            <div className="text-sm">
              <div className="font-bold">Level {level}</div>
              <div className="text-emerald-50">{PLANT_STAGE_LABEL[plantStage]}</div>
              <div className="text-xs text-emerald-100">
                {current}/{needed} XP to next level
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          href="#assignments"
          icon="📝"
          label="Needs attention"
          value={ready ? String(attention) : "–"}
          sub={ready && overdue > 0 ? `${overdue} overdue` : "tasks for today"}
          tone={overdue > 0 ? "text-red-600" : "text-emerald-600"}
        />
        <Tile href="#routines" icon="🔥" label="Best streak" value={ready ? `${bestStreak}` : "–"} sub="days in a row" tone="text-orange-600" />
        <Tile href="#allowance" icon="💰" label="Baon" value={baonValue} sub={baonSub} tone="text-amber-600" />
        <Tile href="#learning" icon="🃏" label="Flashcards" value={ready ? String(cards ?? 0) : "–"} sub="ready to study" tone="text-violet-600" />
      </div>

      {ready && nextTask && (
        <div className="lift flex flex-wrap items-center gap-3 rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
          <span className="bob text-4xl" aria-hidden>
            🎯
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-wide text-sky-600">Next up</div>
            <div className="truncate text-lg font-extrabold text-slate-800">{nextTask.title}</div>
            <div className="text-xs text-slate-500">
              {nextTask.type === "todo" ? "To-do" : nextTask.type === "daily" ? "Daily" : "Habit"} · {nextTask.priority} priority
              {nextTask.dueDate ? ` · ${formatDue(nextTask.dueDate)}` : ""}
            </div>
          </div>
          <button onClick={() => toggleTask(nextTask)} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white">
            ✓ Mark done
          </button>
        </div>
      )}

      {ready && caughtUp && (
        <div className="pop-in rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4 text-center">
          <span className="text-2xl" aria-hidden>
            🎉
          </span>{" "}
          <span className="font-bold text-emerald-700">You&apos;re all caught up!</span>{" "}
          <span className="text-sm text-slate-500">Take a break, review some flashcards, or run a routine.</span>
        </div>
      )}

      {ready && doneCount < checklist.length && (
        <div className="section-card accent-emerald">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800">🚀 Getting started</h2>
            <span className="text-xs font-semibold text-slate-500">
              {doneCount} of {checklist.length} done
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
              style={{ width: `${(doneCount / checklist.length) * 100}%` }}
            />
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {checklist.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                    c.done ? "bg-emerald-50 text-emerald-700 line-through decoration-emerald-300" : "bg-slate-50 text-slate-700 hover:bg-emerald-50"
                  }`}
                >
                  <span aria-hidden>{c.done ? "✅" : "⬜"}</span>
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
