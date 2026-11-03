import DashboardShell from "@/components/layout/DashboardShell";
import HomeHero from "@/components/layout/HomeHero";
import ReminderBanner from "@/components/layout/ReminderBanner";
import AssignmentsSection from "@/components/assignments/AssignmentsSection";
import ChainsSection from "@/components/routines/ChainsSection";
import AllowanceSection from "@/components/allowance/AllowanceSection";
import LearningSection from "@/components/learning/LearningSection";

export default function Home() {
  return (
    <DashboardShell>
      <HomeHero />
      <ReminderBanner />
      <AssignmentsSection />
      <ChainsSection />
      <AllowanceSection />
      <LearningSection />
    </DashboardShell>
  );
}
