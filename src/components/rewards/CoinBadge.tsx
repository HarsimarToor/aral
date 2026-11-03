"use client";

import { useGameStore } from "@/store/useGameStore";

export default function CoinBadge() {
  const coins = useGameStore((s) => s.coins);

  return (
    <div
      className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 px-3 py-1.5 text-sm font-bold text-amber-800 shadow-sm"
      title="Your coins. Spend them in the Reward shop."
    >
      <span aria-hidden>🪙</span>
      {/* key makes the number "pop" every time it changes */}
      <span key={coins} className="pop inline-block">
        {coins}
      </span>
      <span className="sr-only">coins</span>
    </div>
  );
}
