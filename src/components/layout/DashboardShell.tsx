"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGameStore } from "@/store/useGameStore";
import { PLANT_STAGE_EMOJI, PLANT_STAGE_LABEL, levelProgress } from "@/lib/game/levels";
import XpBar from "@/components/rewards/XpBar";
import CoinBadge from "@/components/rewards/CoinBadge";

const SECTIONS = [
  { id: "assignments", label: "Assignments" },
  { id: "routines", label: "Routines" },
  { id: "allowance", label: "Allowance" },
  { id: "learning", label: "Learning" },
];

// Tells the student whether they are online. The app works offline either way.
function OnlineBadge() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <span
      className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold lg:flex ${
        online ? "bg-emerald-50 text-emerald-700" : "bg-amber-100 text-amber-800"
      }`}
      title={online ? "Online" : "Offline: everything still works except making flashcards from a PDF"}
    >
      <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`} />
      {online ? "Online" : "Offline mode"}
    </span>
  );
}

function HealthChip() {
  const health = useGameStore((s) => s.health);
  const tone = health >= 80 ? "bg-emerald-50 text-emerald-700" : health >= 40 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700";
  return (
    <Link
      href="/rewards"
      className={`hidden items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold sm:flex ${tone}`}
      title="Plant health. Finish or reschedule overdue tasks to keep it high."
    >
      ❤️ {health}%
    </Link>
  );
}

// The logo: a big plant that shows your real growth stage, and the ARAL name.
// Both are large at the top of the page and shrink while you scroll to leave room for the content.
function Brand({ small }: { small: boolean }) {
  const plantStage = useGameStore((s) => s.plantStage);
  const xp = useGameStore((s) => s.xp);
  const { level } = levelProgress(xp);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link
        href="/rewards"
        className={`sway block leading-none drop-shadow transition-all duration-300 ${small ? "text-4xl" : "text-6xl sm:text-7xl"}`}
        title="Your plant. Open it and the reward shop."
        aria-label="Open your plant and the reward shop"
      >
        {PLANT_STAGE_EMOJI[plantStage]}
      </Link>
      <Link href="/" className="block leading-none" title="Back to the dashboard">
        <span
          className={`block bg-gradient-to-r from-emerald-600 via-teal-500 to-sky-500 bg-clip-text font-black tracking-tight text-transparent transition-all duration-300 ${
            small ? "text-3xl" : "text-5xl sm:text-6xl"
          }`}
        >
          ARAL
        </span>
        {!small && (
          <span className="mt-1 block text-xs font-semibold text-slate-500 sm:text-sm">
            Level {level} · {PLANT_STAGE_LABEL[plantStage]}
          </span>
        )}
      </Link>
    </div>
  );
}

export function DashboardHeader() {
  const [active, setActive] = useState("");
  const [scrolled, setScrolled] = useState(false);

  // The big logo shrinks once you start scrolling.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlights the nav link of the section you are looking at.
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur transition-shadow duration-300 ${
        scrolled ? "shadow-md" : ""
      }`}
    >
      <div className={`mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 transition-all duration-300 ${scrolled ? "py-1.5" : "py-3"}`}>
        <Brand small={scrolled} />

        <nav className="flex flex-wrap items-center gap-1 text-sm font-medium text-slate-600" aria-label="Sections">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`/#${s.id}`} data-active={active === s.id} className="nav-link rounded-lg px-3 py-1.5 hover:bg-slate-100">
              {s.label}
            </a>
          ))}
          <Link href="/rewards" className="nav-link rounded-lg px-3 py-1.5 hover:bg-slate-100">
            🎁 Rewards
          </Link>
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <OnlineBadge />
          <HealthChip />
          <div className="w-40 sm:w-44">
            <XpBar />
          </div>
          <CoinBadge />
        </div>
      </div>
    </header>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-slate-900">
      <DashboardHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-24 text-center text-xs text-slate-400">
        ARAL · everything is saved on this device, so it works without internet. Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">N</kbd> to quick-add anything.
      </footer>
    </div>
  );
}
