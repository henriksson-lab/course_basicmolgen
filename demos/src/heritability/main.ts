// Parent–offspring regression: the slope of offspring on midparent estimates h².
// Each dot is one family: x = midparent value (mean of mother and father), y = the
// child's value, in height-like units (170 + 7·z cm). Lines: the fitted least-squares
// line (solid), the slope expected from the model (dashed) and slope 1 (dotted grey,
// "the child equals the midparent"). Model in model.ts: P = A + C + E with var(A) = h²,
// shared family environment var(C) = c². Expected slope h² + c² on midparent, half that
// on one parent. So a shared environment inflates the "heritability" estimate.
//
// Auto-mounts on <div data-demo="heritability">. data-* options (all optional):
//   data-h2="0.6"   narrow-sense heritability (0–1)
//   data-c2="0"     shared family environment (0–0.4)
//   data-n="200"    number of families (20–1000)
//   data-seed="1"
//   data-preset="height|low|zero|shared"
import { svgEl, htmlEl, slider, button, presets, checkbox, scale, autoMount, Slider } from "../lib/ui";
import { makeDraws, families, expectedSlope, fit, Draws } from "./model";

const NAME = "heritability";
const INK = "#1b2a3a";
const DOT = "#2a6f97", FIT = "#bc4749", EXP = "#1b2a3a", ONE = "#9aa3ab";

const STYLE = `
[data-demo="${NAME}"] .hr-plot { flex: 1 1 360px; max-width: 540px; min-width: 0; }
[data-demo="${NAME}"] .hr-plot svg { width: 100%; height: auto; }
[data-demo="${NAME}"] svg text { font-size: 17px; fill: ${INK}; }
[data-demo="${NAME}"] svg .tick { font-size: 15px; fill: #4a5866; }
[data-demo="${NAME}"] svg .ttl { font-size: 18px; font-weight: 600; }
[data-demo="${NAME}"] .qb-panel { flex: 1 1 300px; max-width: 420px; }
[data-demo="${NAME}"] .hr-btns { display: flex; flex-wrap: wrap; gap: .35em; }
[data-demo="${NAME}"] .qb-note { margin: 0; }
@media (max-width: 820px) { [data-demo="${NAME}"] .hr-plot { flex-basis: 100%; max-width: 100%; } }
.reveal [data-demo="${NAME}"] { font-size: 19px; flex-wrap: nowrap; }
.reveal [data-demo="${NAME}"] .hr-plot { flex: 0 0 520px; max-width: 520px; }
.reveal [data-demo="${NAME}"] svg text { font-size: 19px; }
.reveal [data-demo="${NAME}"] svg .tick { font-size: 18px; }
.reveal [data-demo="${NAME}"] .qb-readout { font-size: .8em; }
.reveal [data-demo="${NAME}"] .qb-note { display: none; }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

interface State { h2: number; c2: number; n: number; single: boolean; seed: number }

const PRESETS: Record<string, Partial<State>> = {
  height: { h2: 0.8, c2: 0, single: false },
  low: { h2: 0.3, c2: 0, single: false },
  zero: { h2: 0, c2: 0, single: false },
  shared: { h2: 0.3, c2: 0.3, single: false },
};

// plot geometry (viewBox units)
const W = 540, H = 540, L = 70, R = 18, T = 20, B = 64;
const LO = 142, HI = 198;

function mount(host: HTMLElement): void {
  injectStyle();
  const num = (k: string, d: number) => {
    const v = Number(host.dataset[k]);
    return host.dataset[k] !== undefined && Number.isFinite(v) ? v : d;
  };
  const init: State = {
    h2: Math.min(1, Math.max(0, num("h2", 0.6))),
    c2: Math.min(0.4, Math.max(0, num("c2", 0))),
    n: Math.round(Math.min(1000, Math.max(20, num("n", 200)))),
    single: false,
    seed: Math.round(num("seed", 3)),   // seed 3: a typical sample (b ≈ 0.58 at h² = 0.6, n = 200)
  };
  const pre = host.dataset.preset && PRESETS[host.dataset.preset];
  if (pre) Object.assign(init, pre);
  if (init.h2 + init.c2 > 1) init.c2 = 1 - init.h2;
  const st: State = { ...init };
  let draws: Draws = makeDraws(st.seed);

  // ---- plot ----
  const plotDiv = htmlEl("div", "hr-plot", "", host);
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "parent–offspring scatter plot" }, plotDiv);
  const sx = scale(LO, HI, L, W - R), sy = scale(LO, HI, H - B, T);
  const defs = svgEl("defs", {}, svg);
  const cp = svgEl("clipPath", { id: "hr-clip-" + Math.random().toString(36).slice(2) }, defs);
  svgEl("rect", { x: L, y: T, width: W - L - R, height: H - T - B }, cp);
  for (let v = 145; v <= 195; v += 10) {
    svgEl("line", { x1: sx(v), x2: sx(v), y1: T, y2: H - B, class: "grid" }, svg);
    svgEl("line", { x1: L, x2: W - R, y1: sy(v), y2: sy(v), class: "grid" }, svg);
    svgEl("text", { x: sx(v), y: H - B + 22, "text-anchor": "middle", class: "tick" }, svg).textContent = String(v);
    svgEl("text", { x: L - 8, y: sy(v) + 5, "text-anchor": "end", class: "tick" }, svg).textContent = String(v);
  }
  svgEl("rect", { x: L, y: T, width: W - L - R, height: H - T - B, fill: "none", class: "axis" }, svg);
  const xLab = svgEl("text", { x: (L + W - R) / 2, y: H - 14, "text-anchor": "middle" }, svg);
  const yLab = svgEl("text", { x: 0, y: 0, "text-anchor": "middle", transform: `translate(20 ${(T + H - B) / 2}) rotate(-90)` }, svg);
  yLab.textContent = "offspring (cm)";
  const clipped = svgEl("g", { "clip-path": `url(#${cp.id})` }, svg);
  const dots = svgEl("g", {}, clipped);
  const lineOne = svgEl("line", { stroke: ONE, "stroke-width": 2, "stroke-dasharray": "2 5" }, clipped);
  const lineExp = svgEl("line", { stroke: EXP, "stroke-width": 2.2, "stroke-dasharray": "9 6" }, clipped);
  const lineFit = svgEl("line", { stroke: FIT, "stroke-width": 3.2 }, clipped);
  // legend, top-left inside the plot
  const lg = svgEl("g", { transform: `translate(${L + 12} ${T + 10})` }, svg);
  svgEl("rect", { x: 0, y: 0, width: 238, height: 86, rx: 5, fill: "#fff", "fill-opacity": 0.88, stroke: "#ccc" }, lg);
  const legRow = (i: number, col: string, dash: string, w: number) => {
    svgEl("line", { x1: 10, x2: 44, y1: 18 + i * 26, y2: 18 + i * 26, stroke: col, "stroke-width": w, "stroke-dasharray": dash }, lg);
    return svgEl("text", { x: 52, y: 24 + i * 26 }, lg);
  };
  const legFit = legRow(0, FIT, "", 3.2);
  const legExp = legRow(1, EXP, "9 6", 2.2);
  legRow(2, ONE, "2 5", 2).textContent = "slope 1";

  // ---- panel ----
  const panel = htmlEl("div", "qb-panel", "", host);
  let sH: Slider, sC: Slider, sN: Slider;
  sH = slider(panel, "h²", 0, 1, 0.05, st.h2, v => {
    st.h2 = v;
    if (st.h2 + st.c2 > 1) { st.c2 = Math.round((1 - st.h2) * 100) / 100; sC.set(st.c2); }
    draw();
  });
  sC = slider(panel, "shared env. c²", 0, 0.4, 0.05, st.c2, v => {
    st.c2 = v;
    if (st.h2 + st.c2 > 1) { st.h2 = Math.round((1 - st.c2) * 100) / 100; sH.set(st.h2); }
    draw();
  });
  sN = slider(panel, "families n", 20, 1000, 10, st.n, v => { st.n = v; draw(); });
  const cb = checkbox(panel, "single parent (x = mother only)", st.single, v => { st.single = v; draw(); });
  const btns = htmlEl("div", "hr-btns", "", panel);
  button(btns, "new sample", () => { st.seed += 1; draws = makeDraws(st.seed); draw(); });
  button(btns, "reset", () => { Object.assign(st, init); draws = makeDraws(st.seed); syncInputs(); draw(); });
  presets(panel, [
    { label: "h² = 0.8 (height)", apply: () => applyPreset("height") },
    { label: "h² = 0.3", apply: () => applyPreset("low") },
    { label: "h² = 0", apply: () => applyPreset("zero") },
    { label: "shared environment", apply: () => applyPreset("shared") },
  ]);
  const out = htmlEl("div", "qb-readout", "", panel);
  htmlEl("p", "qb-note",
    "Simulated families. Heights are 170 + 7·z cm. The regression slope of offspring on midparent estimates h², " +
    "but only if relatives do not share environment (c² = 0).", panel);

  function applyPreset(k: string): void {
    Object.assign(st, PRESETS[k]);
    syncInputs(); draw();
  }
  function syncInputs(): void { sH.set(st.h2); sC.set(st.c2); sN.set(st.n); cb.checked = st.single; }

  function line(el: SVGLineElement, a: number, b: number): void {
    // y = a + b x over the axis range (clipped by the clipPath)
    const x0 = LO - 20, x1 = HI + 20;
    el.setAttribute("x1", String(sx(x0))); el.setAttribute("y1", String(sy(a + b * x0)));
    el.setAttribute("x2", String(sx(x1))); el.setAttribute("y2", String(sy(a + b * x1)));
  }

  function draw(): void {
    const fam = families(draws, st.n, st.h2, st.c2, st.single);
    dots.replaceChildren();
    const rad = st.n > 500 ? 3.2 : 4.2;
    for (let i = 0; i < st.n; i++)
      svgEl("circle", { cx: sx(fam.x[i]), cy: sy(fam.y[i]), r: rad, fill: DOT, "fill-opacity": 0.55 }, dots);
    const f = fit(fam.x, fam.y);
    const eb = expectedSlope(st.h2, st.c2, st.single);
    line(lineFit, f.a, f.b);
    line(lineExp, 170 - eb * 170, eb);
    line(lineOne, 0, 1);
    xLab.textContent = st.single ? "one parent: mother (cm)" : "midparent = (mother + father)/2 (cm)";
    legFit.textContent = `fitted, slope ${f.b.toFixed(2)}`;
    legExp.textContent = `expected, slope ${eb.toFixed(2)}`;
    const est = st.single ? 2 * f.b : f.b;
    out.textContent =
      `true h² = ${st.h2.toFixed(2)}   c² = ${st.c2.toFixed(2)}\n` +
      `fitted slope b = ${f.b.toFixed(3)} ± ${f.se.toFixed(3)} (SE)\n` +
      `r = ${f.r.toFixed(3)}   n = ${f.n} families\n` +
      `h² estimate = ${st.single ? "2b" : "b"} = ${est.toFixed(2)}` +
      (st.c2 > 0 ? `\n(expected ${(st.h2 + st.c2).toFixed(2)}: c² inflates it)` : "");
  }
  draw();
}

autoMount(NAME, mount);
