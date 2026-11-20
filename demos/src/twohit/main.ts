// Knudson's two-hit model (retinoblastoma, RB1). Two groups of people are simulated:
//  - "inherited first hit": a germline RB1 mutation, so every retinal lineage already has
//    one hit and needs only one more;
//  - "sporadic": both RB1 alleles must be hit in the same lineage.
// Each person has n lineages at risk (half per eye); each allele is hit at rate u per year.
// Left: cumulative fraction of people with >= 1 tumour against age, in three views:
//   "fraction with tumour" (linear), "log-log" (one hit -> slope 1, two hits -> slope 2)
//   and "Knudson's plot" (log of the fraction of cases not yet diagnosed, as in 1971).
// Dashed lines are the expected curves. Right: tumours per person, both groups.
// The rates are exaggerated so that sporadic cases appear among 1000 people.
//
// Auto-mounts on <div data-demo="twohit">. data-* options (all optional):
//   data-n="200"        lineages (cells) at risk per person (snapped to the slider steps)
//   data-u="0.0015"     hit rate per allele per year (snapped to the slider steps)
//   data-t="10"         age range in years (5-60)
//   data-people="1000"  people per group
//   data-seed="1"
//   data-preset="default|rarer|morecells"
//   data-view="linear|loglog|knudson"
import { svgEl, htmlEl, slider, button, presets, checkbox, rng, scale, autoMount } from "../lib/ui";
import { simulateGroup, summarise, empiricalCdf, theoryCdf, HIST_MAX, Summary } from "./model";

const NAME = "twohit";
const INK = "#1b2a3a";
const COL_INH = "#bc4749";   // inherited first hit
const COL_SPO = "#2a6f97";   // sporadic
const N_VALUES = [20, 50, 100, 200, 400, 800, 1000, 2000];
const U_VALUES = [0.0002, 0.0003, 0.0005, 0.00075, 0.001, 0.0015, 0.002, 0.003, 0.005, 0.0075, 0.01];

interface Preset { key: string; label: string; n: number; u: number; t: number }
const PRESETS: Preset[] = [
  { key: "default", label: "default", n: 200, u: 0.0015, t: 10 },
  { key: "rarer", label: "rarer hits (u ÷ 2)", n: 200, u: 0.00075, t: 10 },
  { key: "morecells", label: "more cells (n × 4)", n: 800, u: 0.0015, t: 10 },
];
type View = "linear" | "loglog" | "knudson";

const STYLE = `
[data-demo="${NAME}"] { flex-direction: column; gap: .4em; }
[data-demo="${NAME}"] .th-row { display: flex; flex-wrap: wrap; gap: .35em 1.2em; align-items: center; width: 100%; }
[data-demo="${NAME}"] .th-row .qb-slider { flex: 1 1 250px; }
[data-demo="${NAME}"] .th-group { display: flex; flex-wrap: wrap; gap: .3em; align-items: center; }
[data-demo="${NAME}"] .th-lab { font-weight: 600; }
[data-demo="${NAME}"] .th-plots { display: flex; flex-wrap: wrap; gap: 12px; width: 100%; }
[data-demo="${NAME}"] .th-plots svg { flex: 1 1 380px; min-width: 0; max-width: calc(50% - 6px); height: auto; }
[data-demo="${NAME}"] svg text { font-size: 17px; fill: ${INK}; }
[data-demo="${NAME}"] svg .ttl { font-size: 19px; font-weight: 600; }
[data-demo="${NAME}"] svg .sm { font-size: 15px; fill: #4a5866; }
[data-demo="${NAME}"] svg .lab { font-size: 17px; font-weight: 600; }
[data-demo="${NAME}"] table.th-tab { border-collapse: collapse; font-size: .92em; }
[data-demo="${NAME}"] table.th-tab td, [data-demo="${NAME}"] table.th-tab th { padding: .12em .7em; text-align: right; border-bottom: 1px solid #e3e3e3; }
[data-demo="${NAME}"] table.th-tab th { font-weight: 600; }
[data-demo="${NAME}"] table.th-tab td:first-child, [data-demo="${NAME}"] table.th-tab th:first-child { text-align: left; }
[data-demo="${NAME}"] .qb-note { margin: 0; }
.reveal [data-demo="${NAME}"] { font-size: 18px; gap: .25em; }
.reveal [data-demo="${NAME}"] .qb-btn { font-size: .85em; padding: .12em .5em; }
.reveal [data-demo="${NAME}"] .qb-note { display: none; }
.reveal [data-demo="${NAME}"] svg text { font-size: 18px; }
.reveal [data-demo="${NAME}"] svg .sm { font-size: 16px; }
@media (max-width: 760px) { [data-demo="${NAME}"] .th-plots svg { max-width: 100%; flex-basis: 100%; } }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

const nearestIndex = (vals: number[], v: number) =>
  vals.reduce((best, x, i) => (Math.abs(Math.log(x / v)) < Math.abs(Math.log(vals[best] / v)) ? i : best), 0);
const pct = (x: number) => (100 * x).toFixed(x < 0.1 && x > 0 ? 1 : 0) + "%";

// ---------------- plot geometry ----------------
const W = 560, H = 350;
const PL = 74, PR = 18, PT = 36, PB = 60;
const X0 = PL, X1 = W - PR, Y0 = H - PB, Y1 = PT;

function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;
  const people = Math.max(50, Math.min(5000, Number(ds.people) || 1000));
  const seed0 = Number(ds.seed) || 1;
  const pre = PRESETS.find(p => p.key === ds.preset) ?? PRESETS[0];
  const init = {
    n: ds.n ? Number(ds.n) : pre.n,
    u: ds.u ? Number(ds.u) : pre.u,
    t: ds.t ? Math.max(5, Math.min(60, Math.round(Number(ds.t)))) : pre.t,
  };
  let nIdx = nearestIndex(N_VALUES, init.n);
  let uIdx = nearestIndex(U_VALUES, init.u);
  let T = init.t;
  let seed = seed0;
  let view: View = (["linear", "loglog", "knudson"] as View[]).find(v => v === ds.view) ?? "linear";
  let showTheory = true;
  let inh: Summary, spo: Summary;

  // ---- controls ----
  const row1 = htmlEl("div", "th-row", "", host);
  const sN = slider(row1, "cells at risk n", 0, N_VALUES.length - 1, 1, nIdx,
    v => { nIdx = v; resim(); }, v => String(N_VALUES[v]));
  const sU = slider(row1, "hit rate u /allele/yr", 0, U_VALUES.length - 1, 1, uIdx,
    v => { uIdx = v; resim(); }, v => String(U_VALUES[v]));
  const sT = slider(row1, "age T (years)", 5, 60, 1, T, v => { T = v; resim(); });

  const row2 = htmlEl("div", "th-row", "", host);
  const g1 = htmlEl("div", "th-group", "", row2);
  htmlEl("span", "th-lab", "view:", g1);
  const viewBtns = presets(g1, [
    { label: "fraction with tumour", apply: () => { view = "linear"; draw(); } },
    { label: "log–log", apply: () => { view = "loglog"; draw(); } },
    { label: "Knudson's plot", apply: () => { view = "knudson"; draw(); } },
  ]);
  viewBtns[["linear", "loglog", "knudson"].indexOf(view)].classList.add("active");
  checkbox(row2, "expected (dashed)", showTheory, v => { showTheory = v; draw(); });

  const row3 = htmlEl("div", "th-row", "", host);
  const g2 = htmlEl("div", "th-group", "", row3);
  htmlEl("span", "th-lab", "presets:", g2);
  const preBtns = presets(g2, PRESETS.map(p => ({ label: p.label, apply: () => applyPreset(p) })));
  if (ds.preset) preBtns[PRESETS.indexOf(pre)].classList.add("active");
  button(g2, "new sample", () => { seed++; resim(); });
  button(g2, "reset", () => {
    seed = seed0; view = "linear";
    viewBtns.forEach((b, i) => b.classList.toggle("active", i === 0));
    preBtns.forEach(b => b.classList.remove("active"));
    applyPreset(pre);
  });

  const plots = htmlEl("div", "th-plots", "", host);
  const svgL = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }, plots);
  const svgR = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }, plots);
  const tab = htmlEl("table", "th-tab", "", host);
  htmlEl("p", "qb-note",
    `${people} people per group. Rates are exaggerated so that sporadic cases show up in a sample this small: ` +
    "a real retina has about a million retinoblasts, and real mutation rates are far lower. " +
    "Dashed lines: the expected curves. Tumours are split between the eyes, half of the lineages in each.", host);

  function applyPreset(p: Preset): void {
    nIdx = nearestIndex(N_VALUES, p.n); uIdx = nearestIndex(U_VALUES, p.u); T = p.t;
    sN.set(nIdx); sU.set(uIdx); sT.set(T);
    resim();
  }

  function resim(): void {
    const r = rng(seed);
    const n = N_VALUES[nIdx], u = U_VALUES[uIdx];
    inh = summarise(simulateGroup(true, n, u, T, people, r.unif));
    spo = summarise(simulateGroup(false, n, u, T, people, r.unif));
    draw();
  }

  // ---------------- drawing ----------------
  function axisText(svg: SVGSVGElement, x: number, y: number, s: string, anchor = "middle", cls = "") {
    const t = svgEl("text", { x, y, "text-anchor": anchor }, svg);
    if (cls) t.setAttribute("class", cls);
    t.textContent = s;
    return t;
  }

  function drawLeft(): void {
    const svg = svgL;
    svg.innerHTML = "";
    const n = N_VALUES[nIdx], u = U_VALUES[uIdx];
    const NG = 240;
    // scales and value transforms per view
    let xs: (v: number) => number, ys: (v: number) => number;
    let xGrid: number[] = [];
    let ticksX: { v: number; s: string }[], ticksY: { v: number; s: string }[];
    let yTitle: string, xTitle = "age (years)";
    let title: string;
    let empY: (s: Summary, t: number) => number;
    let thY: (inherited: boolean, t: number) => number;
    const tMin = T / 100;

    if (view === "loglog") {
      const sx = scale(Math.log10(tMin), Math.log10(T), X0, X1), sy = scale(-4, 0, Y0, Y1);
      xs = v => sx(Math.log10(v)); ys = v => sy(Math.max(-4, Math.log10(v)));
      for (let i = 0; i <= NG; i++) xGrid.push(tMin * Math.pow(T / tMin, i / NG));
      ticksX = [];
      for (let k = -2; k <= 2; k++) for (const m of [1, 2, 5]) {
        const v = m * Math.pow(10, k);
        if (v >= tMin * 0.999 && v <= T * 1.001) ticksX.push({ v, s: String(+v.toPrecision(2)) });
      }
      ticksY = [1e-4, 1e-3, 1e-2, 1e-1, 1].map(v => ({ v, s: v >= 0.01 ? String(v) : v === 1e-3 ? "0.001" : "0.0001" }));
      yTitle = "fraction with tumour (log)";
      xTitle = "age (years, log)";
      title = "Log–log: the slope counts the hits";
      empY = (s, t) => empiricalCdf(s, t);
      thY = (inh, t) => theoryCdf(inh, n, u, t);
    } else if (view === "knudson") {
      const sx = scale(0, T, X0, X1), sy = scale(-2, 0, Y0, Y1);
      xs = sx; ys = v => sy(Math.max(-2, Math.log10(v)));
      for (let i = 0; i <= NG; i++) xGrid.push(T * i / NG);
      ticksX = niceTicks(T).map(v => ({ v, s: String(v) }));
      ticksY = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1].map(v => ({ v, s: String(v) }));
      yTitle = "cases not yet diagnosed (log)";
      title = "Knudson's plot: among cases by age T";
      empY = (s, t) => s.ages.length ? 1 - empiricalCdf(s, t) * s.people / s.ages.length : 0;
      thY = (inh, t) => { const FT = theoryCdf(inh, n, u, T); return FT > 0 ? (FT - theoryCdf(inh, n, u, t)) / FT : 0; };
    } else {
      const sx = scale(0, T, X0, X1), sy = scale(0, 1, Y0, Y1);
      xs = sx; ys = v => sy(v);
      for (let i = 0; i <= NG; i++) xGrid.push(T * i / NG);
      ticksX = niceTicks(T).map(v => ({ v, s: String(v) }));
      ticksY = [0, 0.25, 0.5, 0.75, 1].map(v => ({ v, s: String(v) }));
      yTitle = "fraction with a tumour";
      title = "People with ≥ 1 tumour, by age";
      empY = (s, t) => empiricalCdf(s, t);
      thY = (inh, t) => theoryCdf(inh, n, u, t);
    }

    // grid, ticks
    for (const tk of ticksY) {
      const y = ys(tk.v);
      svgEl("line", { x1: X0, x2: X1, y1: y, y2: y, class: "grid" }, svg);
      axisText(svg, X0 - 7, y + 5, tk.s, "end", "sm");
    }
    for (const tk of ticksX) {
      const x = xs(tk.v);
      svgEl("line", { x1: x, x2: x, y1: Y0, y2: Y0 + 5, class: "axis" }, svg);
      axisText(svg, x, Y0 + 22, tk.s, "middle", "sm");
    }
    svgEl("line", { x1: X0, x2: X1, y1: Y0, y2: Y0, class: "axis" }, svg);
    svgEl("line", { x1: X0, x2: X0, y1: Y0, y2: Y1, class: "axis" }, svg);
    axisText(svg, (X0 + X1) / 2, H - 12, xTitle);
    const yt = axisText(svg, 0, 0, yTitle);
    yt.setAttribute("transform", `translate(20 ${(Y0 + Y1) / 2}) rotate(-90)`);
    axisText(svg, X0, 22, title, "start", "ttl");

    // curves: keep points with a finite, positive value on log views
    const logView = view !== "linear";
    const path = (f: (t: number) => number) => {
      let d = "", pen = false;
      for (const t of xGrid) {
        const v = f(t);
        if (logView && !(v >= (view === "loglog" ? 1e-4 : 0.01))) { pen = false; continue; }
        d += (pen ? "L" : "M") + xs(t).toFixed(1) + "," + ys(v).toFixed(1);
        pen = true;
      }
      return d;
    };
    const groups: { s: Summary; inh: boolean; col: string; name: string }[] = [
      { s: inh, inh: true, col: COL_INH, name: "inherited first hit" },
      { s: spo, inh: false, col: COL_SPO, name: "sporadic" },
    ];
    for (const g of groups) {
      if (showTheory)
        svgEl("path", { d: path(t => thY(g.inh, t)), fill: "none", stroke: g.col, "stroke-width": 2, "stroke-dasharray": "6 5", opacity: 0.75 }, svg);
      svgEl("path", { d: path(t => empY(g.s, t)), fill: "none", stroke: g.col, "stroke-width": 3 }, svg);
    }

    // direct labels, placed in the empty space next to each curve (with a white halo)
    const vAt = (inhG: boolean, t: number) => {
      const g = inhG ? groups[0] : groups[1];
      const v = showTheory ? thY(inhG, t) : empY(g.s, t);
      return ys(logView ? Math.max(v, view === "loglog" ? 1e-4 : 0.01) : v);
    };
    const clampY = (y: number) => Math.max(Y1 + 16, Math.min(Y0 - 8, y));
    let li: [number, number, string], lp: [number, number, string];
    if (view === "knudson") {
      // inherited falls away from 1 at once: its lower-left corner is empty
      li = [X0 + 8, Y0 - 12, "start"];
      // sporadic stays high for long: label just below it, at mid-age
      lp = [xs(T * 0.42), clampY(vAt(false, T * 0.42) + 26), "start"];
      if (Math.abs(lp[1] - li[1]) < 22) lp[1] = li[1] - 24;
    } else {
      // both curves rise and the inherited one is concave: the space below its right half is empty
      const tMid = view === "loglog" ? Math.sqrt(T * T / 10) : T * 0.5;
      li = [X1 - 4, clampY(vAt(true, tMid) + 30), "end"];
      // sporadic is convex: the space above its right end is empty
      lp = [X1 - 4, clampY(vAt(false, T) - 12), "end"];
      if (lp[1] - li[1] < 24) lp[1] = li[1] + 24;
      if (lp[1] > Y0 - 8) { lp[1] = Y0 - 8; li[1] = Math.min(li[1], lp[1] - 24); }
    }
    for (const [pos, g] of [[li, groups[0]], [lp, groups[1]]] as [[number, number, string], typeof groups[0]][]) {
      const t = axisText(svg, pos[0], pos[1], g.name, pos[2], "lab");
      t.style.fill = g.col;
      t.setAttribute("stroke", "#fff"); t.setAttribute("stroke-width", "5");
      t.setAttribute("paint-order", "stroke"); t.setAttribute("stroke-linejoin", "round");
    }
  }

  function drawRight(): void {
    const svg = svgR;
    svg.innerHTML = "";
    const sx = scale(0, HIST_MAX + 1, X0, X1), sy = scale(0, 1, Y0, Y1);
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      const y = sy(v);
      svgEl("line", { x1: X0, x2: X1, y1: y, y2: y, class: "grid" }, svg);
      axisText(svg, X0 - 7, y + 5, String(v), "end", "sm");
    }
    const bw = (sx(1) - sx(0)) * 0.36;
    for (let k = 0; k <= HIST_MAX; k++) {
      const cx = sx(k + 0.5);
      [inh, spo].forEach((s, i) => {
        const y = sy(s.hist[k]);
        svgEl("rect", { x: cx - bw + i * bw, y, width: bw - 1, height: Math.max(0, Y0 - y), fill: i ? COL_SPO : COL_INH }, svg);
      });
      axisText(svg, cx, Y0 + 22, k === HIST_MAX ? "≥" + HIST_MAX : String(k), "middle", "sm");
    }
    svgEl("line", { x1: X0, x2: X1, y1: Y0, y2: Y0, class: "axis" }, svg);
    svgEl("line", { x1: X0, x2: X0, y1: Y0, y2: Y1, class: "axis" }, svg);
    axisText(svg, (X0 + X1) / 2, H - 12, `tumours per person by age ${T}`);
    const yt = axisText(svg, 0, 0, "fraction of people");
    yt.setAttribute("transform", `translate(20 ${(Y0 + Y1) / 2}) rotate(-90)`);
    axisText(svg, X0, 22, "Number of tumours", "start", "ttl");
    // legend, top right inside the plot
    const lx = X1 - 196;
    [["inherited first hit", COL_INH], ["sporadic", COL_SPO]].forEach(([s, c], i) => {
      const y = Y1 + 20 + i * 24;
      svgEl("rect", { x: lx, y: y - 13, width: 16, height: 16, fill: c }, svg);
      axisText(svg, lx + 24, y, s, "start");
    });
  }

  function drawTable(): void {
    tab.innerHTML = "";
    const hr = htmlEl("tr", "", "", tab);
    for (const h of ["", `tumour by age ${T}`, "tumours per affected", "bilateral (of affected)", "median age at 1st tumour"])
      htmlEl("th", "", h, hr);
    ([["inherited first hit", inh, COL_INH], ["sporadic", spo, COL_SPO]] as [string, Summary, string][]).forEach(([name, s, c]) => {
      const tr = htmlEl("tr", "", "", tab);
      const td = htmlEl("td", "", name, tr); td.style.color = c; td.style.fontWeight = "600";
      htmlEl("td", "", pct(s.fracAffected), tr);
      htmlEl("td", "", s.ages.length ? s.meanTumoursAffected.toFixed(2) : "–", tr);
      htmlEl("td", "", s.ages.length ? pct(s.fracBilateral) : "–", tr);
      htmlEl("td", "", s.ages.length ? s.medianAge.toFixed(1) + " yr" : "–", tr);
    });
  }

  function draw(): void { drawLeft(); drawRight(); drawTable(); }

  applyPreset({ key: "init", label: "", n: N_VALUES[nIdx], u: U_VALUES[uIdx], t: T });
}

function niceTicks(T: number): number[] {
  const step = T <= 10 ? 2 : T <= 20 ? 5 : T <= 40 ? 10 : 20;
  const out: number[] = [];
  for (let v = 0; v <= T + 1e-9; v += step) out.push(v);
  return out;
}

autoMount(NAME, mount);
