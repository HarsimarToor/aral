"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { addDays, formatDue, todayStr } from "@/lib/dates";
import { HEALTH_PENALTY_PER_OVERDUE, LEVEL_LABEL, LEVEL_STYLE, getReminders } from "@/lib/reminders";

// Recalculated from Dexie every time the page opens or the tasks change.
export default function ReminderBanner() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);
  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  if (!tasks) return null;

  const reminders = getReminders(tasks);
  if (reminders.length === 0) return null;

  const hasOverdue = reminders.some((r) => r.level === "overdue");
  const urgent = reminders.some((r) => ["overdue", "today", "critical"].includes(r.level));
  const subjectName = (id?: number) => subjects?.find((s) => s.id === id)?.name;

  return (
    <section
      className={`rounded-2xl border p-4 ${
        urgent ? "border-orange-300 bg-orange-50" : "border-blue-200 bg-blue-50"
      }`}
      aria-label="Emergency reminders"
    >
      <h2 className="text-sm font-bold text-slate-800">
        {urgent ? "🚨" : "⏰"} Emergency reminders ({reminders.length})
      </h2>
      {hasOverdue && (
        <p className="mt-1 text-sm text-red-700">
          Your plant&apos;s health is draining ({HEALTH_PENALTY_PER_OVERDUE}% per overdue task) until these are
          completed or rescheduled.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {reminders.map(({ task, level }) => (
          <li key={task.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${LEVEL_STYLE[level]}`}>
              {LEVEL_LABEL[level]}
            </span>
            <span className="font-medium text-slate-800">{task.title}</span>
            {subjectName(task.subjectId) && <span className="text-slate-500">· {subjectName(task.subjectId)}</span>}
            <span className="text-slate-500">· {formatDue(task.dueDate!)}</span>
            {level === "overdue" && task.id !== undefined && (
              <button
                onClick={() => db.tasks.update(task.id!, { dueDate: addDays(todayStr(), 1) })}
                className="ml-auto rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
              >
                Reschedule to tomorrow
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
