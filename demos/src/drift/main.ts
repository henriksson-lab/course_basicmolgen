// Genetic drift and selection in replicate Wright–Fisher populations.
// Each line is one population of N diploid individuals: the frequency p of allele A over
// the generations. Lines are coloured by fate at the end: fixed (p = 1), lost (p = 0) or
// still segregating. The thick dashed line is the deterministic (infinite-N) trajectory,
// i.e. selection alone. Fitnesses: wAA = 1 + s, wAa = 1 + h·s, waa = 1.
// The readout counts fixed / lost / segregating populations, compares the fraction fixed
// with the neutral expectation p0, the mean heterozygosity with H0(1 − 1/2N)^t, and shows
// the equilibrium p̂ under heterozygote advantage.
//
// Auto-mounts on <div data-demo="drift">. data-* options (all optional):
//   data-n="50"  data-s="0"  data-h="0.5"  data-p0="0.5"  data-reps="20"  data-gens="100"
//   data-seed="1"
//   data-preset="drift20|drift500|selection|newmut|sickle|bottleneck"
import { svgEl, htmlEl, button, presets, slider, scale, autoMount, Slider } from "../lib/ui";
import { Params, fitness, simulate, deterministic, hetAdvantageEq, summarise } from "./model";

const NAME = "drift";
const INK = "#1b2a3a";
const NSTEPS = [10, 20, 50, 100, 200, 500, 1000, 5000];
const COL = { fixed: "#2a6f97", lost: "#bc4749", seg: "#8a8f96" };

const STYLE = `
[data-demo="${NAME}"] { gap: 1em; }
[data-demo="${NAME}"] .qb-plot { flex: 1 1 420px; max-width: 640px; }
[data-demo="${NAME}"] .qb-plot svg { width: 100%; height: auto; }
[data-demo="${NAME}"] .qb-panel { flex: 0 1 330px; gap: .4em; }
[data-demo="${NAME}"] svg text { font-size: 18px; fill: ${INK}; }
[data-demo="${NAME}"] svg .ttl { font-size: 19px; font-weight: 600; }
[data-demo="${NAME}"] svg .tick { font-size: 16px; fill: #4a5866; }
[data-demo="${NAME}"] .dr-fit { font-family: ui-monospace, monospace; font-size: .88em; }
[data-demo="${NAME}"] .dr-btns { display: flex; flex-wrap: wrap; gap: .35em; }
[data-demo="${NAME}"] .dr-legend { display: flex; flex-wrap: wrap; gap: .2em .9em; font-size: .85em; }
[data-demo="${NAME}"] .dr-legend span::before { content: ""; display: inline-block; width: 1.1em; height: .25em;
  vertical-align: middle; margin-right: .3em; background: var(--c); }
[data-demo="${NAME}"] .qb-readout { font-size: .85em; }
[data-demo="${NAME}"] .qb-note { margin: 0; }
.reveal [data-demo="${NAME}"] { font-size: 18px; gap: .6em; }
.reveal [data-demo="${NAME}"] .qb-plot { flex: 1 1 600px; max-width: 690px; }
.reveal [data-demo="${NAME}"] .qb-panel { flex: 0 1 420px; gap: .2em; }
.reveal [data-demo="${NAME}"] .qb-btn { font-size: .78em; padding: .1em .45em; }
.reveal [data-demo="${NAME}"] .qb-note { display: none; }
.reveal [data-demo="${NAME}"] .qb-readout { font-size: .72em; padding: .3em .5em; line-height: 1.25; }
.reveal [data-demo="${NAME}"] .qb-slider { font-size: .9em; }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

interface PresetDef { key: string; label: string; P: Partial<Params>; newMut?: boolean }
const PRESETS: PresetDef[] = [
  { key: "drift20", label: "drift, N = 20", P: { N: 20, s: 0, h: 0.5, p0: 0.5, reps: 20, gens: 100 } },
  { key: "drift500", label: "drift, N = 500", P: { N: 500, s: 0, h: 0.5, p0: 0.5, reps: 20, gens: 100 } },
  { key: "selection", label: "selection s = 0.05", P: { N: 500, s: 0.05, h: 0.5, p0: 0.1, reps: 20, gens: 200 } },
  { key: "newmut", label: "new beneficial mutation", P: { N: 500, s: 0.05, h: 0.5, reps: 100, gens: 500 }, newMut: true },
  { key: "sickle", label: "sickle cell / malaria", P: { N: 500, s: -0.8, h: -0.2, p0: 0.02, reps: 20, gens: 300 } },
  { key: "bottleneck", label: "founders, N = 10", P: { N: 10, s: 0, h: 0.5, p0: 0.1, reps: 50, gens: 50 } },
];

function num(v: string | undefined, d: number): number {
  const x = v === undefined ? NaN : Number(v);
  return Number.isFinite(x) ? x : d;
}
const nearestStep = (n: number) =>
  NSTEPS.reduce((b, v, i) => (Math.abs(v - n) < Math.abs(NSTEPS[b] - n) ? i : b), 0);
const f2 = (v: number) => v.toFixed(2);

function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;
  const init: Params = {
    N: NSTEPS[nearestStep(num(ds.n, 50))],
    s: num(ds.s, 0), h: num(ds.h, 0.5), p0: num(ds.p0, 0.5),
    reps: Math.round(num(ds.reps, 20)), gens: Math.round(num(ds.gens, 100)),
    seed: Math.round(num(ds.seed, 1)),
  };
  let initNewMut = false;
  const pre0 = PRESETS.find(p => p.key === ds.preset);
  if (pre0) {
    Object.assign(init, pre0.P);
    if (pre0.newMut) { initNewMut = true; init.p0 = 1 / (2 * init.N); }
  }
  const P: Params = { ...init };
  let newMut = initNewMut;   // p0 follows 1/2N while true

  // ---------- plot ----------
  const W = 680, H = 470, m = { l: 84, r: 16, t: 40, b: 58 };
  const plotDiv = htmlEl("div", "qb-plot", "", host);
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }, plotDiv);
  const gAxes = svgEl("g", {}, svg);
  const gLines = svgEl("g", {}, svg);
  const gDet = svgEl("g", {}, svg);
  const title = svgEl("text", { x: m.l, y: 26, class: "ttl" }, svg);

  // ---------- panel ----------
  const panel = htmlEl("div", "qb-panel", "", host);
  presets(panel, PRESETS.map(pr => ({
    label: pr.label,
    apply: () => {
      Object.assign(P, pr.P);
      newMut = !!pr.newMut;
      if (newMut) P.p0 = 1 / (2 * P.N);
      P.seed = init.seed;
      syncSliders(); draw();
    },
  })));

  const sN: Slider = slider(panel, "N (individuals)", 0, NSTEPS.length - 1, 1, nearestStep(P.N), v => {
    P.N = NSTEPS[v];
    if (newMut) { P.p0 = 1 / (2 * P.N); sP.set(P.p0); }
    draw();
  }, v => String(NSTEPS[v]));
  const sS = slider(panel, "s", -1, 0.5, 0.01, P.s, v => { P.s = v; draw(); });
  const sH = slider(panel, "h", -1, 2, 0.05, P.h, v => { P.h = v; draw(); });
  const fitLine = htmlEl("div", "dr-fit", "", panel);
  const sP = slider(panel, "start p", 0, 1, 0.01, P.p0, v => { P.p0 = v; newMut = false; draw(); },
    v => (v > 0 && v < 0.01 ? v.toFixed(4) : v.toFixed(2)));
  const sR = slider(panel, "populations", 1, 100, 1, P.reps, v => { P.reps = v; draw(); });
  const sG = slider(panel, "generations", 50, 1000, 10, P.gens, v => { P.gens = v; draw(); });

  const btns = htmlEl("div", "dr-btns", "", panel);
  button(btns, "one new mutation (p = 1/2N)", () => {
    newMut = true; P.p0 = 1 / (2 * P.N); sP.set(P.p0); draw();
  });
  button(btns, "run again", () => { P.seed++; draw(); });
  button(btns, "reset", () => {
    Object.assign(P, init); newMut = initNewMut; syncSliders(); draw();
  });

  const legend = htmlEl("div", "dr-legend", "", panel);
  for (const [k, lab] of [["fixed", "fixed"], ["lost", "lost"], ["seg", "segregating"]] as const) {
    const sp = htmlEl("span", "", lab, legend);
    sp.style.setProperty("--c", COL[k]);
  }
  const det = htmlEl("span", "", "selection only (N = ∞)", legend);
  det.style.setProperty("--c", INK);

  const readout = htmlEl("div", "qb-readout", "", panel);
  htmlEl("p", "qb-note",
    "Each line is one population. Fitness: wAA = 1 + s, wAa = 1 + hs, waa = 1. Same seed, same lines; \"run again\" draws new ones.",
    panel);

  function syncSliders(): void {
    sN.set(nearestStep(P.N)); sS.set(P.s); sH.set(P.h); sP.set(P.p0); sR.set(P.reps); sG.set(P.gens);
  }

  function draw(): void {
    const x = scale(0, P.gens, m.l, W - m.r);
    const y = scale(0, 1, H - m.b, m.t);
    const w = fitness(P.s, P.h);
    fitLine.textContent = `wAA = ${f2(w.wAA)}   wAa = ${f2(w.wAa)}   waa = ${f2(w.waa)}`;

    // axes
    gAxes.innerHTML = "";
    for (let i = 0; i <= 4; i++) {
      const v = i / 4, yy = y(v);
      svgEl("line", { x1: m.l, x2: W - m.r, y1: yy, y2: yy, class: "grid" }, gAxes);
      svgEl("text", { x: m.l - 8, y: yy + 5, "text-anchor": "end", class: "tick" }, gAxes).textContent = String(v);
    }
    const step = niceStep(P.gens);
    for (let g = 0; g <= P.gens + 1e-9; g += step) {
      const xx = x(g);
      svgEl("line", { x1: xx, x2: xx, y1: H - m.b, y2: H - m.b + 6, class: "axis" }, gAxes);
      svgEl("text", { x: xx, y: H - m.b + 24, "text-anchor": "middle", class: "tick" }, gAxes).textContent = String(g);
    }
    svgEl("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: "axis" }, gAxes);
    svgEl("line", { x1: m.l, x2: m.l, y1: m.t, y2: H - m.b, class: "axis" }, gAxes);
    svgEl("text", { x: (m.l + W - m.r) / 2, y: H - 10, "text-anchor": "middle" }, gAxes).textContent = "generation";
    svgEl("text", {
      x: 0, y: 0, "text-anchor": "middle",
      transform: `translate(20 ${(m.t + H - m.b) / 2}) rotate(-90)`,
    }, gAxes).textContent = "frequency p of allele A";

    // simulated lines
    const trs = simulate(P);
    gLines.innerHTML = "";
    const thin = P.gens > 400 ? 2 : 1;
    const opacity = P.reps > 50 ? 0.35 : P.reps > 20 ? 0.5 : 0.7;
    for (const tr of trs) {
      const end = tr[tr.length - 1];
      const col = end >= 1 ? COL.fixed : end <= 0 ? COL.lost : COL.seg;
      // stop the line shortly after it hits 0 or 1, so absorbed lines do not pile up at the edge
      let last = tr.length - 1;
      for (let t = 0; t < tr.length; t++) if (tr[t] <= 0 || tr[t] >= 1) { last = t; break; }
      const pts: string[] = [];
      for (let t = 0; t <= last; t += thin) pts.push(`${x(t).toFixed(1)},${y(tr[t]).toFixed(1)}`);
      if (last % thin) pts.push(`${x(last).toFixed(1)},${y(tr[last]).toFixed(1)}`);
      svgEl("polyline", {
        points: pts.join(" "), fill: "none", stroke: col, "stroke-width": 2,
        "stroke-opacity": opacity, "stroke-linejoin": "round",
      }, gLines);
    }

    // deterministic trajectory
    gDet.innerHTML = "";
    const d = deterministic(P);
    const dp: string[] = [];
    for (let t = 0; t < d.length; t += thin) dp.push(`${x(t).toFixed(1)},${y(d[t]).toFixed(1)}`);
    svgEl("polyline", {
      points: dp.join(" "), fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-dasharray": "9 6",
    }, gDet);
    const eq = hetAdvantageEq(w);
    if (eq !== null) {
      svgEl("line", { x1: m.l, x2: W - m.r, y1: y(eq), y2: y(eq), stroke: "#d08c2f", "stroke-width": 2, "stroke-dasharray": "3 4" }, gDet);
      const ly = eq > 0.85 ? y(eq) + 34 : y(eq) - 26;
      svgEl("text", {
        x: W - m.r - 6, y: ly, "text-anchor": "end", style: "fill:#a8680f; font-weight:600",
        stroke: "#fff", "stroke-width": 5, "paint-order": "stroke", "stroke-linejoin": "round",
      }, gDet).textContent = `p̂ = ${eq.toFixed(3)}`;
    }

    title.textContent = `${P.reps} population${P.reps > 1 ? "s" : ""} of N = ${P.N}  (2N = ${2 * P.N} copies)`;

    // readout
    const S = summarise(P, trs);
    const lines = [
      `at generation ${P.gens}:`,
      `fixed ${S.fixed} · lost ${S.lost} · segregating ${S.seg}`,
      `fraction fixed ${(S.fixed / P.reps).toFixed(2)}` +
        (P.s === 0 ? `  (neutral: p0 = ${fmtP(P.p0)})` : ""),
      `mean p ${S.meanP.toFixed(3)}  (N = ∞: ${d[d.length - 1].toFixed(3)})`,
      `mean H = 2pq ${S.meanH.toFixed(3)}` +
        (P.s === 0 ? `\n  drift theory H0(1−1/2N)^t = ${S.expH.toFixed(3)}` : ""),
    ];
    if (eq !== null) lines.push(`heterozygote advantage: p̂ = ${eq.toFixed(3)}`);
    readout.textContent = lines.join("\n");
  }

  draw();
}

function fmtP(p: number): string { return p > 0 && p < 0.01 ? p.toFixed(4) : p.toFixed(2); }

function niceStep(g: number): number {
  for (const s of [10, 20, 25, 50, 100, 200, 250]) if (g / s <= 6) return s;
  return 500;
}

autoMount(NAME, mount);
