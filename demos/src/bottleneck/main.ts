// The mitochondrial bottleneck. A mother carries a mtDNA variant at heteroplasmy level h
// (the fraction of her mtDNA copies that are mutant). While her oocytes develop, only N
// mtDNA copies make it through the germline bottleneck; they are then amplified back up.
// Model: each oocyte draws k ~ Binomial(N, h) mutant copies, and its heteroplasmy is k / N.
// The demo shows a histogram of offspring (oocyte) heteroplasmy for many oocytes, with
//  - the mother's level as a dashed line,
//  - a disease threshold line (slider, or drag the handle on the plot): bars at or above
//    it are red, below it blue,
//  - a readout of the fraction at or above the threshold (simulated and exact binomial),
//    the mean, and the spread (SD and variance) against the expected h(1 − h)/N.
// Seeded: the same settings and seed give the same histogram; "draw again" adds 1 to the seed.
//
// Auto-mounts on <div data-demo="bottleneck">. data-* options (all optional):
//   data-h="30"           mother's heteroplasmy, percent (0–100)
//   data-n="20"           bottleneck size N, mtDNA copies (1–200)
//   data-oocytes="200"    number of oocytes (offspring) to simulate (10–1000)
//   data-threshold="60"   disease threshold, percent (multiple of 5)
//   data-preset="melas|tight|wide|high|homoplasmic"   overrides h, n and threshold
//   data-seed="1"
import { svgEl, setAttrs, htmlEl, button, presets, slider, draggable, svgPoint, rng, autoMount } from "../lib/ui";

const NAME = "bottleneck";
const INK = "#1b2a3a";
const BLUE = "#2a6f97";
const RED = "#bc4749";
const MUTED = "#4a5866";

const STYLE = `
[data-demo="${NAME}"] { flex-direction: column; gap: .45em; }
[data-demo="${NAME}"] .bn-row { display: flex; flex-wrap: wrap; gap: .35em 1.1em; align-items: center; }
[data-demo="${NAME}"] .bn-sliders { display: grid; grid-template-columns: repeat(2, minmax(240px, 1fr)); gap: .3em 1.6em; width: 100%; }
[data-demo="${NAME}"] .bn-sliders .qb-slider { grid-template-columns: 11.5em 1fr 4.2em; }
[data-demo="${NAME}"] svg.bn-plot { width: 100%; height: auto; }
[data-demo="${NAME}"] svg text { font-size: 19px; fill: ${INK}; }
[data-demo="${NAME}"] svg .ttl { font-size: 21px; font-weight: 600; }
[data-demo="${NAME}"] svg .sm { font-size: 18px; fill: ${MUTED}; }
[data-demo="${NAME}"] svg .big { font-size: 26px; font-weight: 700; }
[data-demo="${NAME}"] .qb-note { margin: 0; }
.reveal [data-demo="${NAME}"] { font-size: 19px; gap: .25em; }
.reveal [data-demo="${NAME}"] .qb-btn { font-size: .85em; padding: .15em .55em; }
.reveal [data-demo="${NAME}"] .qb-note { display: none; }
@media (max-width: 760px) { [data-demo="${NAME}"] .bn-sliders { grid-template-columns: 1fr; } }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

// ---------------- model ----------------

/** Heteroplasmy (0–1) of each of `m` oocytes: k ~ Binomial(N, h), level k / N. */
export function simulate(h: number, N: number, m: number, seed: number): number[] {
  const r = rng(seed);
  const out: number[] = [];
  for (let j = 0; j < m; j++) {
    let k = 0;
    for (let i = 0; i < N; i++) if (r.unif() < h) k++;
    out.push(k / N);
  }
  return out;
}

/** Exact P(K / N >= t) for K ~ Binomial(N, h). */
export function pAtLeast(h: number, N: number, t: number): number {
  const kmin = Math.ceil(t * N - 1e-9);
  let p = 0;
  for (let k = Math.max(0, kmin); k <= N; k++) p += binom(N, k, h);
  return Math.min(1, p);
}
function binom(n: number, k: number, p: number): number {
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  let lc = 0;
  for (let i = 1; i <= k; i++) lc += Math.log(n - k + i) - Math.log(i);
  return Math.exp(lc + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

// ---------------- presets ----------------

interface P { label: string; h: number; n: number; t: number }
const PRESETS: Record<string, P> = {
  melas: { label: "MELAS-like, 30 %", h: 30, n: 20, t: 60 },
  tight: { label: "tight: N = 5", h: 30, n: 5, t: 60 },
  wide: { label: "wide: N = 200", h: 30, n: 200, t: 60 },
  high: { label: "mother 70 %", h: 70, n: 20, t: 60 },
  homoplasmic: { label: "homoplasmic", h: 100, n: 20, t: 60 },
};
const PKEYS = Object.keys(PRESETS);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const num = (s: string | undefined, d: number) => (s !== undefined && s.trim() !== "" && Number.isFinite(Number(s)) ? Number(s) : d);

function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;
  const init = {
    h: clamp(Math.round(num(ds.h, 30)), 0, 100),
    n: clamp(Math.round(num(ds.n, 20)), 1, 200),
    m: clamp(Math.round(num(ds.oocytes, 200) / 10) * 10, 10, 1000),
    t: clamp(Math.round(num(ds.threshold, 60) / 5) * 5, 5, 100),
    seed: Math.max(1, Math.round(num(ds.seed, 1))),
  };
  const startPreset = ds.preset && PRESETS[ds.preset] ? ds.preset : "";
  if (startPreset) { const p = PRESETS[startPreset]; init.h = p.h; init.n = p.n; init.t = p.t; }
  const st = { ...init };

  // ---- controls ----
  const row1 = htmlEl("div", "bn-row", "", host);
  const pBtns = presets(row1, PKEYS.map(k => ({
    label: PRESETS[k].label,
    apply: () => { const p = PRESETS[k]; st.h = p.h; st.n = p.n; st.t = p.t; st.seed = init.seed; syncSliders(); draw(); },
  })));
  if (startPreset) pBtns[PKEYS.indexOf(startPreset)].classList.add("active");
  button(row1, "draw again", () => { st.seed++; draw(); });
  button(row1, "reset", () => {
    Object.assign(st, init);
    pBtns.forEach((b, i) => b.classList.toggle("active", PKEYS[i] === startPreset));
    syncSliders(); draw();
  });

  const grid = htmlEl("div", "bn-sliders", "", host);
  const clearPreset = () => pBtns.forEach(b => b.classList.remove("active"));
  const sH = slider(grid, "mother's level h", 0, 100, 1, st.h, v => { st.h = v; clearPreset(); draw(); }, v => `${v} %`);
  const sN = slider(grid, "bottleneck N", 1, 200, 1, st.n, v => { st.n = v; clearPreset(); draw(); }, v => String(v));
  const sM = slider(grid, "oocytes", 10, 1000, 10, st.m, v => { st.m = v; draw(); }, v => String(v));
  const sT = slider(grid, "disease threshold", 5, 100, 5, st.t, v => { st.t = v; draw(); }, v => `${v} %`);
  function syncSliders(): void { sH.set(st.h); sN.set(st.n); sM.set(st.m); sT.set(st.t); }

  const W = 1000, H = 430;
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "bn-plot", role: "img", "aria-label": "Histogram of offspring heteroplasmy" }, host);
  htmlEl("p", "qb-note",
    "Each oocyte receives N mtDNA copies drawn at random from the mother's pool (binomial sampling), " +
    "which are then amplified, so its level is k / N. Drag the red handle, or use the slider, to move the threshold.", host);

  // plot geometry
  const L = 78, R = 660, T = 46, B = H - 74;
  const NB = 20; // 5 % bins
  const sx = (v: number) => L + v * (R - L);
  // `dyn` is redrawn on every change; the threshold line and its handle persist, so a drag
  // keeps its pointer capture while the histogram updates underneath.
  const dyn = svgEl("g", {}, svg);
  const thr = svgEl("g", {}, svg);
  const tLine = svgEl("line", { y1: T - 6, y2: B, stroke: RED, "stroke-width": 3 }, thr);
  const tLab = svgEl("text", { y: T + 46, class: "sm", style: `fill:${RED}` }, thr);
  tLab.textContent = "threshold";
  const handle = svgEl("circle", { cy: B, r: 11, fill: "#fff", stroke: RED, "stroke-width": 3 }, thr);
  draggable(handle, ev => svgPoint(svg, ev), x => {
    const v = clamp(Math.round(((x - L) / (R - L)) * 20) * 5, 5, 100);
    if (v !== st.t) { st.t = v; sT.set(v); draw(); }
  });
  const txt = (x: number, y: number, s: string, attrs: Record<string, string | number> = {}) => {
    const e = svgEl("text", { x, y, ...attrs }, dyn);
    e.textContent = s;
    return e;
  };

  function draw(): void {
    const h = st.h / 100, N = st.n, t = st.t / 100;
    const lv = simulate(h, N, st.m, st.seed);
    const counts = new Array(NB).fill(0);
    for (const v of lv) counts[Math.min(NB - 1, Math.floor(v * NB + 1e-9))]++;
    const mean = lv.reduce((a, b) => a + b, 0) / lv.length;
    const vr = lv.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, lv.length - 1);
    const vExp = h * (1 - h) / N;
    const above = lv.filter(v => v >= t - 1e-9).length;
    const pExact = pAtLeast(h, N, t);
    const zero = lv.filter(v => v === 0).length, full = lv.filter(v => v === 1).length;

    dyn.replaceChildren();
    txt(L - 64, 26, `${st.m} oocytes from a mother at ${st.h} %, bottleneck N = ${N} (seed ${st.seed})`, { class: "ttl" });

    // y axis
    const mx = Math.max(...counts, 1);
    const step = niceStep(mx / 4), top = Math.ceil(mx / step) * step;
    const sy = (v: number) => B - (v / top) * (B - T);
    for (let v = 0; v <= top + 1e-9; v += step) {
      svgEl("line", { x1: L, x2: R, y1: sy(v), y2: sy(v), stroke: v ? "#e3e3e3" : INK, "stroke-width": v ? 1 : 1.5 }, dyn);
      txt(L - 8, sy(v) + 6, String(v), { class: "sm", "text-anchor": "end" });
    }
    const ym = (T + B) / 2;
    txt(22, ym, "oocytes", { class: "sm", "text-anchor": "middle", transform: `rotate(-90 22 ${ym})` });

    // bars
    const bw = (R - L) / NB;
    counts.forEach((c, i) => {
      if (!c) return;
      const lo = i / NB;
      svgEl("rect", {
        x: sx(lo) + 1.5, y: sy(c), width: bw - 3, height: B - sy(c),
        fill: lo >= t - 1e-9 ? RED : BLUE, opacity: 0.88,
      }, dyn);
    });
    // x axis
    for (let p = 0; p <= 100; p += 10) {
      svgEl("line", { x1: sx(p / 100), x2: sx(p / 100), y1: B, y2: B + 6, stroke: INK }, dyn);
      txt(sx(p / 100), B + 26, `${p}`, { class: "sm", "text-anchor": "middle" });
    }
    txt((L + R) / 2, B + 54, "heteroplasmy of the oocyte (% mutant mtDNA)", { "text-anchor": "middle" });

    // mother's level
    svgEl("line", { x1: sx(h), x2: sx(h), y1: T - 6, y2: B, stroke: INK, "stroke-width": 2, "stroke-dasharray": "6 4" }, dyn);
    txt(sx(h) + (h > 0.8 ? -6 : 6), T + 22, "mother", { class: "sm", "text-anchor": h > 0.8 ? "end" : "start" });

    // threshold line + handle (persistent elements, moved)
    const tx = sx(t);
    setAttrs(tLine, { x1: tx, x2: tx });
    setAttrs(tLab, { x: tx + (t > 0.8 ? -6 : 6), "text-anchor": t > 0.8 ? "end" : "start" });
    setAttrs(handle, { cx: tx });

    // readout
    const rx = 700;
    let y = 74;
    const line = (s: string, cls = "", col = "") => {
      const e = txt(rx, y, s, cls ? { class: cls } : {});
      if (col) e.setAttribute("style", `fill:${col}`);
      y += cls === "big" ? 36 : 28;
    };
    line(`at or above ${st.t} %:`, "", RED);
    line(`${above} of ${st.m} = ${pct(above / st.m)}`, "big", RED);
    line(`exact binomial: ${pct(pExact)}`, "sm");
    y += 14;
    line("mean level:");
    line(`${pct(mean)}   (mother ${st.h} %)`, "sm");
    y += 8;
    line("spread (SD):");
    line(`${pp(Math.sqrt(vr))} simulated`, "sm");
    line(`${pp(Math.sqrt(vExp))} = √(h(1−h)/N)`, "sm");
    line(`variance ${vr.toFixed(4)} vs ${vExp.toFixed(4)}`, "sm");
    y += 8;
    line(`at 0 %: ${zero};  at 100 %: ${full}`, "sm");
  }

  draw();
}

const pct = (f: number) => `${(100 * f).toFixed(1)} %`;
const pp = (f: number) => `${(100 * f).toFixed(1)} pts`;
function niceStep(x: number): number {
  if (x <= 1) return 1;
  const p = 10 ** Math.floor(Math.log10(x));
  const m = x / p;
  return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
}

autoMount(NAME, mount);
