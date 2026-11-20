// PCR: copies of the product, cycle by cycle.
// Each cycle multiplies the product by (1 + E), where E is the efficiency (1 = perfect
// doubling). As primers and nucleotides run out, the effective efficiency falls towards zero:
//   E_eff = E × (1 − total / K),   K = plateau (about 10^12 copies in a 50 µl reaction).
// Optional primer-dimer: the two primers occasionally prime on each other (a small number of
// new dimer molecules per cycle), and the short dimer then amplifies with its own efficiency,
// competing with the target for the same primers. The curves are deterministic expected values.
// A dashed line marks a detection threshold (roughly what a gel or a qPCR machine can see),
// and the readout gives the cycle where each curve crosses it (the "Ct" of qPCR).
//
// Auto-mounts on <div data-demo="pcr">. data-* options (all optional):
//   data-preset="ideal|real|dimer|ntc"   (default "real")
//   data-log="true|false"                log y-axis (default true)
import { autoMount, checkbox, htmlEl, presets, slider, svgEl } from "../lib/ui";

const NAME = "pcr";
const INK = "#1b2a3a";
const C_T = "#2a6f97", C_D = "#bc4749", C_10 = "#7fa7c4";

const STYLE = `
[data-demo="${NAME}"] .pc-plot { flex: 62 1 440px; min-width: 0; max-width: 700px; }
[data-demo="${NAME}"] .pc-plot svg { width: 100%; height: auto; }
[data-demo="${NAME}"] .qb-panel { flex: 38 1 280px; }
[data-demo="${NAME}"] svg text { font-size: 16px; fill: ${INK}; }
[data-demo="${NAME}"] svg .sm { font-size: 14px; fill: #4a5866; }
[data-demo="${NAME}"] svg .ttl { font-size: 17px; font-weight: 600; }
.reveal [data-demo="${NAME}"] { font-size: 18px; }
.reveal [data-demo="${NAME}"] .qb-btn { font-size: .78em; padding: .12em .5em; }
.reveal [data-demo="${NAME}"] .qb-note { display: none; }
.reveal [data-demo="${NAME}"] svg text { font-size: 19px; }
.reveal [data-demo="${NAME}"] svg .sm { font-size: 17px; }
.reveal [data-demo="${NAME}"] .qb-readout { font-size: .85em; }
.reveal [data-demo="${NAME}"] .pc-plot { flex: 60 1 400px; }
.reveal [data-demo="${NAME}"] .qb-panel { flex: 40 1 400px; gap: .3em; }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------- model
const K = 1e12;            // plateau: total product copies the reaction can make
const THRESH = 1e10;       // detection threshold (about 10 ng of a 500-bp product)
const DIMER_RATE = 0.05;   // new primer-dimer molecules formed per cycle (expected)
const DIMER_E = 0.95;      // efficiency of the short dimer product

interface Params { log10N0: number; E: number; cycles: number; dimer: boolean; dil: boolean; log: boolean }

/** Run the model; returns copies after each cycle 0..cycles for target, dimer and a 10× dilution. */
function run(p: Params, n0: number) {
  const t = [n0], d = [0];
  let T = n0, D = 0;
  for (let c = 1; c <= p.cycles; c++) {
    const free = Math.max(0, 1 - (T + D) / K);
    const nT = T * (1 + p.E * free);
    const nD = p.dimer ? D * (1 + DIMER_E * free) + DIMER_RATE * free : 0;
    T = nT; D = nD;
    t.push(T); d.push(D);
  }
  return { t, d };
}

/** First (interpolated) cycle at which a curve reaches the threshold, or null. */
function ct(v: number[]): number | null {
  for (let i = 1; i < v.length; i++) {
    if (v[i] >= THRESH && v[i - 1] < THRESH) {
      const a = Math.log10(Math.max(v[i - 1], 1e-3)), b = Math.log10(v[i]);
      return i - 1 + (Math.log10(THRESH) - a) / (b - a);
    }
  }
  return v[0] >= THRESH ? 0 : null;
}

function sci(x: number): string {
  if (x < 1) return x === 0 ? "0" : x.toPrecision(1);
  if (x < 1e4) return Math.round(x).toLocaleString("en-US");
  const e = Math.floor(Math.log10(x)), m = x / 10 ** e;
  return `${m.toFixed(1)} × 10^${e}`;
}

const PRESETS: Record<string, { label: string; p: Partial<Params> }> = {
  ideal: { label: "ideal doubling", p: { log10N0: 3, E: 1, cycles: 30, dimer: false, dil: false } },
  real: { label: "realistic (E = 90%)", p: { log10N0: 3, E: 0.9, cycles: 35, dimer: false, dil: true } },
  dimer: { label: "10 templates + primer-dimer", p: { log10N0: 1, E: 0.9, cycles: 40, dimer: true, dil: false } },
  ntc: { label: "no-template control", p: { log10N0: -Infinity, E: 0.9, cycles: 40, dimer: true, dil: false } },
};

// ---------------------------------------------------------------- UI
function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;
  const st: Params = { log10N0: 3, E: 0.9, cycles: 35, dimer: false, dil: true, log: ds.log !== "false" };
  let noTemplate = false;
  const start = ds.preset && PRESETS[ds.preset] ? ds.preset : "real";
  apply(start);

  function apply(k: string): void {
    const p = PRESETS[k].p;
    Object.assign(st, p);
    noTemplate = !Number.isFinite(st.log10N0);
    if (noTemplate) st.log10N0 = 0;
  }

  const plot = htmlEl("div", "pc-plot", "", host);
  const W = 700, H = 450;
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "PCR product copies per cycle" }, plot);
  const panel = htmlEl("div", "qb-panel", "", host);

  const pBtns = presets(panel, Object.keys(PRESETS).map(k => ({
    label: PRESETS[k].label, apply: () => { apply(k); syncInputs(); draw(); },
  })));
  pBtns[Object.keys(PRESETS).indexOf(start)].classList.add("active");
  const clear = () => pBtns.forEach(b => b.classList.remove("active"));

  const sN = slider(panel, "start copies", 0, 6, 0.5, st.log10N0, v => { st.log10N0 = v; noTemplate = false; clear(); draw(); },
    v => sci(10 ** v));
  const sE = slider(panel, "efficiency", 0.5, 1, 0.05, st.E, v => { st.E = v; clear(); draw(); }, v => `${Math.round(v * 100)}%`);
  const sC = slider(panel, "cycles", 10, 45, 1, st.cycles, v => { st.cycles = v; clear(); draw(); });
  const cD = checkbox(panel, "primer-dimer", st.dimer, v => { st.dimer = v; clear(); draw(); });
  const c10 = checkbox(panel, "also show 10× less template", st.dil, v => { st.dil = v; draw(); });
  const cL = checkbox(panel, "log y-axis", st.log, v => { st.log = v; draw(); });
  const ro = htmlEl("div", "qb-readout", "", panel);
  htmlEl("p", "qb-note",
    "Model: copies × (1 + E·(1 − total/K)) each cycle, K = 10^12. Dashed line: detection threshold 10^10 copies. " +
    "Primer-dimer: 0.05 new dimers per cycle, then 95% efficiency.", host);

  function syncInputs(): void {
    sN.set(st.log10N0); sE.set(st.E); sC.set(st.cycles);
    cD.checked = st.dimer; c10.checked = st.dil; cL.checked = st.log;
  }

  const txt = (x: number, y: number, s: string, attrs: Record<string, string | number> = {}) => {
    const t = svgEl("text", { x, y, ...attrs }, svg);
    t.textContent = s;
    return t;
  };

  function draw(): void {
    svg.replaceChildren();
    const n0 = noTemplate ? 0 : 10 ** st.log10N0;
    const main = run(st, n0);
    const dil = run({ ...st, dimer: false }, n0 / 10);
    const L = 84, R = W - 14, T = 18, B = H - 52;
    const sx = (c: number) => L + (c / st.cycles) * (R - L);
    const yMin = 0, yMax = 13;  // log10 range
    const sy = st.log
      ? (v: number) => B - ((Math.log10(Math.max(v, 1)) - yMin) / (yMax - yMin)) * (B - T)
      : (v: number) => B - (v / (K * 1.08)) * (B - T);
    // grid and axes
    if (st.log) {
      for (let e = 0; e <= 12; e += 2) {
        svgEl("line", { x1: L, x2: R, y1: sy(10 ** e), y2: sy(10 ** e), stroke: e ? "#e3e3e3" : INK, "stroke-width": e ? 1 : 1.5 }, svg);
        const t = txt(L - 8, sy(10 ** e) + 5, "10", { class: "sm", "text-anchor": "end" });
        const sup = svgEl("tspan", { dy: -7, "font-size": 11 }, t); sup.textContent = String(e);
        if (e === 0) { t.textContent = "1"; }
      }
    } else {
      for (let k = 0; k <= 10; k += 2) {
        const v = k * 1e11;
        svgEl("line", { x1: L, x2: R, y1: sy(v), y2: sy(v), stroke: k ? "#e3e3e3" : INK, "stroke-width": k ? 1 : 1.5 }, svg);
        txt(L - 8, sy(v) + 5, k ? (k / 10).toFixed(1) : "0", { class: "sm", "text-anchor": "end" });
      }
    }
    for (let c = 0; c <= st.cycles; c += 5) {
      svgEl("line", { x1: sx(c), x2: sx(c), y1: B, y2: B + 5, stroke: INK }, svg);
      txt(sx(c), B + 21, String(c), { class: "sm", "text-anchor": "middle" });
    }
    txt((L + R) / 2, H - 10, "PCR cycle", { "text-anchor": "middle" });
    const yl = (T + B) / 2;
    const yt = txt(16, yl, st.log ? "copies of product (log scale)" : "copies of product (× 10", { "text-anchor": "middle", transform: `rotate(-90 16 ${yl})` });
    if (!st.log) {
      const s1 = svgEl("tspan", { dy: -7, "font-size": 11 }, yt); s1.textContent = "12";
      const s2 = svgEl("tspan", { dy: 7 }, yt); s2.textContent = ")";
    }

    // threshold and plateau
    svgEl("line", { x1: L, x2: R, y1: sy(THRESH), y2: sy(THRESH), stroke: "#6b7785", "stroke-dasharray": "6 4", "stroke-width": 1.5 }, svg);
    txt(L + 6, sy(THRESH) - 6, "detection threshold", { class: "sm" });
    svgEl("line", { x1: L, x2: R, y1: sy(K), y2: sy(K), stroke: "#b8c2cc", "stroke-dasharray": "2 4", "stroke-width": 1.5 }, svg);
    txt(R - 6, sy(K) + 17, "plateau", { class: "sm", "text-anchor": "end" });

    const path = (v: number[], col: string, w: number, dash = "") => {
      const pts = v.map((y, c) => `${sx(c).toFixed(1)},${sy(y).toFixed(1)}`).join(" ");
      svgEl("polyline", { points: pts, fill: "none", stroke: col, "stroke-width": w, "stroke-dasharray": dash, "stroke-linejoin": "round" }, svg);
    };
    if (st.dil && !noTemplate) path(dil.t, C_10, 2.5, "7 4");
    if (st.dimer) path(main.d, C_D, 3);
    if (!noTemplate) path(main.t, C_T, 3.5);

    // legend: bottom right on the log axis (curves rise from bottom left), top left on the
    // linear axis (curves hug the bottom until late), below the plateau line
    const nLeg = (noTemplate ? 0 : 1) + (st.dil && !noTemplate ? 1 : 0) + (st.dimer ? 1 : 0);
    const lx = st.log ? R - (host.closest(".reveal") ? 310 : 250) : L + 12;
    let ly = st.log ? B - 14 - 22 * (nLeg - 1) : sy(K) + 44;
    const leg = (col: string, label: string, dash = "") => {
      svgEl("line", { x1: lx, x2: lx + 30, y1: ly - 5, y2: ly - 5, stroke: col, "stroke-width": 3.5, "stroke-dasharray": dash }, svg);
      txt(lx + 38, ly, label);
      ly += 22;
    };
    if (!noTemplate) leg(C_T, "target product");
    if (st.dil && !noTemplate) leg(C_10, "target, 10× less template", "7 4");
    if (st.dimer) leg(C_D, "primer-dimer");

    // readout
    const last = st.cycles;
    const lines: string[] = [];
    if (!noTemplate) {
      lines.push(`start: ${sci(n0)} copies`);
      lines.push(`after ${last} cycles: ${sci(main.t[last])}`);
      lines.push(`ideal (1+E)^${last}: ${sci(n0 * (1 + st.E) ** last)}`);
      const c1 = ct(main.t);
      lines.push(`threshold at cycle: ${c1 === null ? "not reached" : c1.toFixed(1)}`);
      if (st.dil) {
        const c2 = ct(dil.t);
        lines.push(`10× less template: ${c2 === null ? "not reached" : c2.toFixed(1)}` +
          (c1 !== null && c2 !== null ? `  (Δ ${(c2 - c1).toFixed(1)})` : ""));
      }
    } else lines.push("no template DNA in the tube");
    if (st.dimer) {
      lines.push(`primer-dimer after ${last}: ${sci(main.d[last])}`);
      const cd = ct(main.d);
      lines.push(`dimer threshold cycle: ${cd === null ? "not reached" : cd.toFixed(1)}`);
    }
    ro.textContent = lines.join("\n");
  }
  draw();
}

autoMount(NAME, mount);
