import { useRef, useState } from "react";
import type { PlanApi, PlanState } from "../store";
import type { CalcApi } from "../calc";

export type Route = "home" | "matrix" | "calc" | "changelog";

interface NavItem {
  route: Route;
  label: string;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  { route: "home", label: "Home", icon: <IconHome /> },
  { route: "matrix", label: "Endstate Matrix", icon: <IconGrid /> },
  { route: "calc", label: "Material Calculator", icon: <IconCalc /> },
  { route: "changelog", label: "Changelog", icon: <IconList /> },
];

export function Sidebar({
  route,
  setRoute,
  collapsed,
  setCollapsed,
  plan,
  calc,
  version,
}: {
  route: Route;
  setRoute: (r: Route) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  plan: PlanApi;
  calc: CalcApi;
  version?: string;
}) {
  return (
    <aside
      className={`sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-[var(--color-edge)] bg-[var(--color-panel)] transition-[width] duration-200 ${
        collapsed ? "w-14" : "w-60"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-3">
        <Logo />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">WuWa Planner</div>
            <div className="truncate text-[10px] text-slate-500">
              Wuthering Waves {version ? `· ${version}` : ""}
            </div>
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {NAV.map((item) => (
          <button
            key={item.route}
            onClick={() => setRoute(item.route)}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
              route === item.route
                ? "bg-sky-500/15 text-sky-300"
                : "text-slate-300 hover:bg-white/5"
            } ${collapsed ? "justify-center" : ""}`}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="border-t border-[var(--color-edge)] p-2">
        <DataMenu plan={plan} calc={calc} collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`mt-1 flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-slate-400 hover:bg-white/5 ${
            collapsed ? "justify-center" : ""
          }`}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <span className="shrink-0">{collapsed ? <IconExpand /> : <IconCollapse />}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

// Local-time "YYYY-MM-DD_HH-MM-SS" stamp for export filenames (filesystem-safe,
// no colons), so each export lands as its own file.
function exportStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`
  );
}

// Combined export envelope: both tools' state in one file. Bump `version` if the
// envelope shape changes; `kind` lets import tell our files apart from stray JSON.
interface ExportBundle {
  kind: "wuwa-planner-export";
  version: 1;
  plan: PlanState;
  calc: CalcApi["state"];
}

function DataMenu({
  plan,
  calc,
  collapsed,
}: {
  plan: PlanApi;
  calc: CalcApi;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const bundle: ExportBundle = {
      kind: "wuwa-planner-export",
      version: 1,
      plan: plan.state,
      calc: calc.state,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // Append a local timestamp so repeated exports get distinct filenames
    // instead of the OS auto-suffixing duplicates (e.g. "(1)", "(2)").
    a.download = `wuwa-planner-${exportStamp()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<ExportBundle> & Partial<PlanState>;
        // New files wrap both tools in { plan, calc }. Legacy files are a bare
        // PlanState (inventory + teams at the top level) — still import those.
        const planState = parsed.plan ?? (parsed.inventory && parsed.teams ? (parsed as PlanState) : null);
        let imported = false;
        if (planState && planState.inventory && Array.isArray(planState.teams)) {
          plan.importState(planState);
          imported = true;
        }
        if (parsed.calc && calc.importState(parsed.calc)) imported = true;
        if (!imported) throw new Error("nothing importable");
      } catch {
        alert("That file doesn't look like a valid planner export.");
      }
    };
    reader.readAsText(file);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? "Data" : undefined}
        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-slate-300 hover:bg-white/5 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <span className="shrink-0">
          <IconData />
        </span>
        {!collapsed && <span>Data ▾</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-50 mb-1 w-44 overflow-hidden rounded-lg border border-[var(--color-edge)] bg-[var(--color-panel)] py-1 text-sm shadow-xl">
            <MenuItem onClick={doExport}>Export data…</MenuItem>
            <MenuItem onClick={() => fileRef.current?.click()}>Import data…</MenuItem>
            <div className="my-1 h-px bg-[var(--color-edge)]" />
            <MenuItem
              danger
              onClick={() => {
                if (
                  confirm(
                    "Clear everything — teams, weapon inventory, and the Material Calculator? This can't be undone."
                  )
                ) {
                  plan.resetAll();
                  calc.resetAll();
                  calc.clearInventory();
                }
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

// ---- icons (stroke style matches the logo) ----
const I = "h-5 w-5";
function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0">
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
function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className={I} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" className={I} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function IconCalc() {
  return (
    <svg viewBox="0 0 24 24" className={I} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h2M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h4" />
    </svg>
  );
}
function IconList() {
  return (
    <svg viewBox="0 0 24 24" className={I} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h12M8 12h12M8 18h12M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
function IconData() {
  return (
    <svg viewBox="0 0 24 24" className={I} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </svg>
  );
}
function IconCollapse() {
  return (
    <svg viewBox="0 0 24 24" className={I} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
function IconExpand() {
  return (
    <svg viewBox="0 0 24 24" className={I} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
