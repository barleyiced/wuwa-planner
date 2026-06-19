import { useEffect, useRef, useState } from "react";
import { loadGameData, type GameData } from "./game";
import { usePlan, type PlanState } from "./store";
import { TeamsPanel } from "./components/TeamsPanel";
import { InventoryPanel } from "./components/InventoryPanel";
import { GuidePanel } from "./components/GuidePanel";

type Tab = "teams" | "inventory" | "guide";

export function App() {
  const [data, setData] = useState<GameData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("teams");
  const plan = usePlan();

  useEffect(() => {
    let alive = true;
    loadGameData()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <Header tab={tab} setTab={setTab} plan={plan} version={data?.version} />
      <main className="flex-1">
        {error && (
          <div className="mx-auto mt-10 max-w-md rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            <p className="font-semibold">Couldn't load game data.</p>
            <p className="mt-1 text-rose-300/80">{error}</p>
            <p className="mt-2 text-rose-300/70">
              Check your connection — the Resonator and weapon catalog is fetched from the
              community CDN.
            </p>
          </div>
        )}
        {tab === "guide" && <GuidePanel onStart={() => setTab("teams")} />}
        {tab !== "guide" && !error && !data && <Loading />}
        {data && tab === "teams" && <TeamsPanel data={data} plan={plan} />}
        {data && tab === "inventory" && <InventoryPanel data={data} plan={plan} />}
      </main>
      <footer className="px-4 py-6 text-center text-[11px] text-slate-600">
        Fan-made planner · data &amp; icons via static.nanoka.cc · not affiliated with Kuro Games
      </footer>
    </div>
  );
}

function Header({
  tab,
  setTab,
  plan,
  version,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  plan: ReturnType<typeof usePlan>;
  version?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-edge)] bg-[var(--color-bg)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Logo />
          <div className="leading-tight">
            <div className="text-sm font-semibold">Endstate Matrix Planner</div>
            <div className="hidden text-[10px] text-slate-500 sm:block">
              Wuthering Waves {version ? `· data ${version}` : ""}
            </div>
          </div>
        </div>

        <nav className="ml-2 flex items-center gap-1 rounded-lg bg-[var(--color-panel2)] p-0.5">
          <TabBtn active={tab === "teams"} onClick={() => setTab("teams")}>
            Teams
          </TabBtn>
          <TabBtn active={tab === "inventory"} onClick={() => setTab("inventory")}>
            Inventory
          </TabBtn>
          <TabBtn active={tab === "guide"} onClick={() => setTab("guide")}>
            How to use
          </TabBtn>
        </nav>

        <div className="ml-auto">
          <DataMenu plan={plan} />
        </div>
      </div>
    </header>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-sky-500 text-white" : "text-slate-300 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function DataMenu({ plan }: { plan: ReturnType<typeof usePlan> }) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(plan.state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wwem-plan.json";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as PlanState;
        if (!parsed.inventory || !Array.isArray(parsed.teams))
          throw new Error("not a plan file");
        plan.importState(parsed);
      } catch {
        alert("That file doesn't look like a valid plan export.");
      }
    };
    reader.readAsText(file);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-[var(--color-edge)] px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
      >
        Data ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border border-[var(--color-edge)] bg-[var(--color-panel)] py-1 text-sm shadow-xl">
            <MenuItem onClick={doExport}>Export plan…</MenuItem>
            <MenuItem onClick={() => fileRef.current?.click()}>Import plan…</MenuItem>
            <div className="my-1 h-px bg-[var(--color-edge)]" />
            <MenuItem
              danger
              onClick={() => {
                if (confirm("Clear all teams and inventory? This can't be undone."))
                  plan.resetAll();
                setOpen(false);
              }}
            >
              Reset everything
            </MenuItem>
          </div>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) doImport(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full px-3 py-1.5 text-left hover:bg-white/5 ${
        danger ? "text-rose-300" : "text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7">
      <rect width="32" height="32" rx="7" fill="#0e1422" stroke="#243049" />
      <path
        d="M5 11l4 12 3-9 3 9 3-9 3 9 4-12"
        fill="none"
        stroke="#5bd6ff"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Loading() {
  return (
    <div className="mx-auto mt-24 flex max-w-xs flex-col items-center gap-3 text-slate-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-400" />
      <p className="text-sm">Loading Resonators &amp; weapons…</p>
    </div>
  );
}
