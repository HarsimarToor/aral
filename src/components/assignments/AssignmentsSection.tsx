"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { isDueToday, isOverdue, isTaskDone } from "@/lib/tasks";
import type { Task } from "@/types";
import TaskForm from "./TaskForm";
import TaskList from "./TaskList";
import SubjectProgress from "./SubjectProgress";

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <div className={`text-2xl font-extrabold ${tone}`}>{value}</div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

export default function AssignmentsSection() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);
  const subjects = useLiveQuery(() => db.subjects.toArray(), []);
  const [editing, setEditing] = useState<Task | null>(null);

  if (!tasks || !subjects) {
    return (
      <section id="assignments" className="scroll-mt-24 section-card accent-emerald">
        <h2 className="text-lg font-bold text-slate-800">📝 Assignments</h2>
        <p className="mt-2 text-sm text-slate-500">Loading...</p>
      </section>
    );
  }

  const pending = tasks.filter((t) => !isTaskDone(t)).length;
  const completed = tasks.length - pending;
  const overdue = tasks.filter(isOverdue).length;
  const dueToday = tasks.filter(isDueToday).length;

  return (
    <section id="assignments" className="scroll-mt-24 space-y-6">
      <div className="section-card accent-emerald">
        <h2 className="text-lg font-bold text-slate-800">📝 Assignments</h2>
        <p className="text-sm text-slate-500">Habits, dailies and to-dos in one place. Finishing tasks earns XP and coins.</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Pending" value={pending} tone="text-slate-800" />
          <Stat label="Completed" value={completed} tone="text-emerald-600" />
          <Stat label="Due today" value={dueToday} tone="text-amber-600" />
          <Stat label="Overdue" value={overdue} tone="text-red-600" />
        </div>

        <div className="mt-4">
          <TaskForm
            key={editing?.id ?? "new"}
            subjects={subjects}
            editing={editing}
            onDone={() => setEditing(null)}
          />
        </div>

        <div className="mt-5">
          <TaskList tasks={tasks} subjects={subjects} onEdit={setEditing} />
        </div>
      </div>

      <SubjectProgress subjects={subjects} tasks={tasks} />
    </section>
  );
}
