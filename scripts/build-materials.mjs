// Builds the Material Calculator cost bundle from the community datamine.
//
//   node scripts/build-materials.mjs [version]   (default: 3.4)
//
// Why this exists: nanoka (the catalog/portrait source used at runtime) does not
// expose upgrade-material costs. Those live in the Arikatsu/WutheringWaves_Data
// datamine, spread across ~10 tables that must be joined and whose item names are
// only resolvable through a 43 MB text map. Doing that in the browser would be
// heavy and slow, so we precompute once here and commit a compact bundle:
//
//   src/data/materials.<version>.json
//
// Released-content rule (must match game.ts): the datamine is pinned to a released
// branch (e.g. "3.4"), which is cumulative and contains no 3.5+ content. We further
// intersect with nanoka's released catalog so the bundle only covers units the app
// can actually show.
//
// No dependencies — Node 18+ (global fetch). Run manually when the game version bumps.

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = process.argv[2] ?? "3.4";
const NANOKA = "https://static.nanoka.cc";
const DATA = `https://raw.githubusercontent.com/Arikatsu/WutheringWaves_Data/${VERSION}`;
const OUT = fileURLToPath(new URL(`../src/data/materials.${VERSION}.json`, import.meta.url));

const SHELL_CREDIT = 2; // item id of Shell Credit (the in-game currency)
const MAX_CHAR_LEVEL = 90;
const MAX_WEAPON_LEVEL = 90;
// The five active-skill slots, keyed by the skill's SkillType (from skill/skill.json).
// Type 4/11/12 are inherent passives (unlock free with ascension), not slotted here.
const SLOT_BY_TYPE = { 1: "normal", 2: "skill", 3: "circuit", 6: "liberation", 5: "intro" };

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}
const bin = (p) => getJson(`${DATA}/BinData/${p}`);

/** Mirror of game.ts iconUrl(): in-game asset path -> public CDN webp. */
const toIconPath = (p) => (p ? p.replace("/Game/Aki/UI/", "").split(".")[0] : "");

/** Normalize a datamine Consume array ([{Key,Value}]) to [{id, qty}]. */
const consume = (arr) =>
  (arr ?? []).map((c) => ({ id: c.Key, qty: c.Value })).filter((c) => c.qty > 0);

async function main() {
  console.log(`Building material bundle for version ${VERSION}…`);

  const [
    nChars,
    nWeapons,
    roleInfo,
    roleBreach,
    roleLevelConsume,
    roleExpItem,
    skillLevel,
    skillTree,
    skillConf,
    weaponConf,
    weaponBreach,
    weaponLevel,
    weaponExpItem,
    itemInfo,
    multiText,
  ] = await Promise.all([
    getJson(`${NANOKA}/ww/${VERSION}/character.json`),
    getJson(`${NANOKA}/ww/${VERSION}/weapon.json`),
    bin("role/roleinfo.json"),
    bin("role_level/rolebreach.json"),
    bin("role_level/rolelevelconsume.json"),
    bin("role/roleexpitem.json"),
    bin("skill/skilllevel.json"),
    bin("skillTree/skilltree.json"),
    bin("skill/skill.json"),
    bin("weapon/weaponconf.json"),
    bin("weapon/weaponbreach.json"),
    bin("weapon/weaponlevel.json"),
    bin("weapon/weaponexpitem.json"),
    bin("item/iteminfo.json"),
    getJson(`${DATA}/Textmaps/en/multi_text/MultiText.json`),
  ]);

  // ---- lookups --------------------------------------------------------------
  const releasedChars = new Set(Object.keys(nChars)); // released resonator ids (strings)
  const releasedWeapons = new Set(Object.keys(nWeapons));
  const name = new Map(multiText.map((e) => [e.Id, e.Content]));
  const itemMeta = new Map(itemInfo.map((it) => [it.Id, it]));
  const skillById = new Map(skillConf.map((s) => [s.Id, s])); // skill name/icon/type by SkillId
  // Resolve via the iteminfo entry's own Name key — a few items (e.g. the Tidal
  // Residuum line, id 411000xx) store their text under a *different* id than their
  // own (ItemInfo_412000xx_Name), so reconstructing `ItemInfo_<id>_Name` misses.
  const itemName = (id) =>
    name.get(itemMeta.get(id)?.Name ?? `ItemInfo_${id}_Name`) ?? `Item ${id}`;

  // Collect every item id the cost tables reference, so we emit only those.
  const usedItems = new Set([SHELL_CREDIT]);
  const mark = (rows) => rows.forEach((r) => usedItems.add(r.id));

  // Index the reference cost tables by their group key.
  const breachByGroup = groupBy(roleBreach, "BreachGroupId");
  const levelExpByGroup = groupBy(roleLevelConsume, "ConsumeGroupId");
  const skillLevelByGroup = groupBy(skillLevel, "SkillLevelGroupId");
  const treeByRole = groupBy(skillTree, "NodeGroup");
  const wBreachByGroup = groupBy(weaponBreach, "BreachId");
  const wLevelByGroup = groupBy(weaponLevel, "LevelId");

  // A skill-level group is a *leveled* active skill if it has the full 1→10 ladder
  // (inherent/passive nodes resolve to a group with 0–1 cost rows).
  const isActiveSkill = (groupId) => (skillLevelByGroup.get(groupId)?.length ?? 0) >= 8;

  // ---- characters -----------------------------------------------------------
  const characters = {};
  for (const role of roleInfo) {
    const id = String(role.Id);
    if (!releasedChars.has(id)) continue;

    // Ascension (breakthrough) materials, by breakthrough level 0..6.
    const ascension = (breachByGroup.get(role.BreachId) ?? [])
      .slice()
      .sort((a, b) => a.BreachLevel - b.BreachLevel)
      .map((r) => ({ level: r.BreachLevel, consume: consume(r.BreachConsume) }))
      .filter((r) => r.consume.length);
    ascension.forEach((a) => mark(a.consume));

    // Active skills 1→10. Each tree node whose SkillId maps to a leveled group is one
    // of the five skills. Its slot (normal/skill/…) comes from skill.json's SkillType,
    // along with the in-game name and icon. The tree is keyed by SkillTreeGroupId
    // (== Id for everyone except Rover variants).
    const treeNodes = treeByRole.get(role.SkillTreeGroupId) ?? [];
    const skills = {};
    for (const n of treeNodes) {
      if (!isActiveSkill(n.SkillId)) continue;
      const conf = skillById.get(n.SkillId) ?? {};
      const key = SLOT_BY_TYPE[conf.SkillType];
      if (!key) continue; // not one of the five slotted skills
      // r.SkillId here is the level *within* the group (1..10); r.Id is a global row
      // id (e.g. 222) and must NOT be used as the level. (Confusingly, a skill-tree
      // node's SkillId is instead the group id — different table, same field name.)
      const levels = (skillLevelByGroup.get(n.SkillId) ?? [])
        .slice()
        .sort((a, b) => a.SkillId - b.SkillId)
        .map((r) => ({ lvl: r.SkillId, consume: consume(r.Consume) }))
        .filter((r) => r.consume.length);
      levels.forEach((l) => mark(l.consume));
      skills[key] = {
        name: name.get(conf.SkillName) ?? "",
        icon: toIconPath(conf.Icon ?? ""),
        levels,
      };
    }

    // Forte nodes (10 total): each active skill owns a 2-node chain hanging off it via
    // ParentNodes — usually two stat-bonus nodes (NodeType 4, CRIT/ATK/…), but one skill
    // instead carries the two Inherent Skills (NodeType 3, SkillType 4 — e.g. Phrolova's
    // "Accidental" & "Octet"). We walk each node up to its owning skill so the UI can
    // group them. Other NodeType-3 nodes (Outro / Tune Break, SkillType 11/12) unlock
    // for free and are excluded. `depth` orders the two nodes nearest-skill first.
    const byIndex = new Map(treeNodes.map((n) => [n.NodeIndex, n]));
    const slotOf = (node) => {
      let cur = node;
      let depth = 0;
      const seen = new Set();
      while (cur && !seen.has(cur.NodeIndex)) {
        seen.add(cur.NodeIndex);
        const conf = skillById.get(cur.SkillId);
        if (conf && isActiveSkill(cur.SkillId) && SLOT_BY_TYPE[conf.SkillType])
          return { slot: SLOT_BY_TYPE[conf.SkillType], depth };
        const p = (cur.ParentNodes ?? [])[0];
        cur = p != null ? byIndex.get(p) : null;
        depth++;
      }
      return { slot: null, depth: 99 };
    };
    const SLOT_RANK = { normal: 0, skill: 1, circuit: 2, liberation: 3, intro: 4 };
    // The datamine's ParentNodes always chains the two Inherent Skills to the Resonance
    // Liberation node (a logical unlock dependency). In the in-game forte tree, though,
    // the Inherent Skills sit on the Forte Circuit branch and Liberation carries two
    // stat nodes — i.e. the circuit/liberation node groups are the reverse of the wiring.
    // Swap them so each node displays under the skill it appears with in-game.
    const NODE_SLOT_SWAP = { circuit: "liberation", liberation: "circuit" };
    // The datamine never authors the inherent-skill nodes' real cost: it stamps every
    // skill-tree node with one constant placeholder Consume ({Adagio Helix x2, MF Howler
    // Core x3, 3900}). For *leveled* skills the real cost comes from skilllevel.json, but
    // the two inherent skills aren't leveled, so that placeholder would leak through —
    // wrong forgery set for every character (e.g. Lucy demanding Helix, not Combustor).
    // Every Resonator shares one upgrade-cost template (only the material *family* differs,
    // verified: all 5★/4★ have an identical 170k/1.4M/630k Shell-Credit signature), so we
    // author the inherent cost from this Resonator's own forgery tiers. In-game the two
    // inherent skills cost the tier-2 and tier-3 forgery sets (3 each) + 1 "Gold in Memory"
    // -class mat + 15000 Shell Credit apiece — one tier below the stat-node pair on the
    // same branch (which are tier-3 and tier-4). tier-3 comes from the depth-1 stat node,
    // tier-2 from skill Lv4, the gold mat from the depth-2 stat node (the only "414"-class
    // item appearing in a node's cost).
    const forge = (c) => c.filter((e) => e.id !== SHELL_CREDIT && !String(e.id).startsWith("414"));
    let tier3Forge = [];
    let goldId = null;
    for (const n of treeNodes) {
      if (n.NodeType !== 4 || !(n.Consume?.length ?? 0)) continue;
      const c = consume(n.Consume);
      const d = slotOf(n).depth;
      if (d === 1 && !tier3Forge.length) tier3Forge = forge(c);
      if (d === 2 && goldId == null) goldId = c.find((e) => String(e.id).startsWith("414"))?.id ?? null;
    }
    const tier2Forge = forge(Object.values(skills)[0]?.levels?.find((l) => l.lvl === 4)?.consume ?? []);
    // depth 1 (nearer the skill) costs the lower tier (2); depth 2 the higher (3).
    const inherentConsume = (depth) => {
      const c = (depth === 1 ? tier2Forge : tier3Forge).map((e) => ({ id: e.id, qty: 3 }));
      if (goldId != null) c.push({ id: goldId, qty: 1 });
      c.push({ id: SHELL_CREDIT, qty: 15000 });
      return c;
    };
    const nodes = treeNodes
      .map((n) => {
        const inherent =
          n.NodeType === 3 && skillById.get(n.SkillId)?.SkillType === 4;
        const stat = n.NodeType === 4;
        if ((!inherent && !stat) || !(n.Consume?.length ?? 0)) return null;
        const conf = inherent ? skillById.get(n.SkillId) ?? {} : {};
        const walked = slotOf(n);
        const slot = NODE_SLOT_SWAP[walked.slot] ?? walked.slot;
        const depth = walked.depth;
        return {
          slot,
          depth,
          kind: inherent ? "skill" : "stat",
          title: inherent ? name.get(conf.SkillName) ?? "" : name.get(n.PropertyNodeTitle) ?? "",
          icon: toIconPath(inherent ? conf.Icon ?? "" : n.PropertyNodeIcon ?? ""),
          value: inherent ? "" : (n.PropertyNodeParam ?? [])[0] ?? "",
          consume: inherent ? inherentConsume(depth) : consume(n.Consume),
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          (SLOT_RANK[a.slot] ?? 9) - (SLOT_RANK[b.slot] ?? 9) || a.depth - b.depth
      )
      .map(({ depth: _depth, ...rest }) => rest);
    nodes.forEach((n) => mark(n.consume));

    characters[id] = { levelGroup: role.LevelConsumeId, ascension, skills, nodes };
  }

  // ---- weapons --------------------------------------------------------------
  const weapons = {};
  for (const w of weaponConf) {
    const id = String(w.ItemId);
    if (!releasedWeapons.has(id)) continue;
    const ascension = (wBreachByGroup.get(w.BreachId) ?? [])
      .slice()
      .sort((a, b) => a.Level - b.Level)
      .map((r) => {
        const c = consume(r.Consume);
        if (r.GoldConsume) c.push({ id: SHELL_CREDIT, qty: r.GoldConsume });
        // weaponbreach `Level` is 0-based (0..5); rolebreach `BreachLevel` is 1-based
        // (1..6). Shift weapons to 1-based so both share the calc's `level > from &&
        // level <= to` filter — otherwise the first tier (from=0) is dropped.
        return { level: r.Level + 1, consume: c };
      })
      .filter((r) => r.consume.length);
    ascension.forEach((a) => mark(a.consume));
    // `type` (1..5 weapon-type id, from nanoka) lets the planner bucket each Forgery
    // "Weapon and Skill" material under the weapon type that consumes it.
    weapons[id] = { levelId: w.LevelId, ascension, type: nWeapons[id]?.type };
  }

  // ---- EXP curves & EXP items ----------------------------------------------
  const cumulative = (rows, field, max) => {
    const sorted = rows.slice().sort((a, b) => a.Level - b.Level);
    const cum = [0]; // cum[level] = total exp to reach `level` from level 1
    let total = 0;
    for (const r of sorted) {
      if (r.Level > max) break;
      total += r[field] ?? 0;
      cum[r.Level] = total;
    }
    return cum;
  };
  const characterExp = {};
  for (const [group, rows] of levelExpByGroup)
    characterExp[group] = cumulative(rows, "ExpCount", MAX_CHAR_LEVEL);
  const weaponExp = {};
  for (const [group, rows] of wLevelByGroup)
    weaponExp[group] = cumulative(rows, "Exp", MAX_WEAPON_LEVEL);

  const expItems = {
    role: roleExpItem
      .map((r) => ({ id: r.Id, exp: r.BasicExp, cost: 0 }))
      .sort((a, b) => b.exp - a.exp),
    weapon: weaponExpItem
      .map((r) => ({ id: r.Id, exp: r.BasicExp, cost: r.Cost ?? 0 }))
      .sort((a, b) => b.exp - a.exp),
  };
  [...expItems.role, ...expItems.weapon].forEach((e) => usedItems.add(e.id));

  // ---- items map (only referenced ids) -------------------------------------
  const items = {};
  for (const id of [...usedItems].sort((a, b) => a - b)) {
    const meta = itemMeta.get(id);
    items[id] = {
      name: itemName(id),
      icon: toIconPath(meta?.Icon ?? ""),
      rarity: meta?.QualityId ?? 1,
    };
  }

  const bundle = { version: VERSION, items, characters, weapons, characterExp, weaponExp, expItems };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(bundle) + "\n");

  // ---- summary + spot check -------------------------------------------------
  const charCount = Object.keys(characters).length;
  const skillCounts = Object.values(characters).map((c) => Object.keys(c.skills).length);
  const badSkills = skillCounts.filter((n) => n !== 5).length;
  const orphanNodes = Object.values(characters).reduce(
    (a, c) => a + c.nodes.filter((n) => !n.slot).length,
    0
  );
  const badNodeCounts = Object.values(characters).filter((c) => c.nodes.length !== 10).length;
  console.log(`  characters: ${charCount}  weapons: ${Object.keys(weapons).length}  items: ${Object.keys(items).length}`);
  console.log(`  characters without exactly 5 active skills: ${badSkills}`);
  console.log(`  characters without exactly 10 forte nodes: ${badNodeCounts}  ·  forte nodes without a skill group: ${orphanNodes}`);
  const carlotta = Object.entries(nChars).find(([, c]) => c.en === "Carlotta")?.[0];
  if (carlotta && characters[carlotta]) {
    const c = characters[carlotta];
    console.log(`  spot-check Carlotta (${carlotta}): ${c.ascension.length} ascension tiers, skills=${Object.keys(c.skills).join("/")}, ${c.nodes.length} bonus nodes`);
  }
  console.log(`Wrote ${OUT}`);
}

function groupBy(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const k = r[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
