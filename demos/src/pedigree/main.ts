// Pedigree: which mode of inheritance? A seeded random 3–4-generation pedigree is drawn
// with standard symbols under a hidden mode (AR, AD, XR, XD). The student tests a mode:
// the demo says whether it is CONSISTENT (some set of genotypes fits everyone, shown under
// the symbols, obligate carriers half-filled) or RULED OUT (the parent–child trios that
// make it impossible are ringed and explained). Several modes can be consistent at once.
// Model: one gene, full penetrance, no new mutations; founders may be carriers.
//
// Auto-mounts on <div data-demo="pedigree">. data-* options (all optional):
//   data-mode="AR|AD|XR|XD"  fix the hidden mode (default: drawn from the seed)
//   data-seed="1"            first pedigree; "new pedigree" steps the seed
import { autoMount, button, htmlEl, svgEl } from "../lib/ui";
import {
  MODES, MODE_NAME, generate, solve, possibleGenotypes, conflicts,
  type Mode, type Pedigree, type Person, type Sex,
} from "./model";

const NAME = "pedigree";
const INK = "#1b2a3a", BAD = "#d62728", OK = "#2ca02c";
const STYLE = `
[data-demo="${NAME}"] { flex-direction: column; align-items: stretch; gap: .5em; }
[data-demo="${NAME}"] .pd-controls { display: flex; flex-wrap: wrap; gap: .4em 1em; align-items: center; }
[data-demo="${NAME}"] .pd-modes { display: flex; flex-wrap: wrap; gap: .35em; }
[data-demo="${NAME}"] .qb-btn.pd-yes { border-color: ${OK}; box-shadow: inset 0 0 0 1px ${OK}; }
[data-demo="${NAME}"] .qb-btn.pd-no { border-color: ${BAD}; box-shadow: inset 0 0 0 1px ${BAD}; text-decoration: line-through; }
[data-demo="${NAME}"] .qb-btn.active { color: #fff; text-decoration: none; }
[data-demo="${NAME}"] .qb-btn.pd-true { outline: 3px solid #ff7f0e; outline-offset: 1px; }
[data-demo="${NAME}"] svg { width: 100%; height: auto; max-height: 470px; }
[data-demo="${NAME}"] svg text { font-size: 17px; fill: ${INK}; }
[data-demo="${NAME}"] svg .gen { font-size: 22px; font-weight: 700; }
[data-demo="${NAME}"] svg .geno { font-size: 17px; fill: #2a6f97; font-weight: 600; }
[data-demo="${NAME}"] .pd-msg { min-height: 3.6em; background: var(--qb-panel); border-radius: 6px; padding: .45em .7em; }
[data-demo="${NAME}"] .pd-msg b.yes { color: ${OK}; }
[data-demo="${NAME}"] .pd-msg b.no { color: ${BAD}; }
[data-demo="${NAME}"] .pd-msg p { margin: .15em 0; }
.reveal [data-demo="${NAME}"] { font-size: 19px; gap: .3em; }
.reveal [data-demo="${NAME}"] svg { max-height: 440px; }
.reveal [data-demo="${NAME}"] .pd-msg { font-size: 17px; min-height: 3.2em; padding: .3em .6em; }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

const SLOT = 82, S = 38, ROW = 124, LEFT = 84, TOP = 34;

/** Genotype as text parts; sup = superscript allele. `set` = the possible genotypes. */
function genoParts(m: Mode, sex: Sex, set: number[]): [string, boolean][] {
  const dis = m === "AD" || m === "XD" ? "A" : "a", nor = dis === "A" ? "a" : "A";
  const dom = m === "AD" || m === "XD" ? dis : nor;      // the allele written first
  const rec = dom === "A" ? "a" : "A";
  const al = (k: number) => (k ? dis : nor);
  if (m === "AR" || m === "AD") {
    if (set.length > 1) return [[dom + "–", false]];
    const g = set[0];
    const pair = [al(g >= 1 ? 1 : 0), al(g >= 2 ? 1 : 0)].sort((x, y) => (x === dom ? -1 : y === dom ? 1 : 0));
    return [[pair.join(""), false]];
  }
  if (sex === "M") return [["X", false], [al(set[0]), true], ["Y", false]];
  if (set.length > 1) return [["X", false], [dom, true], ["X", false], ["–", true]];
  const g = set[0];
  const pair = g === 1 ? [dom, rec] : [al(g ? 1 : 0), al(g ? 1 : 0)];
  return [["X", false], [pair[0], true], ["X", false], [pair[1], true]];
}

function drawText(parent: Element, x: number, y: number, parts: [string, boolean][], cls: string): void {
  const t = svgEl("text", { x, y, "text-anchor": "middle", class: cls }, parent);
  let up = false;
  for (const [s, sup] of parts) {
    const sp = svgEl("tspan", {}, t);
    if (sup !== up) { sp.setAttribute("dy", sup ? "-7" : "7"); up = sup; }
    if (sup) sp.setAttribute("font-size", "13");
    sp.textContent = s;
  }
}

interface View {
  test: Mode | null;        // the mode being tested
  reveal: boolean;
}

function draw(svg: SVGSVGElement, ped: Pedigree, view: View): void {
  const P = ped.people;
  const W = LEFT + ped.width * SLOT + 16, H = TOP + (ped.gens - 1) * ROW + S / 2 + 52;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.maxWidth = `${Math.round(W * 1.05)}px`;   // a small family is not blown up
  svg.replaceChildren();
  const px = (p: Person) => LEFT + p.x * SLOT, py = (p: Person) => TOP + S / 2 + (p.gen - 1) * ROW;

  // what to show under the symbols, and which trios to ring
  const m = view.reveal ? ped.mode : view.test;
  let sets: number[][] | null = null, bad = new Set<number>(), carrier = new Set<number>();
  if (view.reveal) {
    sets = P.map(p => [p.g]);
  } else if (m) {
    sets = possibleGenotypes(ped, m);
    if (!sets) for (const c of conflicts(ped, m)) [c.father, c.mother, c.child].forEach(i => bad.add(i));
  }
  if (sets && m) P.forEach((p, i) => {
    const s = sets![i];
    const het = s.length === 1 && !p.aff && s[0] >= 1;   // unaffected but carries the allele
    if (het) carrier.add(i);
  });

  // generation numerals
  for (let g = 1; g <= ped.gens; g++)
    svgEl("text", { x: 14, y: TOP + S / 2 + (g - 1) * ROW + 8, class: "gen" }, svg).textContent = ["I", "II", "III", "IV"][g - 1];

  // lines: matings, then descent
  const lines = svgEl("g", { stroke: INK, "stroke-width": 2, fill: "none" }, svg);
  for (const c of ped.couples) {
    const [l, r] = [P[c.a], P[c.b]].sort((a, b) => a.x - b.x);
    const y = py(l), x1 = px(l) + S / 2, x2 = px(r) - S / 2;
    if (c.consang) {
      svgEl("line", { x1, x2, y1: y - 3.5, y2: y - 3.5 }, lines);
      svgEl("line", { x1, x2, y1: y + 3.5, y2: y + 3.5 }, lines);
    } else svgEl("line", { x1, x2, y1: y, y2: y }, lines);
    if (!c.kids.length) continue;
    const mx = (px(l) + px(r)) / 2, ys = y + ROW - S / 2 - 26;
    const kx = c.kids.map(k => px(P[k]));
    svgEl("line", { x1: mx, x2: mx, y1: y + (c.consang ? 3.5 : 0), y2: ys }, lines);
    svgEl("line", { x1: Math.min(mx, ...kx), x2: Math.max(mx, ...kx), y1: ys, y2: ys }, lines);
    for (const x of kx) svgEl("line", { x1: x, x2: x, y1: ys, y2: ys + 26 }, lines);
  }

  // symbols
  for (const p of P) {
    const x = px(p), y = py(p), g = svgEl("g", {}, svg);
    if (bad.has(p.id)) {
      const ring = p.sex === "M"
        ? svgEl("rect", { x: x - S / 2 - 7, y: y - S / 2 - 7, width: S + 14, height: S + 14, rx: 4 }, g)
        : svgEl("circle", { cx: x, cy: y, r: S / 2 + 7 }, g);
      ring.setAttribute("fill", "#fde2e2"); ring.setAttribute("stroke", BAD); ring.setAttribute("stroke-width", "4");
    }
    const fill = p.aff ? INK : "#fff";
    const sym = p.sex === "M"
      ? svgEl("rect", { x: x - S / 2, y: y - S / 2, width: S, height: S }, g)
      : svgEl("circle", { cx: x, cy: y, r: S / 2 }, g);
    sym.setAttribute("fill", fill); sym.setAttribute("stroke", INK); sym.setAttribute("stroke-width", "2.2");
    if (carrier.has(p.id)) {   // half-filled: left half
      const half = p.sex === "M"
        ? svgEl("rect", { x: x - S / 2, y: y - S / 2, width: S / 2, height: S }, g)
        : svgEl("path", { d: `M${x},${y - S / 2} A${S / 2},${S / 2} 0 0 0 ${x},${y + S / 2} Z` }, g);
      half.setAttribute("fill", INK);
    }
    if (p.dead) svgEl("line", { x1: x - S / 2 - 6, y1: y + S / 2 + 6, x2: x + S / 2 + 6, y2: y - S / 2 - 6, stroke: INK, "stroke-width": 2.2 }, g);
    if (p.id === ped.proband) {
      const ax = x - S / 2 - 6, ay = y + S / 2 + 4;
      svgEl("line", { x1: ax - 20, y1: ay + 16, x2: ax - 2, y2: ay + 2, stroke: INK, "stroke-width": 2.4 }, g);
      svgEl("path", { d: `M${ax},${ay} l-11,1 l7,8 Z`, fill: INK }, g);
    }
    // ID label at the upper left: clear of the mating line, the descent line and the deceased slash
    svgEl("text", { x: x - S / 2 - 8, y: y - S / 2 - 6, "text-anchor": "end", "font-size": 16, fill: "#555" }, g).textContent = p.label;
    if (sets && m) drawText(g, x, y + S / 2 + 22, genoParts(m, p.sex, sets[p.id]), "geno");
  }
}

function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;
  const fixedMode = MODES.includes(ds.mode as Mode) ? (ds.mode as Mode) : null;
  let seed = Math.max(1, Math.round(Number(ds.seed ?? 1)) || 1);
  let ped: Pedigree;
  const view: View = { test: null, reveal: false };
  const verdict = new Map<Mode, boolean>();

  const ctr = htmlEl("div", "pd-controls", "", host);
  htmlEl("span", "", "Test a mode:", ctr);
  const row = htmlEl("div", "pd-modes", "", ctr);
  const modeBtn = new Map<Mode, HTMLButtonElement>();
  for (const m of MODES) modeBtn.set(m, button(row, MODE_NAME[m], () => { view.test = m; view.reveal = false; update(); }));
  const row2 = htmlEl("div", "pd-modes", "", ctr);
  button(row2, "new pedigree", () => { seed++; fresh(); });
  button(row2, "reveal true mode", () => { view.reveal = true; update(); });

  const svg = svgEl("svg", { role: "img", "aria-label": "Pedigree chart" }, host);
  const msg = htmlEl("div", "pd-msg", "", host);

  function fresh(): void {
    const m = fixedMode ?? MODES[(seed * 2654435761 >>> 0) % 4];
    ped = generate(m, seed);
    view.test = null; view.reveal = false; verdict.clear();
    update();
  }

  function update(): void {
    draw(svg, ped, view);
    if (view.test && !view.reveal) verdict.set(view.test, solve(ped, view.test) !== null);
    if (view.reveal) for (const m of MODES) verdict.set(m, solve(ped, m) !== null);
    for (const [m, b] of modeBtn) {
      b.classList.toggle("active", !view.reveal && view.test === m);
      b.classList.toggle("pd-yes", verdict.get(m) === true);
      b.classList.toggle("pd-no", verdict.get(m) === false);
      b.classList.toggle("pd-true", view.reveal && ped.mode === m);
    }
    msg.replaceChildren();
    const para = (html: string) => { const p = htmlEl("p", "", "", msg); p.innerHTML = html; };
    if (view.reveal) {
      const fits = MODES.filter(m => verdict.get(m)).map(m => MODE_NAME[m]);
      para(`True mode: <b>${MODE_NAME[ped.mode]}</b>. The true genotypes are shown; half-filled = unaffected carrier.`);
      para(fits.length > 1
        ? `Consistent with this pedigree: ${fits.join(", ")}. The pedigree alone cannot decide between them.`
        : `Only this mode is consistent: the pedigree decides it.`);
      return;
    }
    const m = view.test;
    if (!m) {
      para("Click a mode to test it. A mode is <b>consistent</b> if some set of genotypes explains every person; it is <b>ruled out</b> if one family makes it impossible.");
      para("Assumptions: one gene, full penetrance, no new mutations. People who married in may be carriers.");
      return;
    }
    if (verdict.get(m)) {
      para(`<b class="yes">${cap(MODE_NAME[m])}: consistent.</b> The genotypes under the symbols fit everyone (– = either allele); half-filled = obligate carrier.`);
      const sets = possibleGenotypes(ped, m)!;
      const inlaw = ped.people.filter(p => p.father < 0 && p.gen > 1 && !p.aff && sets[p.id].length === 1 && sets[p.id][0] >= 1);
      if (inlaw.length) para(`This fit needs ${inlaw.length === 1 ? "one person" : inlaw.length + " people"} who married into the family (${inlaw.map(p => p.label).join(", ")}) to be ${inlaw.length === 1 ? "a carrier" : "carriers"}. For a rare allele that is unlikely, so weigh this mode against the others.`);
      para("Consistent is not the same as proven: check whether other modes also fit.");
    } else {
      const cs = conflicts(ped, m);
      para(`<b class="no">${cap(MODE_NAME[m])}: ruled out.</b> ${cs.length ? cs[0].why : "No set of genotypes fits everyone."}`);
      if (cs.length > 1) para(`${cs.length - 1} more family${cs.length > 2 ? " trios" : " trio"} also break it (ringed in red).`);
    }
  }

  fresh();
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

autoMount(NAME, mount);
