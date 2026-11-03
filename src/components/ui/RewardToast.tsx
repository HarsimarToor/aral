"use client";

import { useEffect, useState } from "react";

const EVENT = "aral:toast";

interface ToastDetail {
  text: string;
  icon: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastItem extends ToastDetail {
  id: number;
}

function send(detail: ToastDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastDetail>(EVENT, { detail }));
}

/** Pops a small message from anywhere in the browser, e.g. notifyReward("+8 XP", "⭐"). */
export function notifyReward(text: string, icon = "⭐") {
  send({ text, icon });
}

/** A message with an Undo button (stays a bit longer), e.g. after deleting something. */
export function notifyUndo(text: string, onUndo: () => void) {
  send({ text, icon: "🗑️", actionLabel: "Undo", onAction: onUndo });
}

let nextId = 1;

// Mounted once (inside GameBoot).
export default function RewardToast() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      const id = nextId++;
      setItems((list) => [...list.slice(-3), { id, ...detail }]);
      window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), detail.onAction ? 5200 : 2200);
    }
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div
      className="pointer-events-none fixed bottom-5 left-1/2 z-[95] flex -translate-x-1/2 flex-col items-center gap-2"
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="toast-in pointer-events-auto flex items-center gap-2 rounded-full bg-slate-900 py-2 pl-4 pr-3 text-sm font-semibold text-white shadow-lg"
          style={t.onAction ? { animationDuration: "5.2s" } : undefined}
        >
          <span aria-hidden>{t.icon}</span>
          {t.text}
          {t.onAction && (
            <button
              onClick={() => {
                t.onAction?.();
                setItems((list) => list.filter((x) => x.id !== t.id));
              }}
              className="ml-1 rounded-full bg-white/15 px-3 py-0.5 text-xs font-bold text-emerald-300 hover:bg-white/25"
            >
              {t.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
