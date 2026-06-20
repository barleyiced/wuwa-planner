import { useEffect, useState } from "react";
import { loadGameData, type GameData } from "./game";
import { usePlan } from "./store";
import { useCalc } from "./calc";
import { Sidebar, type Route } from "./components/Sidebar";
import { HomePanel } from "./components/HomePanel";
import { MatrixView } from "./components/MatrixView";
import { CalcPanel } from "./components/CalcPanel";
import { ChangelogPanel } from "./components/ChangelogPanel";
import { migrateLegacy } from "./storage";

// UI shell state (active route + sidebar fold) persists separately from plan data.
const UI_KEY = "wuwa.ui.v1";
// Pre-1.2 builds stored UI shell state under the old "wwem" prefix.
const LEGACY_UI_KEY = "wwem.ui.v1";
const ROUTES: Route[] = ["home", "matrix", "calc", "changelog"];

interface UiState {
  route: Route;
  collapsed: boolean;
}

function loadUi(): UiState {
  try {
    const raw = localStorage.getItem(UI_KEY) ?? migrateLegacy(LEGACY_UI_KEY, UI_KEY);
    if (raw) {
      const u = JSON.parse(raw) as Partial<UiState>;
      const route = u.route && ROUTES.includes(u.route) ? u.route : "home";
      return { route, collapsed: Boolean(u.collapsed) };
    }
  } catch {
    /* ignore */
  }
  return { route: "home", collapsed: false };
}

export function App() {
  const [data, setData] = useState<GameData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ui, setUi] = useState<UiState>(loadUi);
  const plan = usePlan();
  const calc = useCalc();

  const setRoute = (route: Route) => setUi((u) => ({ ...u, route }));
  const setCollapsed = (collapsed: boolean) => setUi((u) => ({ ...u, collapsed }));

  useEffect(() => {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify(ui));
    } catch {
      /* ignore */
    }
  }, [ui]);

  useEffect(() => {
    let alive = true;
    loadGameData()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
  }, []);

  const needsData = ui.route === "matrix" || ui.route === "calc";

  return (
    <div className="flex min-h-full">
      <Sidebar
        route={ui.route}
        setRoute={setRoute}
        collapsed={ui.collapsed}
        setCollapsed={setCollapsed}
        plan={plan}
        version={data?.version}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1">
          {error && needsData && (
            <div className="mx-auto mt-10 max-w-md rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
              <p className="font-semibold">Couldn't load game data.</p>
              <p className="mt-1 text-rose-300/80">{error}</p>
              <p className="mt-2 text-rose-300/70">
                Check your connection — the Resonator and weapon catalog is fetched from the
                community CDN.
              </p>
            </div>
          )}

          {ui.route === "home" && <HomePanel onNavigate={setRoute} />}
          {ui.route === "changelog" && <ChangelogPanel />}
          {needsData && !error && !data && <Loading />}
          {data && ui.route === "matrix" && <MatrixView data={data} plan={plan} />}
          {data && ui.route === "calc" && <CalcPanel data={data} calc={calc} />}
        </main>

        <footer className="px-4 py-6 text-center text-[11px] text-slate-600">
          Fan-made planner · data &amp; icons via static.nanoka.cc · costs via community datamine
          · not affiliated with Kuro Games
        </footer>
      </div>
    </div>
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
