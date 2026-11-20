// Crossover: why recombination frequency (RF) saturates at 0.5.
// Left: one bivalent at the four-strand stage (two blue sister chromatids from one parent,
// two red from the other), with 2–4 loci A, B, C, D at equal spacing. "1 meiosis" places
// crossovers at random: their number is Poisson with mean 2·L (L = segment length in
// Morgans, so each chromatid gets on average L crossovers), positions uniform, and each
// crossover joins one random blue and one random red chromatid (no interference). Below,
// the four products (gametes) are drawn spliced blue/red, with their alleles and whether
// they are recombinant for the outermost pair of loci.
// Right: RF against map distance. Haldane's curve RF = ½(1 − e^(−2d)) is what this model
// predicts; the dashed line RF = d is what you would see if double crossovers never
// happened. Orange points: the RF observed so far for every pair of loci. "simulate the
// curve" adds grey points from 500 meioses at each distance 5…200 cM.
//
// Auto-mounts on <div data-demo="crossover">. data-* options (all optional):
//   data-loci="2|3|4"     number of loci (default 3)
//   data-spacing="20"     distance between neighbouring loci in cM (1–80, default 20)
//   data-seed="1"
import { svgEl, htmlEl, button, slider, rng, autoMount } from "../lib/ui";

const NAME = "crossover";
const INK = "#1b2a3a", MUTED = "#5b6b7a", BLUE = "#2a6f97", RED = "#bc4749";
const ORANGE = "#d08c2f", GREY = "#9aa5b1";
const LETTERS = ["A", "B", "C", "D"];

const STYLE = `
[data-demo="${NAME}"] { flex-direction: column; gap: .4em; }
[data-demo="${NAME}"] .co-row { display: flex; flex-wrap: wrap; gap: .35em 1.1em; align-items: center; }
[data-demo="${NAME}"] .co-group { display: flex; flex-wrap: wrap; gap: .3em; align-items: center; }
[data-demo="${NAME}"] .co-lab { font-weight: 600; }
[data-demo="${NAME}"] .qb-slider { min-width: 300px; }
[data-demo="${NAME}"] .co-plots { display: flex; flex-wrap: wrap; gap: 12px; width: 100%; }
[data-demo="${NAME}"] .co-plots svg { min-width: 0; height: auto; }
[data-demo="${NAME}"] .co-biv { flex: 56 1 320px; max-width: 56%; }
[data-demo="${NAME}"] .co-plot { flex: 44 1 280px; max-width: 44%; }
@media (max-width: 640px) { [data-demo="${NAME}"] .co-plots svg { max-width: 100%; flex-basis: 100%; } }
[data-demo="${NAME}"] svg text { font-size: 17px; fill: ${INK}; }
[data-demo="${NAME}"] svg .ttl { font-size: 18px; font-weight: 600; }
[data-demo="${NAME}"] svg .sm { font-size: 15px; fill: ${MUTED}; }
[data-demo="${NAME}"] svg .al { font-size: 17px; font-style: italic; font-weight: 700; }
[data-demo="${NAME}"] .co-table { border-collapse: collapse; font-size: .9em; }
[data-demo="${NAME}"] .co-table td, [data-demo="${NAME}"] .co-table th { padding: .1em .7em; text-align: right; }
[data-demo="${NAME}"] .co-table th { font-weight: 600; border-bottom: 1px solid #bbb; }
[data-demo="${NAME}"] .co-table td:first-child, [data-demo="${NAME}"] .co-table th:first-child { text-align: left; }
[data-demo="${NAME}"] .co-info { display: flex; flex-wrap: wrap; gap: .4em 1.6em; align-items: flex-start; }
[data-demo="${NAME}"] .qb-note { margin: 0; }
.reveal [data-demo="${NAME}"] { font-size: 18px; gap: .25em; }
.reveal [data-demo="${NAME}"] .qb-btn { font-size: .85em; padding: .15em .55em; }
.reveal [data-demo="${NAME}"] .qb-note { display: none; }
.reveal [data-demo="${NAME}"] .co-table { font-size: 15px; }
.reveal [data-demo="${NAME}"] .co-plots svg { max-height: 385px; }
.reveal [data-demo="${NAME}"] .co-plots { justify-content: center; }
.reveal [data-demo="${NAME}"] .co-info { flex-wrap: nowrap; justify-content: center; }
.reveal [data-demo="${NAME}"] .qb-readout { font-size: 14px; padding: .3em .5em; }

`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

// ---------------- model ----------------

type Rand = () => number;

/** Poisson random number (Knuth's method; fine for small means). */
function poisson(mean: number, u: Rand): number {
  const L = Math.exp(-mean);
  let k = 0, p = 1;
  do { k++; p *= u(); } while (p > L);
  return k - 1;
}

interface Crossover { pos: number; i: number; j: number }       // pos in cM; chromatids i (blue), j (red)
interface Segment { from: number; to: number; blue: boolean }
interface Meiosis { xos: Crossover[]; products: Segment[][] }

/** One meiosis on a segment of `len` cM. Chromatids 0,1 are blue (sisters), 2,3 red. */
function meiosis(len: number, u: Rand): Meiosis {
  const n = poisson(2 * len / 100, u);
  const xos: Crossover[] = [];
  for (let k = 0; k < n; k++) xos.push({ pos: u() * len, i: u() < 0.5 ? 0 : 1, j: u() < 0.5 ? 2 : 3 });
  xos.sort((a, b) => a.pos - b.pos);
  // at[k] = the chromatid position product k runs along, right of the current point. A crossover
  // between positions i and j moves a strand from one to the other; positions 0,1 are blue.
  const at = [0, 1, 2, 3];
  const products: Segment[][] = [[], [], [], []];
  let start = 0;
  const close = (end: number) => {
    for (let k = 0; k < 4; k++) {
      const blue = at[k] < 2, segs = products[k], last = segs[segs.length - 1];
      if (last && last.blue === blue) last.to = end; else segs.push({ from: start, to: end, blue });
    }
    start = end;
  };
  for (const x of xos) { close(x.pos); for (let k = 0; k < 4; k++) at[k] = at[k] === x.i ? x.j : at[k] === x.j ? x.i : at[k]; }
  close(len);
  return { xos, products };
}

/** Is a product blue (parent 1) at position x? */
const blueAt = (segs: Segment[], x: number) => (segs.find(s => x >= s.from && x <= s.to) ?? segs[0]).blue;

const haldane = (dcm: number) => 0.5 * (1 - Math.exp(-2 * dcm / 100));

// ---------------- demo ----------------

interface PairStat { a: number; b: number; rec: number; tot: number }

function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;
  const clampInt = (v: number, lo: number, hi: number, def: number) =>
    Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : def;
  const st = {
    nLoci: clampInt(Number(ds.loci), 2, 4, 3),
    spacing: clampInt(Number(ds.spacing), 1, 80, 20),
    seed: clampInt(Number(ds.seed ?? 1), 1, 1e9, 1),
    curve: false,
  };
  let rand = rng(st.seed).unif;
  let last: Meiosis | null = null;
  let nMeioses = 0;
  let xoCounts = [0, 0, 0, 0];       // meioses with 0, 1, 2, ≥3 crossovers between the outer loci
  let pairs: PairStat[] = [];
  let curvePts: [number, number][] = [];

  // ---- controls ----
  const row1 = htmlEl("div", "co-row", "", host);
  const gL = htmlEl("span", "co-group", "", row1);
  htmlEl("span", "co-lab", "loci:", gL);
  const lociBtns = [2, 3, 4].map(k => button(gL, String(k), () => { st.nLoci = k; reset(); }));
  slider(row1, "spacing (cM)", 1, 80, 1, st.spacing, v => { st.spacing = v; reset(); });

  const row2 = htmlEl("div", "co-row", "", host);
  const gM = htmlEl("span", "co-group", "", row2);
  button(gM, "1 meiosis", () => run(1));
  button(gM, "+100 meioses", () => run(100));
  button(gM, "+1000", () => run(1000));
  button(gM, "reset", () => reset());
  const curveBtn = button(row2, "simulate the curve", () => {
    st.curve = !st.curve;
    curveBtn.classList.toggle("active", st.curve);
    if (st.curve && !curvePts.length) simulateCurve();
    drawPlot();
  });

  const plots = htmlEl("div", "co-plots", "", host);
  const BW = 600, BH = 370, PW = 470, PH = 370;
  const svgB = svgEl("svg", { viewBox: `0 0 ${BW} ${BH}`, class: "co-biv", role: "img", "aria-label": "Bivalent with crossovers and the four products" }, plots);
  const svgP = svgEl("svg", { viewBox: `0 0 ${PW} ${PH}`, class: "co-plot", role: "img", "aria-label": "Recombination frequency against map distance" }, plots);
  const info = htmlEl("div", "co-info", "", host);
  htmlEl("p", "qb-note",
    "Model: crossovers at random positions (Poisson), each between one random blue and one random red chromatid; no interference. Blue alleles A B C D come from one parent, red a b c d from the other.", host);

  const txt = (svg: SVGSVGElement, x: number, y: number, s: string, attrs: Record<string, string | number> = {}) => {
    const t = svgEl("text", { x, y, ...attrs }, svg);
    t.textContent = s;
    return t;
  };

  function reset(): void {
    rand = rng(st.seed).unif;
    last = null; nMeioses = 0; xoCounts = [0, 0, 0, 0];
    pairs = [];
    for (let a = 0; a < st.nLoci; a++) for (let b = a + 1; b < st.nLoci; b++) pairs.push({ a, b, rec: 0, tot: 0 });
    lociBtns.forEach((b, k) => b.classList.toggle("active", k + 2 === st.nLoci));
    draw();
  }

  const len = () => st.spacing * (st.nLoci - 1);
  const locusPos = (k: number) => k * st.spacing;

  function run(n: number): void {
    for (let r = 0; r < n; r++) {
      const m = meiosis(len(), rand);
      last = m; nMeioses++;
      xoCounts[Math.min(3, m.xos.length)]++;
      for (const p of pairs) for (const prod of m.products) {
        p.tot++;
        if (blueAt(prod, locusPos(p.a)) !== blueAt(prod, locusPos(p.b))) p.rec++;
      }
    }
    draw();
  }

  function simulateCurve(): void {
    const u = rng(st.seed + 1000).unif;
    curvePts = [];
    for (let d = 5; d <= 200; d += 5) {
      let rec = 0;
      for (let r = 0; r < 500; r++) for (const prod of meiosis(d, u).products)
        if (blueAt(prod, 0) !== blueAt(prod, d)) rec++;
      curvePts.push([d, rec / 2000]);
    }
  }

  function draw(): void { drawBivalent(); drawPlot(); drawInfo(); }

  // ---------------- left: bivalent and products ----------------
  function drawBivalent(): void {
    svgB.replaceChildren();
    const X0 = 70, X1 = 540;
    const L = len();
    const xs = (cm: number) => X0 + (cm / L) * (X1 - X0);
    const CY = [62, 78, 102, 118];      // chromatid centre lines
    const H = 10;
    txt(svgB, 10, 22, "Prophase I: one bivalent, four chromatids", { class: "ttl" });

    // locus guide lines and labels
    for (let k = 0; k < st.nLoci; k++) {
      const x = xs(locusPos(k));
      svgEl("line", { x1: x, x2: x, y1: 42, y2: 312, stroke: "#d5dbe1", "stroke-width": 1.5, "stroke-dasharray": "4 4" }, svgB);
      txt(svgB, x, 48, LETTERS[k], { "text-anchor": "middle", class: "al", fill: BLUE, style: `fill:${BLUE}` });
    }
    // chromatids
    for (let c = 0; c < 4; c++) {
      svgEl("rect", { x: X0 - 22, y: CY[c] - H / 2, width: X1 - X0 + 44, height: H, rx: 5, fill: c < 2 ? BLUE : RED }, svgB);
      txt(svgB, X0 - 30, CY[c] + 5, String(c + 1), { "text-anchor": "end", class: "sm" });
    }
    // lower-case labels below the red pair
    for (let k = 0; k < st.nLoci; k++)
      txt(svgB, xs(locusPos(k)), 142, LETTERS[k].toLowerCase(), { "text-anchor": "middle", class: "al", style: `fill:${RED}` });
    // crossovers
    if (last) for (const x of last.xos) {
      const px = xs(x.pos), yi = CY[x.i], yj = CY[x.j];
      const g = svgEl("g", { stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svgB);
      svgEl("line", { x1: px - 9, y1: yi, x2: px + 9, y2: yj }, g);
      svgEl("line", { x1: px - 9, y1: yj, x2: px + 9, y2: yi }, g);
    }

    // products
    txt(svgB, 10, 172, last
      ? `The 4 products (gametes) of this meiosis. ${last.xos.length} crossover${last.xos.length === 1 ? "" : "s"}.`
      : "Press “1 meiosis” to place crossovers.", { class: "sm" });
    const a = 0, b = st.nLoci - 1;
    txt(svgB, X1 + 46, 172, `${LETTERS[a]}–${LETTERS[b]}`, { "text-anchor": "middle", class: "sm" });
    if (!last) return;
    for (let k = 0; k < 4; k++) {
      const y = 206 + 36 * k;
      for (const s of last.products[k])
        svgEl("rect", { x: xs(s.from) - (s.from === 0 ? 22 : 0), y, width: xs(s.to) - xs(s.from) + (s.from === 0 ? 22 : 0) + (s.to === L ? 22 : 0), height: H, fill: s.blue ? BLUE : RED }, svgB);
      for (let l = 0; l < st.nLoci; l++) {
        const bl = blueAt(last.products[k], locusPos(l));
        txt(svgB, xs(locusPos(l)), y - 4, bl ? LETTERS[l] : LETTERS[l].toLowerCase(), { "text-anchor": "middle", class: "al", style: `fill:${bl ? BLUE : RED}` });
      }
      const rec = blueAt(last.products[k], locusPos(a)) !== blueAt(last.products[k], locusPos(b));
      txt(svgB, X1 + 46, y + 10, rec ? "R" : "P", { "text-anchor": "middle", "font-weight": 700, style: `fill:${rec ? ORANGE : MUTED}` });
    }
    txt(svgB, 10, 352, "P = parental, R = recombinant for the outer loci", { class: "sm" });
  }

  // ---------------- right: RF against distance ----------------
  function drawPlot(): void {
    svgP.replaceChildren();
    const L = 62, R = 455, T = 34, B = 306;
    const DMAX = 200, YMAX = 0.6;
    const sx = (d: number) => L + (d / DMAX) * (R - L);
    const sy = (r: number) => B - (r / YMAX) * (B - T);
    txt(svgP, L, 20, "RF against map distance", { class: "ttl" });
    // grid and axes
    for (let r = 0; r <= YMAX + 1e-9; r += 0.1) {
      svgEl("line", { x1: L, x2: R, y1: sy(r), y2: sy(r), stroke: "#e3e3e3" }, svgP);
      txt(svgP, L - 8, sy(r) + 5, r.toFixed(1), { "text-anchor": "end", class: "sm" });
    }
    for (let d = 0; d <= DMAX; d += 50) txt(svgP, sx(d), B + 20, String(d), { "text-anchor": "middle", class: "sm" });
    svgEl("line", { x1: L, x2: R, y1: B, y2: B, stroke: "#444" }, svgP);
    svgEl("line", { x1: L, x2: L, y1: T, y2: B, stroke: "#444" }, svgP);
    txt(svgP, (L + R) / 2, B + 44, "map distance d (cM)", { "text-anchor": "middle", class: "sm" });
    const yl = txt(svgP, 18, (T + B) / 2, "recombination frequency", { "text-anchor": "middle", class: "sm" });
    yl.setAttribute("transform", `rotate(-90 18 ${(T + B) / 2})`);
    // RF = 0.5 line
    svgEl("line", { x1: L, x2: R, y1: sy(0.5), y2: sy(0.5), stroke: INK, "stroke-width": 1.2, "stroke-dasharray": "2 4" }, svgP);
    // RF = d line (clipped at YMAX)
    svgEl("line", { x1: sx(0), y1: sy(0), x2: sx(YMAX * 100), y2: sy(YMAX), stroke: MUTED, "stroke-width": 2, "stroke-dasharray": "7 5" }, svgP);
    // Haldane
    let path = "";
    for (let d = 0; d <= DMAX; d += 2) path += (d ? "L" : "M") + sx(d).toFixed(1) + "," + sy(haldane(d)).toFixed(1);
    svgEl("path", { d: path, fill: "none", stroke: BLUE, "stroke-width": 3 }, svgP);
    // simulated curve
    if (st.curve) for (const [d, r] of curvePts) svgEl("circle", { cx: sx(d), cy: sy(r), r: 4, fill: GREY }, svgP);
    // the user's loci
    for (const p of pairs) if (p.tot) {
      const d = locusPos(p.b) - locusPos(p.a);
      if (d > DMAX) continue;
      svgEl("circle", { cx: sx(d), cy: sy(p.rec / p.tot), r: 7, fill: ORANGE, stroke: "#fff", "stroke-width": 1.5 }, svgP);
    }
    // legend, lower right (empty region under the curve)
    const lx = 250, ly = 196;
    const leg: [string, (y: number) => void][] = [
      ["Haldane", y => svgEl("line", { x1: lx, x2: lx + 28, y1: y, y2: y, stroke: BLUE, "stroke-width": 3 }, svgP)],
      ["RF = d (no doubles)", y => svgEl("line", { x1: lx, x2: lx + 28, y1: y, y2: y, stroke: MUTED, "stroke-width": 2, "stroke-dasharray": "7 5" }, svgP)],
      ["your loci", y => svgEl("circle", { cx: lx + 14, cy: y, r: 6, fill: ORANGE }, svgP)],
      ["simulated curve", y => svgEl("circle", { cx: lx + 14, cy: y, r: 4, fill: GREY }, svgP)],
    ];
    leg.forEach(([label, mark], k) => { const y = ly + 22 * k; mark(y); txt(svgP, lx + 36, y + 5, label, { class: "sm" }); });
  }

  // ---------------- readout ----------------
  function drawInfo(): void {
    info.replaceChildren();
    const tab = htmlEl("table", "co-table", "", info);
    const hr = htmlEl("tr", "", "", tab);
    for (const h of ["loci", "d (cM)", "observed RF", "Haldane", "d / 100"]) htmlEl("th", "", h, hr);
    for (const p of pairs) {
      const d = locusPos(p.b) - locusPos(p.a);
      const tr = htmlEl("tr", "", "", tab);
      htmlEl("td", "", `${LETTERS[p.a]}–${LETTERS[p.b]}`, tr);
      htmlEl("td", "", String(d), tr);
      htmlEl("td", "", p.tot ? `${(p.rec / p.tot).toFixed(3)} (${p.rec}/${p.tot})` : "–", tr);
      htmlEl("td", "", haldane(d).toFixed(3), tr);
      htmlEl("td", "", (d / 100).toFixed(2), tr);
    }
    const box = htmlEl("div", "qb-readout", "", info);
    const a = LETTERS[0], b = LETTERS[st.nLoci - 1];
    box.textContent = nMeioses
      ? `${nMeioses} meioses, ${4 * nMeioses} gametes.\nCrossovers between ${a} and ${b} per meiosis:\n` +
        `0: ${xoCounts[0]}   1: ${xoCounts[1]}   2: ${xoCounts[2]}   ≥3: ${xoCounts[3]}`
      : `No meioses yet. ${a}–${b} = ${len()} cM: on average ${(2 * len() / 100).toFixed(2)} crossovers per bivalent.`;
  }

  reset();
}

autoMount(NAME, mount);
