// Complementation test grid. A set of recessive mutants (all with the same mutant phenotype)
// has been crossed in every pair; each cell of the matrix shows whether the double heterozygote
// is wild type (+, the mutations complement: different genes) or mutant (−, they fail to
// complement: same gene). The student sorts the mutants into complementation groups by clicking
// the group chip of each mutant (cycles ? → A → B → …), and presses "check". The demo lists the
// cells that contradict the grouping; "sort by group" reorders rows and columns so each group
// becomes a block of −; "reveal genes" shows which gene each mutant really hits.
// Model: every mutant is recessive, a loss of function in exactly one gene; no deletions,
// no leaky alleles. The presets and random sets are invented teaching data.
//
// Auto-mounts on <div data-demo="complementation">. data-* options (all optional):
//   data-preset="two|three|four|one|random"   starting set (default "three")
//   data-n="8"        number of mutants in a random set (4–10)
//   data-genes="3"    number of genes in a random set (default: 2–4, drawn from the seed)
//   data-seed="1"     first random set; "new random set" steps the seed
import { autoMount, button, htmlEl, presets, rng, svgEl } from "../lib/ui";

const NAME = "complementation";
const INK = "#1b2a3a", BAD = "#ff7f0e", OK = "#2ca02c";
const GROUP_LETTERS = ["A", "B", "C", "D", "E"];
const GROUP_COL = ["#2a6f97", "#6a994e", "#d08c2f", "#9467bd", "#bc4749"];
const PLUS_BG = "#e4f1df", MINUS_BG = "#f6dede";

const STYLE = `
[data-demo="${NAME}"] { flex-direction: column; align-items: stretch; gap: .45em; }
[data-demo="${NAME}"] .cp-row { display: flex; flex-wrap: wrap; gap: .35em .9em; align-items: center; }
[data-demo="${NAME}"] .cp-main { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-start; }
[data-demo="${NAME}"] .cp-main svg { flex: 1 1 420px; max-width: 600px; height: auto; }
[data-demo="${NAME}"] .cp-side { flex: 1 1 260px; display: flex; flex-direction: column; gap: .45em; }
[data-demo="${NAME}"] svg text { font-size: 18px; fill: ${INK}; }
[data-demo="${NAME}"] svg .cell { font-size: 22px; font-weight: 700; }
[data-demo="${NAME}"] svg .lab { font-size: 17px; font-weight: 600; }
[data-demo="${NAME}"] svg .chip text { font-size: 16px; font-weight: 700; fill: #fff; }
[data-demo="${NAME}"] svg .chip { cursor: pointer; }
[data-demo="${NAME}"] svg .gene { font-size: 15px; font-weight: 600; }
[data-demo="${NAME}"] svg .hit { cursor: pointer; }
[data-demo="${NAME}"] .cp-msg { min-height: 5.5em; background: var(--qb-panel); border-radius: 6px; padding: .45em .7em; }
[data-demo="${NAME}"] .cp-msg p { margin: .15em 0; }
[data-demo="${NAME}"] .cp-msg b.yes { color: ${OK}; }
[data-demo="${NAME}"] .cp-msg b.no { color: #c0392b; }
.reveal [data-demo="${NAME}"] { font-size: 18px; gap: .3em; }
.reveal [data-demo="${NAME}"] .cp-main svg { max-height: 430px; }
.reveal [data-demo="${NAME}"] .cp-msg { font-size: 16px; min-height: 4.5em; padding: .3em .6em; }
.reveal [data-demo="${NAME}"] .qb-note { display: none; }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

// ---------------- model ----------------

/** A set of mutants: gene[i] = the (hidden) gene that mutant i+1 hits, numbered 0..k-1. */
interface MutantSet { gene: number[]; label: string; }

const PRESETS: Record<string, MutantSet> = {
  two: { gene: [0, 1, 1, 0, 1, 0], label: "6 mutants" },
  three: { gene: [0, 1, 0, 2, 1, 0, 2, 1], label: "8 mutants" },
  four: { gene: [0, 1, 2, 1, 3, 0, 1, 2], label: "8 mutants, harder" },
  one: { gene: [0, 0, 0, 0, 0], label: "5 mutants" },
};

/** Renumber genes in order of first appearance, so mutant 1 is always in gene 1. */
function canon(g: number[]): number[] {
  const map = new Map<number, number>();
  return g.map(x => { if (!map.has(x)) map.set(x, map.size); return map.get(x)!; });
}

function randomSet(seed: number, n: number, genes: number | null): MutantSet {
  const r = rng(seed * 7919 + 13);
  const k = genes ?? 2 + Math.floor(r.unif() * 3);           // 2–4 genes
  const kk = Math.max(1, Math.min(k, n, GROUP_LETTERS.length));
  const g: number[] = [];
  for (let i = 0; i < kk; i++) g.push(i);                     // every gene gets ≥ 1 mutant
  while (g.length < n) g.push(Math.floor(r.unif() * kk));
  for (let i = g.length - 1; i > 0; i--) {                    // shuffle
    const j = Math.floor(r.unif() * (i + 1));
    [g[i], g[j]] = [g[j], g[i]];
  }
  return { gene: canon(g), label: `random set ${seed}` };
}

const complements = (s: MutantSet, i: number, j: number) => s.gene[i] !== s.gene[j];

// ---------------- view ----------------

const CELL = 50, LEFT = 112, TOP = 74;

interface State {
  set: MutantSet;
  group: (number | null)[];      // the student's grouping, index into GROUP_LETTERS
  sorted: boolean;
  reveal: boolean;
  checked: boolean;
  focus: [number, number] | null; // last clicked cell
}

function conflicts(st: State): [number, number][] {
  const out: [number, number][] = [];
  const n = st.set.gene.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = st.group[i], b = st.group[j];
    if (a === null || b === null) continue;
    const same = a === b;
    if (same === complements(st.set, i, j)) out.push([i, j]);
  }
  return out;
}

function order(st: State): number[] {
  const idx = st.set.gene.map((_, i) => i);
  if (st.reveal) return idx.sort((a, b) => st.set.gene[a] - st.set.gene[b] || a - b);
  if (!st.sorted) return idx;
  const key = (i: number) => (st.group[i] === null ? 99 : st.group[i]!);
  return idx.sort((a, b) => key(a) - key(b) || a - b);
}

function draw(svg: SVGSVGElement, st: State, onChip: (i: number) => void, onCell: (i: number, j: number) => void): void {
  const n = st.set.gene.length;
  const ord = order(st);
  const extra = st.reveal ? 92 : 0;
  const W = LEFT + n * CELL + 16 + extra, H = TOP + n * CELL + 12;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.replaceChildren();
  const bad = new Set(st.checked ? conflicts(st).map(([i, j]) => `${i},${j}`) : []);

  // headers
  svgEl("text", { x: LEFT + (n * CELL) / 2, y: 22, "text-anchor": "middle", class: "lab" }, svg).textContent = "mutant";
  svgEl("text", { x: 8, y: 22, class: "lab" }, svg).textContent = "group";
  ord.forEach((m, c) => {
    svgEl("text", { x: LEFT + c * CELL + CELL / 2, y: TOP - 14, "text-anchor": "middle", class: "lab" }, svg).textContent = String(m + 1);
  });

  ord.forEach((mi, r) => {
    const y = TOP + r * CELL;
    // group chip (click to cycle)
    const g = st.group[mi];
    const chip = svgEl("g", { class: "chip", role: "button", "aria-label": `group of mutant ${mi + 1}` }, svg);
    svgEl("rect", { x: 10, y: y + 9, width: 40, height: CELL - 18, rx: 7, fill: g === null ? "#b7c0c9" : GROUP_COL[g], stroke: "#fff", "stroke-width": 1 }, chip);
    svgEl("text", { x: 30, y: y + CELL / 2 + 6, "text-anchor": "middle" }, chip).textContent = g === null ? "?" : GROUP_LETTERS[g];
    chip.addEventListener("click", () => onChip(mi));
    // row label
    svgEl("text", { x: LEFT - 16, y: y + CELL / 2 + 6, "text-anchor": "end", class: "lab" }, svg).textContent = String(mi + 1);
    // cells
    ord.forEach((mj, c) => {
      const x = LEFT + c * CELL;
      const plus = complements(st.set, mi, mj);
      const key = mi < mj ? `${mi},${mj}` : `${mj},${mi}`;
      const isBad = bad.has(key);
      const isFocus = st.focus && ((st.focus[0] === mi && st.focus[1] === mj) || (st.focus[0] === mj && st.focus[1] === mi));
      const cell = svgEl("g", { class: "hit" }, svg);
      svgEl("rect", {
        x: x + 1, y: y + 1, width: CELL - 2, height: CELL - 2, rx: 3,
        fill: mi === mj ? "#eceff2" : plus ? PLUS_BG : MINUS_BG,
        stroke: isBad ? BAD : isFocus ? INK : "#fff", "stroke-width": isBad ? 4 : isFocus ? 3 : 1,
      }, cell);
      svgEl("text", { x: x + CELL / 2, y: y + CELL / 2 + 8, "text-anchor": "middle", class: "cell" }, cell).textContent = plus ? "+" : "−";
      cell.addEventListener("click", () => onCell(mi, mj));
    });
    if (st.reveal) {
      svgEl("text", { x: LEFT + n * CELL + 14, y: y + CELL / 2 + 6, class: "gene" }, svg).textContent = `gene ${st.set.gene[mi] + 1}`;
    }
  });
  // outline blocks of the true genes when revealed
  if (st.reveal) {
    let start = 0;
    for (let r = 1; r <= n; r++) {
      if (r === n || st.set.gene[ord[r]] !== st.set.gene[ord[start]]) {
        svgEl("rect", {
          x: LEFT + start * CELL, y: TOP + start * CELL, width: (r - start) * CELL, height: (r - start) * CELL,
          fill: "none", stroke: INK, "stroke-width": 3, rx: 4, "pointer-events": "none",
        }, svg);
        start = r;
      }
    }
  }
}

function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;
  let seed = Math.max(1, Math.round(Number(ds.seed ?? 1)) || 1);
  const nRand = Math.max(4, Math.min(10, Math.round(Number(ds.n ?? 8)) || 8));
  const gRand = ds.genes ? Math.max(1, Math.min(5, Math.round(Number(ds.genes)) || 3)) : null;
  const startPreset = ds.preset && (ds.preset in PRESETS || ds.preset === "random") ? ds.preset : "three";

  const st: State = { set: PRESETS.three, group: [], sorted: false, reveal: false, checked: false, focus: null };

  const top = htmlEl("div", "cp-row", "", host);
  htmlEl("span", "", "Mutant set:", top);
  const presetBtns = presets(top, [
    { label: "6 mutants", apply: () => load(PRESETS.two) },
    { label: "8 mutants", apply: () => load(PRESETS.three) },
    { label: "8, harder", apply: () => load(PRESETS.four) },
    { label: "5 mutants", apply: () => load(PRESETS.one) },
    { label: "new random set", apply: () => { seed++; load(randomSet(seed, nRand, gRand)); } },
  ]);

  const main = htmlEl("div", "cp-main", "", host);
  const svg = svgEl("svg", { role: "img", "aria-label": "Complementation matrix" }, main);
  const side = htmlEl("div", "cp-side", "", main);
  const actions = htmlEl("div", "cp-row", "", side);
  button(actions, "check grouping", () => { st.checked = true; st.focus = null; update(); });
  const sortBtn = button(actions, "sort by group", () => { st.sorted = !st.sorted; update(); });
  button(actions, "reveal genes", () => { st.reveal = true; st.checked = true; update(); });
  button(actions, "clear", () => { st.group = st.set.gene.map(() => null); st.checked = false; st.reveal = false; st.sorted = false; st.focus = null; update(); });
  const msg = htmlEl("div", "cp-msg", "", side);
  htmlEl("p", "qb-note",
    "Click a group chip (left of each row) to put that mutant in group A, B, C… Click a cell to read that cross. All mutants are recessive and have the same mutant phenotype. The mutant sets are invented teaching data.",
    side);

  function load(s: MutantSet): void {
    st.set = s;
    st.group = s.gene.map(() => null);
    st.sorted = false; st.reveal = false; st.checked = false; st.focus = null;
    update();
  }

  function onChip(i: number): void {
    if (st.reveal) return;
    const g = st.group[i];
    st.group[i] = g === null ? 0 : g + 1 < GROUP_LETTERS.length ? g + 1 : null;
    st.checked = false;
    st.focus = null;
    update();
  }

  function onCell(i: number, j: number): void {
    st.focus = [i, j];
    update();
  }

  function update(): void {
    draw(svg, st, onChip, onCell);
    sortBtn.classList.toggle("active", st.sorted && !st.reveal);
    msg.replaceChildren();
    const para = (html: string) => { const p = htmlEl("p", "", "", msg); p.innerHTML = html; };
    const n = st.set.gene.length;
    const k = new Set(st.set.gene).size;

    if (st.focus) {
      const [i, j] = st.focus;
      if (i === j) {
        para(`Mutant ${i + 1} × mutant ${i + 1}: both copies carry the same mutation, so the offspring is mutant (−). The diagonal is always −.`);
      } else if (complements(st.set, i, j)) {
        para(`Mutant ${i + 1} × mutant ${j + 1}: the offspring is <b>wild type (+)</b>. Each parent supplies a working copy of the gene the other one lacks: they <b>complement</b>, so the mutations are in <b>different genes</b>.`);
      } else {
        para(`Mutant ${i + 1} × mutant ${j + 1}: the offspring is <b>mutant (−)</b>. Neither parent supplies a working copy of that gene: they <b>fail to complement</b>, so the mutations are in the <b>same gene</b>.`);
      }
      return;
    }
    if (st.reveal) {
      para(`<b>${k} gene${k > 1 ? "s" : ""}</b> among ${n} mutants. Rows and columns are sorted by gene: each gene is a block of − (outlined), and every cell between blocks is +.`);
      const sizes = Array.from({ length: k }, (_, g) => st.set.gene.filter(x => x === g).length);
      para(`Mutants per gene: ${sizes.map((s, g) => `gene ${g + 1}: ${s}`).join(", ")}.`);
      return;
    }
    const unassigned = st.group.filter(g => g === null).length;
    if (!st.checked) {
      para(`${n} recessive mutants with the same phenotype, crossed in every pair. In the matrix, <b>−</b> = mutant offspring: the two fail to complement (same gene). <b>+</b> = wild-type offspring: they complement (different genes).`);
      para(unassigned ? `Give each mutant a group, then press "check grouping". ${unassigned} still unassigned.` : `All mutants have a group. Press "check grouping".`);
      return;
    }
    const cs = conflicts(st);
    if (cs.length) {
      para(`<b class="no">${cs.length} cell${cs.length > 1 ? "s" : ""} disagree${cs.length > 1 ? "" : "s"} with your grouping</b> (outlined in orange).`);
      const [i, j] = cs[0];
      const sameGroup = st.group[i] === st.group[j];
      para(sameGroup
        ? `For example, mutants ${i + 1} and ${j + 1} are both in group ${GROUP_LETTERS[st.group[i]!]}, but their cross is +: they complement, so they cannot be in the same gene.`
        : `For example, mutants ${i + 1} and ${j + 1} are in different groups, but their cross is −: they fail to complement, so they are in the same gene.`);
      return;
    }
    if (unassigned) {
      para(`No contradictions so far, but ${unassigned} mutant${unassigned > 1 ? "s are" : " is"} still unassigned.`);
      return;
    }
    const nGroups = new Set(st.group).size;
    para(`<b class="yes">Consistent: ${nGroups} complementation group${nGroups > 1 ? "s" : ""}.</b> Every − is inside a group and every + is between groups.`);
    para(`So these mutations hit <b>${nGroups} different gene${nGroups > 1 ? "s" : ""}</b>. Try "sort by group", then "reveal genes".`);
  }

  // start
  const idx = ["two", "three", "four", "one", "random"].indexOf(startPreset);
  if (startPreset === "random") load(randomSet(seed, nRand, gRand)); else load(PRESETS[startPreset]);
  presetBtns.forEach((b, i) => b.classList.toggle("active", i === idx));
}

autoMount(NAME, mount);
