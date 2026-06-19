type Release = {
  version: string;
  date?: string;
  tag?: string;
  changes: string[];
};

// Concise, visitor-friendly highlights. Full detail lives in CHANGELOG.md.
const RELEASES: Release[] = [
  {
    version: "Latest",
    tag: "new",
    changes: [
      "Drag teams by the ⠿ handle to reorder them (↑/↓ buttons still work too).",
      "Vigor system — Resonators can join only as many teams as they have Vigor.",
      "Weapon allocation no longer double-counts a Resonator shared across teams.",
      "Larger in-game Resonator portraits in the picker.",
      "In-app “How to use” guide.",
      "Real element and weapon-type icons throughout.",
      "Removed the duplicate-team button (it conflicted with Vigor limits).",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-06-19",
    changes: [
      "Build up to 20 teams of 3 Resonators each.",
      "Weapon inventory with allocation tracking and over-assignment warnings.",
      "Search and filter Resonators and weapons by element, type, and rarity.",
      "Import / export plans; everything saved in your browser.",
      "Live game data, fetched and cached automatically.",
    ],
  },
];

export function ChangelogPanel() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      <div className="mx-auto mb-4 max-w-3xl">
        <h2 className="text-lg font-semibold">Changelog</h2>
        <p className="text-xs text-slate-400">Recent changes to the planner.</p>
      </div>

      <div className="mx-auto max-w-3xl space-y-5">
        {RELEASES.map((r) => (
          <div key={r.version} className="flex gap-3">
            <div className="flex shrink-0 flex-col items-end pt-0.5">
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                  r.tag === "new"
                    ? "bg-sky-500/15 text-sky-300"
                    : "bg-[var(--color-panel2)] text-slate-300"
                }`}
              >
                {r.version}
              </span>
              {r.date && (
                <span className="mt-1 text-[10px] text-slate-500">{r.date}</span>
              )}
            </div>
            <ul className="min-w-0 space-y-1 pt-1 text-sm leading-relaxed text-slate-300">
              {r.changes.map((c) => (
                <li key={c} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
