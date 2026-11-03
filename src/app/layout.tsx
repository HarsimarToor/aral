import type { Metadata } from "next";
import "./globals.css";
import GameBoot from "@/components/layout/GameBoot";

export const metadata: Metadata = {
  title: "ARAL - Study Planner",
  description: "Tasks, allowance, flashcards and a plant that grows as you study.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <GameBoot />
      </body>
    </html>
  );
}
