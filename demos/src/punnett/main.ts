// Punnett square and cross simulator, for one or two genes with complete dominance.
// The user picks each parent's genotype per gene (AA/Aa/aa, BB/Bb/bb). The demo shows
//  - left: each parent's distinct gametes with their frequencies, and the Punnett square
//    (collapsed to the distinct gametes, so 1×1 up to 4×4), cells coloured by phenotype;
//  - right: the genotype and phenotype ratios (as a ratio string and as fractions), and a
//    simulation of N offspring (N = 16, 100, 1000; seeded; "draw again") with observed
//    counts as filled bars next to expected counts as outlined bars.
// Genes are unlinked (independent assortment); linkage comes in Part 2.
//
// Auto-mounts on <div data-demo="punnett">. data-* options (all optional):
//   data-genes="1|2"        number of genes (default 1; a preset overrides it)
//   data-preset="mono|testcross|di|ditestcross"
//   data-n="16|100|1000"    offspring to simulate (default 100)
//   data-classes="phenotype|genotype"   which classes the bars show (default phenotype)
//   data-seed="1"
import { svgEl, htmlEl, button, presets, rng, autoMount } from "../lib/ui";

const NAME = "punnett";
const NS = [16, 100, 1000];
const INK = "#1b2a3a";
// Phenotype colours (strong for bars, light for Punnett cells), indexed by phenotype class:
// 0 = dominant A, dominant B; 1 = dominant A, recessive bb; 2 = aa, dominant B; 3 = aa bb.
const PH_STRONG = ["#2a6f97", "#6a994e", "#d08c2f", "#bc4749"];
const PH_LIGHT = ["#cfe0ec", "#dbe8d1", "#f6e2c2", "#f1d3d3"];

const STYLE = `
[data-demo="${NAME}"] { flex-direction: column; gap: .4em; }
[data-demo="${NAME}"] .pn-row { display: flex; flex-wrap: wrap; gap: .35em 1.1em; align-items: center; }
[data-demo="${NAME}"] .pn-group { display: flex; flex-wrap: wrap; gap: .3em; align-items: center; }
[data-demo="${NAME}"] .pn-group .qb-btn { min-width: 2.6em; }
[data-demo="${NAME}"] .pn-lab { font-weight: 600; }
[data-demo="${NAME}"] .pn-plots { display: flex; flex-wrap: wrap; gap: 12px; width: 100%; }
[data-demo="${NAME}"] .pn-plots svg { min-width: 0; height: auto; }
[data-demo="${NAME}"] .pn-sq { flex: 46 1 300px; max-width: 46%; }
[data-demo="${NAME}"] .pn-res { flex: 60 1 380px; max-width: 54%; }
[data-demo="${NAME}"] svg text { font-size: 17px; fill: ${INK}; }
[data-demo="${NAME}"] svg .ttl { font-size: 19px; font-weight: 600; }
[data-demo="${NAME}"] svg .sm { font-size: 15px; fill: #4a5866; }
[data-demo="${NAME}"] svg .gam { font-size: 19px; font-style: italic; font-weight: 600; }
[data-demo="${NAME}"] svg .geno { font-style: italic; }
[data-demo="${NAME}"] .qb-note { margin: 0; }
.reveal [data-demo="${NAME}"] { font-size: 19px; }
.reveal [data-demo="${NAME}"] .qb-btn { font-size: .85em; padding: .15em .55em; }
.reveal [data-demo="${NAME}"] .qb-note { display: none; }
@media (max-width: 760px) { [data-demo="${NAME}"] .pn-plots svg { max-width: 100%; flex-basis: 100%; } }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

// ---------------- genetics ----------------

/** Genotype of one gene as the number of dominant alleles: 2 = AA, 1 = Aa, 0 = aa. */
type G1 = 0 | 1 | 2;
const SYM = ["A", "B"];

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
function frac(num: number, den: number): string {
  if (num === 0) return "0";
  const g = gcd(num, den);
  return den / g === 1 ? "1" : `${num / g}/${den / g}`;
}

/** Text for a one-gene genotype, e.g. 1 → "Aa". */
function geno1(gene: number, k: G1): string {
  const U = SYM[gene], l = U.toLowerCase();
  return k === 2 ? U + U : k === 1 ? U + l : l + l;
}

/** The two alleles of a one-gene genotype, as 1 (dominant) or 0 (recessive). */
const alleles = (k: G1): [number, number] => (k === 2 ? [1, 1] : k === 1 ? [1, 0] : [0, 0]);

/** Distinct gametes of a parent: list of allele vectors (1 = dominant), all equally frequent. */
function gametes(par: G1[]): number[][] {
  let out: number[][] = [[]];
  for (const k of par) {
    const opts = k === 1 ? [1, 0] : [k === 2 ? 1 : 0];
    out = out.flatMap(g => opts.map(a => [...g, a]));
  }
  return out;
}
const gameteText = (g: number[]): string => g.map((a, i) => (a ? SYM[i] : SYM[i].toLowerCase())).join("");

/** Genotype class index: genes in order, AA < Aa < aa within each gene. */
function genoIndex(ks: number[]): number {
  return ks.reduce((acc, k) => acc * 3 + (2 - k), 0);
}
function genoText(idx: number, ng: number): string {
  const ks: G1[] = [];
  for (let i = ng - 1; i >= 0; i--) { ks[i] = (2 - (idx % 3)) as G1; idx = Math.floor(idx / 3); }
  return ks.map((k, i) => geno1(i, k)).join("");
}
function genoPheno(idx: number, ng: number): number {
  const ks: number[] = [];
  for (let i = ng - 1; i >= 0; i--) { ks[i] = 2 - (idx % 3); idx = Math.floor(idx / 3); }
  return phenoIndex(ks, ng);
}

/** Phenotype class (complete dominance): see PH_STRONG. With one gene: 0 = A_, 3 = aa. */
function phenoIndex(ks: number[], ng: number): number {
  if (ng === 1) return ks[0] > 0 ? 0 : 3;
  const a = ks[0] > 0, b = ks[1] > 0;
  return a ? (b ? 0 : 1) : (b ? 2 : 3);
}
function phenoText(p: number, ng: number): string {
  if (ng === 1) return p === 0 ? "A_" : "aa";
  return ["A_B_", "A_bb", "aaB_", "aabb"][p];
}

interface Expect {
  den: number;                // 4^ng
  geno: Map<number, number>;  // genotype index → count out of den
  pheno: Map<number, number>; // phenotype index → count out of den
}

/** Exact offspring distribution: every combination of one allele from each parent per gene. */
function expectation(p1: G1[], p2: G1[]): Expect {
  const ng = p1.length;
  const geno = new Map<number, number>(), pheno = new Map<number, number>();
  const combos = 4 ** ng;
  for (let c = 0; c < combos; c++) {
    const ks: number[] = [];
    for (let i = 0; i < ng; i++) {
      const bits = (c >> (2 * i)) & 3;
      ks.push(alleles(p1[i])[bits & 1] + alleles(p2[i])[bits >> 1]);
    }
    const gi = genoIndex(ks), pi = phenoIndex(ks, ng);
    geno.set(gi, (geno.get(gi) ?? 0) + 1);
    pheno.set(pi, (pheno.get(pi) ?? 0) + 1);
  }
  return { den: combos, geno, pheno };
}

/** Simulate n offspring: each parent passes one allele per gene, chosen at random. */
function simulate(p1: G1[], p2: G1[], n: number, seed: number) {
  const r = rng(seed);
  const ng = p1.length;
  const geno = new Map<number, number>(), pheno = new Map<number, number>();
  for (let j = 0; j < n; j++) {
    const ks: number[] = [];
    for (let i = 0; i < ng; i++)
      ks.push(alleles(p1[i])[r.unif() < 0.5 ? 0 : 1] + alleles(p2[i])[r.unif() < 0.5 ? 0 : 1]);
    const gi = genoIndex(ks), pi = phenoIndex(ks, ng);
    geno.set(gi, (geno.get(gi) ?? 0) + 1);
    pheno.set(pi, (pheno.get(pi) ?? 0) + 1);
  }
  return { geno, pheno };
}

function ratioString(counts: number[]): string {
  const g = counts.reduce((a, b) => gcd(a, b), 0) || 1;
  return counts.map(c => c / g).join(" : ");
}

// ---------------- presets ----------------

interface State { ng: number; p1: G1[]; p2: G1[]; n: number; seed: number; cls: "phenotype" | "genotype"; }
const PRESETS: Record<string, { label: string; ng: number; p1: G1[]; p2: G1[] }> = {
  mono: { label: "monohybrid F1 × F1", ng: 1, p1: [1, 1], p2: [1, 1] },
  testcross: { label: "testcross", ng: 1, p1: [1, 1], p2: [0, 0] },
  di: { label: "dihybrid F1 × F1", ng: 2, p1: [1, 1], p2: [1, 1] },
  ditestcross: { label: "dihybrid testcross", ng: 2, p1: [1, 1], p2: [0, 0] },
};
const PKEYS = Object.keys(PRESETS);

// ---------------- UI ----------------

/** A row of toggle buttons; exactly one is active. Labels may contain <i>. */
function toggles(parent: Element, labels: string[], active: number, onPick: (i: number) => void): HTMLButtonElement[] {
  const g = htmlEl("span", "pn-group", "", parent);
  const btns: HTMLButtonElement[] = [];
  labels.forEach((lab, i) => {
    const b = button(g, "", () => { set(i); onPick(i); });
    b.innerHTML = lab;
    btns.push(b);
  });
  const set = (i: number) => btns.forEach((x, j) => x.classList.toggle("active", j === i));
  set(active);
  return btns;
}
const setActive = (btns: HTMLButtonElement[], i: number) => btns.forEach((x, j) => x.classList.toggle("active", j === i));

function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;
  const st: State = {
    ng: ds.genes === "2" ? 2 : 1,
    p1: [1, 1], p2: [1, 1],
    n: NS.includes(Number(ds.n)) ? Number(ds.n) : 100,
    seed: Number(ds.seed ?? 1) || 1,
    cls: ds.classes === "genotype" ? "genotype" : "phenotype",
  };
  const startPreset = ds.preset && PRESETS[ds.preset] ? ds.preset : "";
  if (startPreset) applyPresetState(startPreset);

  function applyPresetState(key: string): void {
    const p = PRESETS[key];
    st.ng = p.ng; st.p1 = [...p.p1]; st.p2 = [...p.p2];
  }

  // ---- controls ----
  const row1 = htmlEl("div", "pn-row", "", host);
  const gGenes = htmlEl("span", "pn-group", "", row1);
  htmlEl("span", "pn-lab", "genes:", gGenes);
  const genesBtns = toggles(gGenes, ["1", "2"], st.ng - 1, i => { st.ng = i + 1; clearPreset(); syncGeneB(); draw(); });

  const parentBtns: HTMLButtonElement[][][] = [];
  const geneBGroups: HTMLElement[] = [];
  for (const which of [0, 1]) {
    const grp = htmlEl("span", "pn-group", "", row1);
    htmlEl("span", "pn-lab", which === 0 ? "parent 1:" : "× parent 2:", grp);
    parentBtns[which] = [];
    for (const gene of [0, 1]) {
      const holder = htmlEl("span", "pn-group", "", grp);
      if (gene === 1) geneBGroups.push(holder);
      const par = which === 0 ? st.p1 : st.p2;
      parentBtns[which][gene] = toggles(holder, [2, 1, 0].map(k => `<i>${geno1(gene, k as G1)}</i>`), 2 - par[gene], i => {
        (which === 0 ? st.p1 : st.p2)[gene] = (2 - i) as G1;
        clearPreset(); draw();
      });
    }
  }

  const row2 = htmlEl("div", "pn-row", "", host);
  const pBtns = presets(row2, PKEYS.map(k => ({
    label: PRESETS[k].label,
    apply: () => { applyPresetState(k); syncButtons(); draw(); },
  })));
  if (startPreset) setActive(pBtns, PKEYS.indexOf(startPreset));
  const gN = htmlEl("span", "pn-group", "", row2);
  htmlEl("span", "pn-lab", "simulate N =", gN);
  toggles(gN, NS.map(String), NS.indexOf(st.n), i => { st.n = NS[i]; drawRes(); });
  button(gN, "draw again", () => { st.seed++; drawRes(); });
  const gC = htmlEl("span", "pn-group", "", row2);
  htmlEl("span", "pn-lab", "bars:", gC);
  toggles(gC, ["phenotypes", "genotypes"], st.cls === "phenotype" ? 0 : 1, i => { st.cls = i ? "genotype" : "phenotype"; drawRes(); });

  function clearPreset(): void { pBtns.forEach(b => b.classList.remove("active")); }
  function syncGeneB(): void { geneBGroups.forEach(g => { g.style.display = st.ng === 2 ? "" : "none"; }); }
  function syncButtons(): void {
    setActive(genesBtns, st.ng - 1);
    for (const which of [0, 1]) for (const gene of [0, 1])
      setActive(parentBtns[which][gene], 2 - (which === 0 ? st.p1 : st.p2)[gene]);
    syncGeneB();
  }
  syncButtons();

  const plots = htmlEl("div", "pn-plots", "", host);
  const SW = 470, SH = 430, RW = 610, RH = 430;
  const svgS = svgEl("svg", { viewBox: `0 0 ${SW} ${SH}`, class: "pn-sq", role: "img", "aria-label": "Punnett square" }, plots);
  const svgR = svgEl("svg", { viewBox: `0 0 ${RW} ${RH}`, class: "pn-res", role: "img", "aria-label": "Ratios and simulated offspring" }, plots);
  htmlEl("p", "qb-note",
    "Complete dominance and unlinked genes assumed. Filled bars: simulated offspring; outlined bars: expected counts.", host);

  const cur = () => ({ p1: st.p1.slice(0, st.ng) as G1[], p2: st.p2.slice(0, st.ng) as G1[] });
  const txt = (svg: SVGSVGElement, x: number, y: number, s: string, attrs: Record<string, string | number> = {}) => {
    const t = svgEl("text", { x, y, ...attrs }, svg);
    t.textContent = s;
    return t;
  };

  // ---------------- Punnett square ----------------
  function drawSquare(): void {
    const { p1, p2 } = cur();
    const ng = st.ng;
    const g1 = gametes(p1), g2 = gametes(p2);
    svgS.replaceChildren();
    const gt = (p: G1[]) => p.map((k, i) => geno1(i, k)).join(" ");
    const t = txt(svgS, 8, 24, "", { class: "ttl" });
    const add = (s: string, it: boolean) => { const sp = svgEl("tspan", it ? { "font-style": "italic" } : {}, t); sp.textContent = s; };
    add("Cross: ", false); add(gt(p1), true); add("  ×  ", false); add(gt(p2), true);
    const gl = (g: number[][]) => `${g.length} gamete type${g.length > 1 ? "s" : ""}, ${frac(1, g.length)} each`;
    txt(svgS, 8, 49, `parent 1 (top): ${gl(g1)}`, { class: "sm" });
    txt(svgS, 8, 69, `parent 2 (left): ${gl(g2)}`, { class: "sm" });

    const x0 = 92, y0 = 124, size = Math.min(SW - 8 - x0, SH - 4 - y0);
    // square cells: the grid is (columns × rows) cells of one size
    const cw = size / Math.max(g1.length, g2.length), ch = cw;
    // headers: parent 1 gametes across the top, parent 2 down the left
    g1.forEach((g, j) => {
      const cx = x0 + (j + 0.5) * cw;
      txt(svgS, cx, y0 - 26, gameteText(g), { class: "gam", "text-anchor": "middle" });
      txt(svgS, cx, y0 - 7, frac(1, g1.length), { class: "sm", "text-anchor": "middle" });
    });
    g2.forEach((g, i) => {
      const cy = y0 + (i + 0.5) * ch;
      txt(svgS, x0 - 12, cy - 2, gameteText(g), { class: "gam", "text-anchor": "end" });
      txt(svgS, x0 - 12, cy + 18, frac(1, g2.length), { class: "sm", "text-anchor": "end" });
    });
    const fs = Math.min(22, cw / (ng === 2 ? 3.4 : 2.2));
    g2.forEach((b, i) => g1.forEach((a, j) => {
      const ks = a.map((x, k) => x + b[k]);
      const ph = phenoIndex(ks, ng);
      const x = x0 + j * cw, y = y0 + i * ch;
      svgEl("rect", { x, y, width: cw, height: ch, fill: PH_LIGHT[ph], stroke: "#fff", "stroke-width": 3 }, svgS);
      svgEl("rect", { x: x + 1.5, y: y + 1.5, width: 7, height: ch - 3, fill: PH_STRONG[ph] }, svgS);
      txt(svgS, x + cw / 2 + 3, y + ch / 2 + fs * 0.35, genoText(genoIndex(ks), ng),
        { class: "geno", "text-anchor": "middle", style: `font-size:${fs}px` });
    }));
    svgEl("rect", { x: x0, y: y0, width: cw * g1.length, height: ch * g2.length, fill: "none", stroke: INK, "stroke-width": 1.5 }, svgS);
    txt(svgS, 8, y0 - 26, "gametes", { class: "sm" });
    txt(svgS, 8, y0 - 7, "frequency", { class: "sm" });
  }

  // ---------------- ratios + simulation ----------------
  function drawRes(): void {
    const { p1, p2 } = cur();
    const ng = st.ng;
    const E = expectation(p1, p2);
    const S = simulate(p1, p2, st.n, st.seed);
    svgR.replaceChildren();

    const gKeys = [...E.geno.keys()].sort((a, b) => a - b);
    const pKeys = [...E.pheno.keys()].sort((a, b) => a - b);
    // ratio lines
    const line = (y: number, head: string, keys: number[], m: Map<number, number>, name: (k: number) => string, italic: boolean) => {
      const t = txt(svgR, 8, y, "");
      const h = svgEl("tspan", { "font-weight": 600 }, t); h.textContent = head;
      const r = svgEl("tspan", { "font-weight": 600, fill: "#2a6f97" }, t); r.textContent = ratioString(keys.map(k => m.get(k)!));
      let t2 = txt(svgR, 8, y + 22, "", { class: "sm" });
      const first = t2;
      keys.forEach((k, i) => {
        if (i === 5) t2 = txt(svgR, 8, y + 41, "", { class: "sm" }); // wrap the 9 genotypes
        else if (i) { const s = svgEl("tspan", {}, t2); s.textContent = "  ·  "; }
        const a = svgEl("tspan", italic ? { "font-style": "italic" } : {}, t2); a.textContent = name(k);
        const b = svgEl("tspan", {}, t2); b.textContent = " " + frac(m.get(k)!, E.den);
      });
      return first;
    };
    line(24, `Genotypes (${gKeys.length}):  `, gKeys, E.geno, k => genoText(k, ng), true);
    line(96, `Phenotypes (${pKeys.length}):  `, pKeys, E.pheno, k => phenoText(k, ng), true);

    // bars: observed (filled) next to expected (outlined)
    const keys = st.cls === "phenotype" ? pKeys : gKeys;
    const em = st.cls === "phenotype" ? E.pheno : E.geno;
    const om = st.cls === "phenotype" ? S.pheno : S.geno;
    const col = (k: number) => PH_STRONG[st.cls === "phenotype" ? k : genoPheno(k, ng)];
    const name = (k: number) => (st.cls === "phenotype" ? phenoText(k, ng) : genoText(k, ng));
    const exp = keys.map(k => st.n * em.get(k)! / E.den), obs = keys.map(k => om.get(k) ?? 0);
    const mx = Math.max(...exp, ...obs), step = niceStep(mx / 4), top = Math.ceil(mx / step) * step, nt = Math.round(top / step);
    const L = 64, R = RW - 8, T = 172, B = RH - 70;
    const sy = (v: number) => B - (v / top) * (B - T);
    txt(svgR, 8, 150, `Simulated ${st.n} offspring (seed ${st.seed})`, { class: "ttl" });
    // legend
    const lx = R - 210;
    svgEl("rect", { x: lx, y: 137, width: 14, height: 14, fill: "#7a8794" }, svgR);
    txt(svgR, lx + 19, 150, "observed", { class: "sm" });
    svgEl("rect", { x: lx + 100, y: 137, width: 14, height: 14, fill: "none", stroke: "#7a8794", "stroke-width": 2, "stroke-dasharray": "4 2" }, svgR);
    txt(svgR, lx + 119, 150, "expected", { class: "sm" });
    for (let i = 0; i <= nt; i++) {
      const v = step * i;
      svgEl("line", { x1: L, x2: R, y1: sy(v), y2: sy(v), stroke: i ? "#e3e3e3" : INK, "stroke-width": i ? 1 : 1.5 }, svgR);
      txt(svgR, L - 6, sy(v) + 5, fmt(v), { class: "sm", "text-anchor": "end" });
    }
    const yl = txt(svgR, 16, (T + B) / 2, "offspring", { class: "sm", "text-anchor": "middle", transform: `rotate(-90 16 ${(T + B) / 2})` });
    yl.setAttribute("dy", "4");
    const slot = (R - L) / keys.length, bw = Math.min(44, slot * 0.36);
    const small = keys.length > 4;
    keys.forEach((k, i) => {
      const cx = L + (i + 0.5) * slot;
      svgEl("rect", { x: cx - bw - 1, y: sy(obs[i]), width: bw, height: B - sy(obs[i]), fill: col(k) }, svgR);
      svgEl("rect", { x: cx + 1, y: sy(exp[i]), width: bw, height: B - sy(exp[i]), fill: "none", stroke: col(k), "stroke-width": 2, "stroke-dasharray": "5 3" }, svgR);
      txt(svgR, cx, B + 22, name(k), { "text-anchor": "middle", class: "geno", style: small ? "font-size:15px" : "" });
      txt(svgR, cx, B + 42, String(obs[i]), { "text-anchor": "middle", class: "sm", style: `fill:${col(k)};font-weight:600` + (small ? ";font-size:13px" : "") });
      txt(svgR, cx, B + 60, fmt(exp[i]), { "text-anchor": "middle", class: "sm", style: small ? "font-size:13px" : "" });
    });
    txt(svgR, L - 6, B + 42, "obs", { class: "sm", "text-anchor": "end" });
    txt(svgR, L - 6, B + 60, "exp", { class: "sm", "text-anchor": "end" });
  }

  function draw(): void { drawSquare(); drawRes(); }
  draw();
}

function fmt(v: number): string {
  return String(+v.toFixed(2));
}
function niceStep(x: number): number {
  if (x <= 1) return 1; // counts are whole numbers
  const p = 10 ** Math.floor(Math.log10(x));
  const m = x / p;
  return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
}

autoMount(NAME, mount);
