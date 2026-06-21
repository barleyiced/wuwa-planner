export function GuidePanel({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      <div className="mx-auto mb-4 max-w-3xl">
        <h2 className="text-lg font-semibold">How to use</h2>
        <p className="text-xs text-slate-400">Plan your endgame teams in a few steps.</p>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 text-sm leading-relaxed text-slate-300">
        <Step n={1} title="Stock your weapon inventory">
          Open the <Tab>Inventory</Tab> tab, find a weapon (search by name or filter by
          type and rarity), and use the <Kbd>−</Kbd> / <Kbd>+</Kbd> stepper to set how
          many copies you own. Only weapons you own can be equipped on a team.
          <Note>
            Own two copies of a weapon? Set the count to 2 and you can equip it on two
            different Resonators at once.
          </Note>
        </Step>

        <Step n={2} title="Build a team">
          On the <Tab>Teams</Tab> tab, each team has three slots. Click a{" "}
          <Slotish>+ Resonator</Slotish> slot to open the picker, then search or filter
          by element, weapon type, and rarity to choose a character.
        </Step>

        <Step n={3} title="Mind each Resonator's Vigor">
          Every Resonator loses 1 Vigor each time they fight, so a Resonator can only
          appear in as many teams as they have Vigor. Most have <strong>1 Vigor</strong>{" "}
          (usable in a single team); dedicated healers (Baizhi, Verina, Shorekeeper,
          Buling, Mornye) have <strong>2 Vigor</strong>. The picker shows Vigor dots on
          each card and <span className="text-slate-400">dims</span> Resonators who are
          out of Vigor or already in the team you're editing. All Rover variants are the
          same body, so they share a single Vigor pool — placing any Rover dims every
          other Rover. If a resonator ever ends up in more teams than its Vigor allows
          (e.g. from an imported plan), its team slot is flagged{" "}
          <span className="text-amber-400">amber (over Vigor)</span>.
        </Step>

        <Step n={4} title="Assign a weapon">
          Click the weapon bar beneath a Resonator. The picker only shows weapons that
          match that character's weapon type. It defaults to <em>In my inventory</em>;
          switch to <em>All weapons</em> to add something new on the spot with its
          stepper, then press <Kbd>Equip</Kbd>.
        </Step>

        <Step n={5} title="Watch your allocation">
          Each weapon row shows <span className="text-emerald-400">“N of M free”</span> —
          remaining copies vs. owned. When nothing is free the button reads{" "}
          <span className="text-slate-400">None free</span> and is disabled. If you
          assign a weapon more times than you own, the slot and inventory summary turn{" "}
          <span className="text-amber-400">amber (over-assigned)</span> so you can fix it.
        </Step>

        <Step n={6} title="Organise up to 20 teams">
          Use <Kbd>+ Add team</Kbd> to create more (max 20). Each team card lets you
          rename it inline, reorder it by dragging the <Kbd>⠿</Kbd> handle (or with{" "}
          <Kbd>↑</Kbd> <Kbd>↓</Kbd>), and <Kbd>✕</Kbd> to delete. Hover a filled slot
          and click its <Kbd>✕</Kbd> to clear just that Resonator.
        </Step>

        <Step n={7} title="Save, back up & move devices">
          Everything is saved automatically in this browser. Use <Tab>Data ▾</Tab> →{" "}
          <em>Export plan</em> to download a JSON backup, and <em>Import plan</em> to
          restore it (or load it on another device). <em>Reset everything</em> clears all
          teams and inventory.
        </Step>

        <div className="rounded-xl border border-[var(--color-edge)] bg-[var(--color-panel2)] p-3 text-xs text-slate-400">
          Resonator and weapon data is fetched live from a community catalog, so new
          characters and weapons appear automatically after each game update. This is a
          fan project and isn't affiliated with Kuro Games.
        </div>

        <button
          onClick={onStart}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
        >
          Start planning →
        </button>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-semibold text-cyan-300">
        {n}
      </div>
      <div className="min-w-0">
        <h3 className="mb-1 font-semibold text-slate-100">{title}</h3>
        <div>{children}</div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-0.5 inline-block rounded-md border border-[var(--color-edge)] bg-[var(--color-panel2)] px-1.5 py-0.5 text-[11px] font-medium text-slate-200">
      {children}
    </span>
  );
}

function Tab({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-cyan-300">{children}</span>;
}

function Slotish({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-dashed border-[var(--color-edge)] px-1.5 py-0.5 text-[11px] text-slate-400">
      {children}
    </span>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 rounded-lg border-l-2 border-cyan-500/60 bg-cyan-500/5 px-3 py-2 text-xs text-slate-400">
      💡 {children}
    </div>
  );
}
