import type { Route } from "./Sidebar";

export function HomePanel({ onNavigate }: { onNavigate: (r: Route) => void }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="text-center">
        <h1 className="bg-gradient-to-r from-sky-300 to-cyan-200 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
          Wuthering Waves Planner
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
          A fan-made toolkit for planning your Resonators — build endgame team comps and
          work out exactly what you need to farm before you pull or level up.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <ToolCard
          title="Endstate Matrix"
          blurb="Build up to 20 teams of three Resonators, assign weapons, and track your weapon inventory under the one-copy-per-resonator rule."
          cta="Open the matrix"
          onClick={() => onNavigate("matrix")}
        />
        <ToolCard
          title="Material Calculator"
          blurb="Pick Resonators and weapons, set your current and target level, ascension, and skills, and get an aggregated shopping list of every material to farm."
          cta="Open the calculator"
          badge="New"
          onClick={() => onNavigate("calc")}
        />
      </div>

      <p className="mt-10 text-center text-[11px] text-slate-600">
        Everything is saved locally in your browser. Not affiliated with Kuro Games.
      </p>
    </div>
  );
}

function ToolCard({
  title,
  blurb,
  cta,
  badge,
  onClick,
}: {
  title: string;
  blurb: string;
  cta: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-2xl border border-[var(--color-edge)] bg-[var(--color-panel)] p-5 text-left transition hover:-translate-y-0.5 hover:border-sky-500/60"
    >
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {badge && (
          <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 flex-1 text-sm text-slate-400">{blurb}</p>
      <span className="mt-4 text-sm font-medium text-sky-300 group-hover:text-sky-200">
        {cta} →
      </span>
    </button>
  );
}
