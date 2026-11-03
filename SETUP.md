# ARAL - Study Planner (setup and demo guide)

Next.js + TypeScript + Tailwind, Dexie (IndexedDB) for storage, Zustand for state, Recharts for the savings chart,
Gemini for the PDF flashcards. Everything is saved in the browser on this laptop. There is no login.

## First-time setup (once)

```powershell
npm install dexie dexie-react-hooks zustand recharts pdfjs-dist @google/genai
node scripts/copy-pdf-worker.mjs
```

Then create `.env.local` in the project root (next to package.json):

```
GEMINI_API_KEY=your_key_here
```

(See `.env.local.example`.) Restart `npm run dev` after changing this file.

## Run

```powershell
npm run dev
```

Open http://localhost:3000

## Old files you can delete

`src/lib/xp.ts` (empty, the XP rules now live in `src/lib/game/levels.ts`) and
`src/components/rewards/DemoPanel.tsx` (the temporary XP test panel).

## Where things are

| Feature | Files |
| --- | --- |
| XP, levels, coins, plant stages | `src/lib/game/levels.ts`, `src/store/useGameStore.ts` |
| Database tables | `src/lib/db.ts`, `src/types/index.ts` |
| Assignments (habits, dailies, to-dos, subjects) | `src/components/assignments/`, `src/lib/tasks.ts` |
| Routine chains + Focus Flow | `src/components/routines/`, `src/lib/chains.ts`, `src/lib/chainLogic.ts` |
| Reminders + plant health | `src/lib/reminders.ts`, `src/components/layout/ReminderBanner.tsx` |
| Plant avatar + Reward shop (/rewards) | `src/components/rewards/`, `src/data/shopItems.ts` |
| Allowance (baon, expenses, chart) | `src/components/allowance/`, `src/lib/allowance.ts` |
| Flashcards, review, readiness, Exam Boss | `src/components/learning/`, `src/lib/learning.ts`, `src/lib/readiness.ts` |
| PDF to flashcards (Gemini) | `src/app/api/flashcards/route.ts`, `src/lib/pdfText.ts` |

## Demo checklist (about 5 minutes)

1. Home: point out the greeting, the plant and the "Getting started" list.
2. Assignments: add a subject, add a high-priority to-do with a due date, tick it. Watch the XP, coins and subject bar.
3. Add a to-do due yesterday: the reminder banner appears and the plant health drops. Reschedule it to recover.
4. Routines: add the "Nightly Reset" example and press Start chain (Focus Flow).
5. Allowance: set a baon, log a jeepney fare and lunch, show the warning and the savings chart.
6. Learning: upload a PDF in "From PDF", review the cards, save, then press "Study cards" and flip through them.
7. Exam Boss: beat the boss to trigger the level-up.
8. Rewards: buy a cosmetic and see it on the plant.
9. Turn off Wi-Fi and refresh: everything still works except generating cards from a new PDF.

## Notes

- The API key stays on the server (the route in `src/app/api/flashcards/route.ts`). Never put it in a component.
- Data lives in this browser. Clearing site data or using a private window erases it.
