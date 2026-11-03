import Link from "next/link";
import DashboardShell from "@/components/layout/DashboardShell";
import PlantAvatar from "@/components/rewards/PlantAvatar";
import RewardShop from "@/components/rewards/RewardShop";

export default function RewardsPage() {
  return (
    <DashboardShell>
      <Link href="/" className="inline-block rounded-lg px-2 py-1 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
        &larr; Back to dashboard
      </Link>
      <PlantAvatar />
      <RewardShop />
    </DashboardShell>
  );
}
