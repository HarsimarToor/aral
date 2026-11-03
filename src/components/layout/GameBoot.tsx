"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import { ensureShopSeeded } from "@/lib/shop";
import LevelUpModal from "@/components/rewards/LevelUpModal";
import HealthSync from "@/components/layout/HealthSync";
import FloatingActions from "@/components/layout/FloatingActions";
import RewardToast from "@/components/ui/RewardToast";
import ConfirmHost from "@/components/ui/ConfirmHost";
import ConfettiHost from "@/components/ui/Confetti";
import PointerFx from "@/components/ui/PointerFx";

// Mounted once in src/app/layout.tsx. It loads the saved XP/coins from Dexie on every page,
// keeps the plant health in sync, adds the default shop items the first time, and hosts the
// app-wide popups (level up, toasts, confirm dialogs, confetti) and the quick-add button.
export default function GameBoot() {
  const load = useGameStore((s) => s.load);

  useEffect(() => {
    load();
    ensureShopSeeded();
  }, [load]);

  return (
    <>
      <HealthSync />
      <LevelUpModal />
      <RewardToast />
      <ConfirmHost />
      <ConfettiHost />
      <PointerFx />
      <FloatingActions />
    </>
  );
}
