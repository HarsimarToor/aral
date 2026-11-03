"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useGameStore } from "@/store/useGameStore";
import { computeHealth } from "@/lib/reminders";

// Keeps the plant's health in step with the overdue tasks. Renders nothing.
export default function HealthSync() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);
  const loaded = useGameStore((s) => s.loaded);
  const health = useGameStore((s) => s.health);
  const setHealth = useGameStore((s) => s.setHealth);

  useEffect(() => {
    if (!tasks || !loaded) return;
    const next = computeHealth(tasks);
    if (next !== health) setHealth(next);
  }, [tasks, loaded, health, setHealth]);

  return null;
}
