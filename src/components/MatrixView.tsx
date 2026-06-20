import { useState } from "react";
import type { GameData } from "../game";
import type { PlanApi } from "../store";
import { TeamsPanel } from "./TeamsPanel";
import { InventoryPanel } from "./InventoryPanel";
import { GuidePanel } from "./GuidePanel";

type MatrixTab = "teams" | "inventory" | "guide";

/**
 * The Endstate Matrix tool: the original Teams + Inventory planner, now behind a
 * single sidebar entry with its own internal tab toggle.
 */
export function MatrixView({ data, plan }: { data: GameData; plan: PlanApi }) {
  const [tab, setTab] = useState<MatrixTab>("teams");
  return (
    <div>
      <div className="border-b border-[var(--color-edge)]">
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <div className="leading-tight">
            <h1 className="text-lg font-semibold">Endstate Matrix</h1>
            <p className="hidden text-xs text-slate-500 sm:block">
              Build up to 20 teams and track your weapon inventory.
            </p>
          </div>
          <nav className="-mb-px mt-3 flex items-center gap-1">
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
        </div>
      </div>

      {tab === "teams" && <TeamsPanel data={data} plan={plan} />}
      {tab === "inventory" && <InventoryPanel data={data} plan={plan} />}
      {tab === "guide" && <GuidePanel onStart={() => setTab("teams")} />}
    </div>
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
      className={`relative border-b-2 px-4 pb-2.5 text-sm font-semibold transition ${
        active
          ? "border-sky-400 text-sky-300"
          : "border-transparent text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
