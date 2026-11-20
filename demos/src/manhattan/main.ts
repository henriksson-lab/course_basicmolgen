// Simulated GWAS: a Manhattan plot and a QQ plot.
// Each dot is one SNP: x = position along the 22 autosomes, y = −log10 p of its test of
// association with a quantitative trait. A few causal loci (triangles under the axis when
// "show causal loci" is on) raise their own SNP and, through linkage disequilibrium, their
// neighbours, which gives the typical "tower". Lines: genome-wide significance 5×10⁻⁸
// (solid red) and the suggestive level 10⁻⁵ (dashed). Sliders: sample size N (log
// scale), effect size β (per allele, in trait SD; odd-numbered loci have β/2), number of
// causal loci. The QQ plot compares the sorted p-values with what pure chance gives.
// Model and its simplifications in model.ts.
//
// Auto-mounts on <div data-demo="manhattan">. data-* options (all optional):
//   data-n="50000"      sample size (1 000 – 1 000 000)
//   data-beta="0.05"    per-allele effect in SD units (0 – 0.2)
//   data-k="5"          number of causal loci (0 – 10)
//   data-seed="1"
//   data-preset="small|medium|large|null"
import { svgEl, htmlEl, slider, button, presets, checkbox, scale, autoMount, Slider } from "../lib/ui";
import {
  makeStudy, scan, loci, countAbove, Study, CHR_MB, CHR_START, GENOME_MB, KMAX,
  LOG10_GW, LOG10_SUGG,
} from "./model";

const NAME = "manhattan";
const INK = "#1b2a3a";
const C_DARK = "#2a6f97", C_LIGHT = "#8fb3cf", C_SIG = "#d08c2f", C_GW = "#bc4749", C_CAUSAL = "#6a994e";

const STYLE = `
[data-demo="${NAME}"] { flex-direction: column; gap: .4em; }
[data-demo="${NAME}"] .mh-controls { display: flex; flex-wrap: wrap; gap: .3em 1.4em; align-items: center; width: 100%; }
[data-demo="${NAME}"] .mh-controls .qb-slider { flex: 1 1 230px; max-width: 330px; }
[data-demo="${NAME}"] .mh-row { display: flex; flex-wrap: wrap; gap: .35em; align-items: center; }
[data-demo="${NAME}"] .mh-plots { display: flex; flex-wrap: wrap; gap: 10px; width: 100%; align-items: flex-start; }
[data-demo="${NAME}"] .mh-man { flex: 3 1 480px; min-width: 0; height: auto; }
[data-demo="${NAME}"] .mh-qq { flex: 1 1 200px; min-width: 0; max-width: 320px; height: auto; }
[data-demo="${NAME}"] svg text { font-size: 17px; fill: ${INK}; }
[data-demo="${NAME}"] svg .tick { font-size: 15px; fill: #4a5866; }
[data-demo="${NAME}"] svg .ttl { font-size: 17px; font-weight: 600; }
[data-demo="${NAME}"] .qb-readout { width: 100%; box-sizing: border-box; }
[data-demo="${NAME}"] .qb-note { margin: 0; }
.reveal [data-demo="${NAME}"] { font-size: 18px; gap: .25em; }
.reveal [data-demo="${NAME}"] .mh-plots { flex-wrap: nowrap; }
.reveal [data-demo="${NAME}"] svg text { font-size: 19px; }
.reveal [data-demo="${NAME}"] svg .tick { font-size: 18px; }
.reveal [data-demo="${NAME}"] .qb-readout { font-size: .78em; padding: .3em .5em; }
.reveal [data-demo="${NAME}"] .qb-note { display: none; }
@media (max-width: 760px) { [data-demo="${NAME}"] .mh-qq { max-width: 60%; } }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

interface State { n: number; beta: number; k: number; seed: number; showCausal: boolean }

const PRESETS: Record<string, Partial<State>> = {
  small: { n: 5000, beta: 0.05, k: 5 },
  medium: { n: 50000, beta: 0.05, k: 5 },
  large: { n: 500000, beta: 0.05, k: 5 },
  null: { n: 50000, beta: 0.05, k: 0 },
};

/** Round to two significant figures, e.g. 10^4.7 = 50119 → 50 000. */
function round2(x: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(x)) - 1);
  return Math.round(x / p) * p;
}
const fmtN = (n: number) => n.toLocaleString("en-US").replace(/,/g, " ");

/** One SVG path that draws many small circles (much faster than thousands of <circle>s). */
function dotsPath(pts: [number, number][], r: number): string {
  const d: string[] = [];
  for (const [x, y] of pts)
    d.push(`M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`);
  return d.join("");
}

function ylog(parent: SVGElement, x: number, y: number, rot: boolean): void {
  const t = svgEl("text", rot
    ? { x: 0, y: 0, "text-anchor": "middle", transform: `translate(${x} ${y}) rotate(-90)` }
    : { x, y, "text-anchor": "middle" }, parent);
  t.append("−log");
  svgEl("tspan", { "baseline-shift": "sub", "font-size": "75%" }, t).textContent = "10";
  t.append(" p");
}

function mount(host: HTMLElement): void {
  injectStyle();
  const num = (k: string, d: number) => {
    const v = Number(host.dataset[k]);
    return host.dataset[k] !== undefined && Number.isFinite(v) ? v : d;
  };
  const init: State = {
    n: Math.min(1e6, Math.max(1000, num("n", 50000))),
    beta: Math.min(0.2, Math.max(0, num("beta", 0.05))),
    k: Math.round(Math.min(KMAX, Math.max(0, num("k", 5)))),
    seed: Math.round(num("seed", 1)),
    showCausal: true,
  };
  const pre = host.dataset.preset && PRESETS[host.dataset.preset];
  if (pre) Object.assign(init, pre);
  const st: State = { ...init };
  let study: Study = makeStudy(st.seed);

  // ---- controls ----
  const ctr = htmlEl("div", "mh-controls", "", host);
  let sN: Slider, sB: Slider, sK: Slider;
  sN = slider(ctr, "sample size N", 3, 6, 0.05, Math.log10(st.n), v => { st.n = round2(Math.pow(10, v)); draw(); },
    v => { const n = round2(Math.pow(10, v)); return n >= 1e6 ? "1 M" : n >= 1e4 ? `${n / 1000}k` : fmtN(n); });
  sB = slider(ctr, "effect β (SD)", 0, 0.2, 0.01, st.beta, v => { st.beta = v; draw(); });
  sK = slider(ctr, "causal loci", 0, KMAX, 1, st.k, v => { st.k = v; draw(); });
  const row = htmlEl("div", "mh-row", "", host);
  const cb = checkbox(row, "show causal loci", st.showCausal, v => { st.showCausal = v; draw(); });
  button(row, "new study", () => { st.seed += 1; study = makeStudy(st.seed); draw(); });
  button(row, "reset", () => { Object.assign(st, init); study = makeStudy(st.seed); sync(); draw(); });
  presets(row, [
    { label: "N = 5 000", apply: () => apply("small") },
    { label: "N = 50 000", apply: () => apply("medium") },
    { label: "N = 500 000", apply: () => apply("large") },
    { label: "null (no causal loci)", apply: () => apply("null") },
  ]);

  // ---- Manhattan plot ----
  const plots = htmlEl("div", "mh-plots", "", host);
  const MW = 900, MH = 340, ML = 68, MR = 12, MT = 14, MB = 56;
  const man = svgEl("svg", { viewBox: `0 0 ${MW} ${MH}`, class: "mh-man", role: "img", "aria-label": "Manhattan plot" }, plots);
  const gx = scale(0, GENOME_MB, ML, MW - MR);
  const manGrid = svgEl("g", {}, man);
  CHR_MB.forEach((len, c) => {
    if (c % 2 === 1) svgEl("rect", { x: gx(CHR_START[c]), y: MT, width: gx(len) - gx(0), height: MH - MT - MB, fill: "#f3f5f7" }, manGrid);
    if (c < 16 || c === 17 || c === 19 || c === 21)
      svgEl("text", { x: gx(CHR_START[c] + len / 2), y: MH - MB + 34, "text-anchor": "middle", class: "tick" }, man).textContent = String(c + 1);
  });
  svgEl("text", { x: (ML + MW - MR) / 2, y: MH - 3, "text-anchor": "middle" }, man).textContent = "chromosome";
  ylog(man, 18, (MT + MH - MB) / 2, true);
  const manAxes = svgEl("g", {}, man);
  const manDots = svgEl("g", {}, man);
  const manLines = svgEl("g", {}, man);
  const manCausal = svgEl("g", {}, man);
  svgEl("line", { x1: ML, x2: MW - MR, y1: MH - MB, y2: MH - MB, class: "axis" }, man);
  svgEl("line", { x1: ML, x2: ML, y1: MT, y2: MH - MB, class: "axis" }, man);

  // ---- QQ plot ----
  const QW = 320, QH = 340, QL = 66, QR = 14, QT = 14, QB = 56;
  const qq = svgEl("svg", { viewBox: `0 0 ${QW} ${QH}`, class: "mh-qq", role: "img", "aria-label": "QQ plot" }, plots);
  const qqAxes = svgEl("g", {}, qq);
  const qqDots = svgEl("g", {}, qq);
  svgEl("text", { x: (QL + QW - QR) / 2, y: QH - 3, "text-anchor": "middle" }, qq).textContent = "expected (chance)";
  ylog(qq, 18, (QT + QH - QB) / 2, true);
  svgEl("text", { x: QL + 8, y: QT + 18, class: "ttl" }, qq).textContent = "QQ plot";

  const out = htmlEl("div", "qb-readout", "", host);
  htmlEl("p", "qb-note",
    "Simulated data: about 8 400 SNPs on 22 autosomes (real GWAS test millions). " +
    "Causal loci 1, 3, 5, … have effect β, loci 2, 4, … have β/2. Triangles under the axis mark the true causal SNPs.", host);

  function apply(k: string): void { Object.assign(st, PRESETS[k]); sync(); draw(); }
  function sync(): void { sN.set(Math.log10(st.n)); sB.set(st.beta); sK.set(st.k); cb.checked = st.showCausal; }

  function draw(): void {
    const ml = scan(study, st.k, st.beta, st.n);
    let mx = 0;
    for (const v of ml) mx = Math.max(mx, v);
    const cap = 40;
    const ymax = Math.min(cap, Math.max(10, Math.ceil(mx + 1)));
    const step = ymax <= 12 ? 2 : ymax <= 25 ? 5 : 10;
    const my = scale(0, ymax, MH - MB, MT);

    manAxes.replaceChildren();
    for (let v = 0; v <= ymax; v += step) {
      svgEl("line", { x1: ML - 5, x2: ML, y1: my(v), y2: my(v), class: "axis" }, manAxes);
      svgEl("text", { x: ML - 8, y: my(v) + 5, "text-anchor": "end", class: "tick" }, manAxes).textContent = String(v);
    }
    // dots, by colour class
    const dark: [number, number][] = [], light: [number, number][] = [], sig: [number, number][] = [], over: [number, number][] = [];
    study.snps.forEach((s, i) => {
      const x = gx(s.g);
      if (ml[i] > ymax) { over.push([x, my(ymax)]); return; }
      const p: [number, number] = [x, my(ml[i])];
      if (ml[i] >= LOG10_GW) sig.push(p);
      else (s.chr % 2 === 0 ? dark : light).push(p);
    });
    manDots.replaceChildren();
    svgEl("path", { d: dotsPath(dark, 2.2), fill: C_DARK }, manDots);
    svgEl("path", { d: dotsPath(light, 2.2), fill: C_LIGHT }, manDots);
    svgEl("path", { d: dotsPath(sig, 3), fill: C_SIG }, manDots);
    for (const [x, y] of over)
      svgEl("path", { d: `M${x} ${y - 8}l6 9h-12z`, fill: C_SIG, stroke: INK, "stroke-width": 0.8 }, manDots);
    // threshold lines
    manLines.replaceChildren();
    svgEl("line", { x1: ML, x2: MW - MR, y1: my(LOG10_GW), y2: my(LOG10_GW), stroke: C_GW, "stroke-width": 2 }, manLines);
    svgEl("line", { x1: ML, x2: MW - MR, y1: my(LOG10_SUGG), y2: my(LOG10_SUGG), stroke: C_GW, "stroke-width": 1.5, "stroke-dasharray": "6 5" }, manLines);
    const crowded = my(LOG10_SUGG) - my(LOG10_GW) < 26;   // lines close together on a tall y axis
    const lab = (y: number, text: string, right: boolean) => {
      const below = !right && crowded;
      const t = svgEl("text", { x: right ? MW - MR - 6 : ML + 6, y: my(y) + (below ? 19 : -6), "text-anchor": right ? "end" : "start", class: "tick" }, manLines);
      t.style.fill = C_GW;
      t.style.stroke = "#fff"; t.style.strokeWidth = "4px"; t.style.paintOrder = "stroke";
      t.textContent = text;
    };
    lab(LOG10_GW, "p = 5×10⁻⁸", true);
    lab(LOG10_SUGG, "p = 10⁻⁵", false);
    // causal loci
    manCausal.replaceChildren();
    if (st.showCausal)
      for (let c = 0; c < st.k; c++) {
        const x = gx(study.causal[c].g), y = MH - MB + 4;
        svgEl("path", { d: `M${x} ${y}l6 11h-12z`, fill: C_CAUSAL }, manCausal);
      }

    // QQ
    const sorted = Array.from(ml).sort((a, b) => b - a);
    const m = sorted.length;
    const exMax = Math.ceil(-Math.log10(0.5 / m) * 2) / 2;
    const qx = scale(0, exMax, QL, QW - QR), qy = scale(0, ymax, QH - QB, QT);
    qqAxes.replaceChildren();
    for (let v = 0; v <= exMax; v += 1) {
      svgEl("line", { x1: qx(v), x2: qx(v), y1: QH - QB, y2: QH - QB + 5, class: "axis" }, qqAxes);
      svgEl("text", { x: qx(v), y: QH - QB + 22, "text-anchor": "middle", class: "tick" }, qqAxes).textContent = String(v);
    }
    for (let v = 0; v <= ymax; v += step) {
      svgEl("line", { x1: QL - 5, x2: QL, y1: qy(v), y2: qy(v), class: "axis" }, qqAxes);
      svgEl("text", { x: QL - 8, y: qy(v) + 5, "text-anchor": "end", class: "tick" }, qqAxes).textContent = String(v);
    }
    svgEl("line", { x1: QL, x2: QW - QR, y1: QH - QB, y2: QH - QB, class: "axis" }, qqAxes);
    svgEl("line", { x1: QL, x2: QL, y1: QT, y2: QH - QB, class: "axis" }, qqAxes);
    svgEl("line", { x1: qx(0), y1: qy(0), x2: qx(exMax), y2: qy(Math.min(exMax, ymax)), stroke: "#888", "stroke-width": 1.5, "stroke-dasharray": "5 4" }, qqAxes);
    const qpts: [number, number][] = [], qsig: [number, number][] = [];
    for (let i = 0; i < m; i++) {
      const e = -Math.log10((i + 0.5) / m);
      const o = Math.min(sorted[i], ymax);
      (sorted[i] >= LOG10_GW ? qsig : qpts).push([qx(e), qy(o)]);
    }
    qqDots.replaceChildren();
    svgEl("path", { d: dotsPath(qpts, 2.2), fill: C_DARK }, qqDots);
    svgEl("path", { d: dotsPath(qsig, 3), fill: C_SIG }, qqDots);

    // readout
    const hits = loci(study, ml, st.k);
    const found = new Set(hits.filter(h => h.causal >= 0).map(h => h.causal));
    const falseHits = hits.filter(h => h.causal < 0).length;
    const list = Array.from({ length: st.k }, (_, c) => c)
      .sort((a, b) => study.causal[a].g - study.causal[b].g)
      .map(c => `chr${study.causal[c].chr + 1}${study.causal[c].half ? " (β/2)" : ""} ${found.has(c) ? "found" : "missed"}`).join(", ");
    out.textContent =
      `N = ${fmtN(st.n)}, β = ${st.beta.toFixed(2)}: ${countAbove(ml, LOG10_GW)} SNPs with p < 5×10⁻⁸ in ${hits.length} loci` +
      ` (${found.size} of ${st.k} causal loci found${falseHits ? `, ${falseHits} false` : ""}); ` +
      `${countAbove(ml, LOG10_SUGG)} SNPs with p < 10⁻⁵.` +
      (st.k ? `\nCausal: ${list}` : "");
  }
  draw();
}

autoMount(NAME, mount);
