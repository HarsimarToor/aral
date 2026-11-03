"use client";

type Tone = "emerald" | "red" | "violet";

const FRONT_TONE: Record<Tone, string> = {
  emerald: "border-emerald-200 from-white to-emerald-50",
  red: "border-red-200 from-white to-red-50",
  violet: "border-violet-200 from-white to-violet-50",
};

const BACK_TONE: Record<Tone, string> = {
  emerald: "from-emerald-500 to-teal-600",
  red: "from-rose-500 to-red-600",
  violet: "from-violet-500 to-fuchsia-600",
};

export default function FlipCard({
  front,
  back,
  flipped,
  onFlip,
  tone = "emerald",
  hint = "Tap to reveal the answer",
}: {
  front: string;
  back: string;
  flipped: boolean;
  onFlip?: () => void;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div className="flip-scene">
      <div
        role="button"
        tabIndex={onFlip ? 0 : -1}
        aria-label={flipped ? "Showing the answer" : "Showing the question. Activate to reveal the answer."}
        onClick={onFlip}
        onKeyDown={(e) => {
          if (onFlip && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onFlip();
          }
        }}
        className="flip-card"
        data-flipped={flipped}
      >
        <div className={`flip-face flip-front border-2 bg-gradient-to-br ${FRONT_TONE[tone]}`}>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Question</span>
          <span className="text-lg font-semibold text-slate-800 sm:text-xl">{front}</span>
          <span className="mt-2 text-xs text-slate-400">{hint}</span>
        </div>
        <div className={`flip-face flip-back bg-gradient-to-br text-white ${BACK_TONE[tone]}`}>
          <span className="text-xs font-bold uppercase tracking-widest text-white/70">Answer</span>
          <span className="text-lg font-semibold sm:text-xl">{back}</span>
        </div>
      </div>
    </div>
  );
}
