"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useGameStore } from "@/store/useGameStore";
import {
  PLANT_STAGE_EMOJI,
  PLANT_STAGE_LABEL,
  levelProgress,
  plantStageForLevel,
  totalXpForLevel,
  type PlantStage,
} from "@/lib/game/levels";
import { itemKey } from "@/lib/shop";
import { notifyReward } from "@/components/ui/RewardToast";

// First level of each stage, in order.
const STAGE_START: { stage: PlantStage; level: number }[] = [
  { stage: "seed", level: 1 },
  { stage: "sprout", level: 3 },
  { stage: "leafy", level: 5 },
  { stage: "sapling", level: 8 },
  { stage: "tree", level: 12 },
  { stage: "flowering", level: 18 },
];

const PET_MESSAGES = ["Your plant loves the attention 💚", "*happy rustling* 🌿", "Your plant is soaking it in ☀️", "It wiggles with joy! 🌱"];

function healthLook(health: number) {
  if (health >= 80) return { filter: "none", label: "Thriving", bar: "bg-emerald-500", tone: "text-emerald-700" };
  if (health >= 40)
    return { filter: "saturate(0.65) sepia(0.45)", label: "Wilting", bar: "bg-amber-500", tone: "text-amber-700" };
  return { filter: "grayscale(1) brightness(0.9)", label: "Critical", bar: "bg-red-500", tone: "text-red-700" };
}

export default function PlantAvatar() {
  const xp = useGameStore((s) => s.xp);
  const health = useGameStore((s) => s.health);
  const owned = useGameStore((s) => s.owned);
  const items = useLiveQuery(() => db.customRewards.toArray(), []);
  const [pet, setPet] = useState(0);

  const { level } = levelProgress(xp);
  const stage = plantStageForLevel(level);
  const idx = STAGE_START.findIndex((s) => s.stage === stage);
  const next = STAGE_START[idx + 1];

  let growthPct = 100;
  if (next) {
    const from = totalXpForLevel(STAGE_START[idx].level);
    const to = totalXpForLevel(next.level);
    growthPct = Math.min(100, Math.round(((xp - from) / (to - from)) * 100));
  }

  const look = healthLook(health);
  // Cosmetics you own and that still exist in the shop (they are edited and deleted there).
  const accessories = (items ?? []).filter((i) => i.kind === "cosmetic" && owned.includes(itemKey(i)));

  function petPlant() {
    setPet((p) => p + 1);
    notifyReward(PET_MESSAGES[pet % PET_MESSAGES.length], "🌱");
  }

  return (
    <section className="section-card accent-emerald">
      <h2 className="text-lg font-bold text-slate-800">🌱 Your plant</h2>

      <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-8">
        <div className="relative flex h-48 w-48 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-sky-50 ring-4 ring-white">
          <button
            key={pet}
            onClick={petPlant}
            className={`select-none rounded-full text-8xl ${pet > 0 ? "pop" : ""}`}
            aria-label="Pet your plant"
            title="Click your plant!"
          >
            <span
              className={`block ${health >= 80 ? "sway" : ""}`}
              style={{ filter: look.filter }}
              role="img"
              aria-label={PLANT_STAGE_LABEL[stage]}
            >
              {PLANT_STAGE_EMOJI[stage]}
            </span>
          </button>

          {/* Owned cosmetics circle around the plant */}
          {accessories.map((a, i) => {
            const angle = (-90 + (360 / accessories.length) * i) * (Math.PI / 180);
            const x = 50 + 46 * Math.cos(angle);
            const y = 50 + 46 * Math.sin(angle);
            return (
              <span
                key={a.id}
                className="bob absolute text-3xl"
                style={{ left: `${x}%`, top: `${y}%`, marginLeft: "-0.75rem", marginTop: "-0.9rem", animationDelay: `${i * 0.45}s` }}
                title={a.name}
              >
                {a.emoji}
              </span>
            );
          })}

          {health < 40 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white">⚠ Overdue!</span>
          )}
        </div>

        <div className="w-full flex-1 space-y-4">
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold text-slate-800">
                {PLANT_STAGE_LABEL[stage]} · Level {level}
              </span>
              <span className="text-slate-500">{next ? `${growthPct}% to ${PLANT_STAGE_LABEL[next.stage]}` : "Fully grown"}</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-emerald-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${growthPct}%` }} />
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className={`font-semibold ${look.tone}`}>Health: {look.label}</span>
              <span className="text-slate-500">{health}%</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full transition-all duration-500 ${look.bar}`} style={{ width: `${health}%` }} />
            </div>
            {health < 100 && <p className="mt-1 text-xs text-slate-500">Finish or reschedule overdue tasks to restore health.</p>}
          </div>

          <p className="text-sm text-slate-500">
            {accessories.length === 0
              ? "Buy cosmetics in the shop below and they will float around your plant. Click the plant to say hi!"
              : `Wearing ${accessories.length} cosmetic${accessories.length === 1 ? "" : "s"}. Click the plant to say hi!`}
          </p>
        </div>
      </div>
    </section>
  );
}
