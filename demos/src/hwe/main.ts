// Hardy–Weinberg equilibrium on a de Finetti triangle.
//  - left: an equilateral triangle with vertices AA (bottom left), aa (bottom right) and
//    Aa (top). A population is a point: its horizontal position is q = f(aa) + f(Aa)/2,
//    its height is f(Aa). The HWE parabola f(Aa) = 2pq is drawn; a dashed vertical line
//    joins the point to the parabola (heterozygote deficit or excess). Drag the point.
//  - middle: a sample of N individuals with these frequencies: observed genotype counts
//    (filled bars) vs the counts expected under HWE from the same allele frequency
//    (dashed outlines).
//  - right: p, F and N sliders, presets, and the χ² test for HWE (df = 3 − 1 − 1 = 1).
//
// Auto-mounts on <div data-demo="hwe">. data-* options (all optional):
//   data-counts="nAA nAa naa"  start from these counts (sets the frequencies and N)
//   data-n="200"               sample size (snapped to 20, 50, …, 5000)
//   data-preset="hwe|rare|excess|inbred|selfed|f2"
//   data-p="0.5" data-f="0"    start at allele frequency p and inbreeding coefficient F
import { svgEl, htmlEl, slider, button, presets, draggable, svgPoint, numList, autoMount } from "../lib/ui";
import { Freqs, fRange, freqsFromPF, summary, toXY, fromXY, roundCounts, hweTest } from "./model";

const NAME = "hwe";
const NS = [20, 50, 100, 200, 500, 1000, 2000, 5000];
const INK = "#1b2a3a";
const COL = { pt: "#2a6f97", hwe: "#6a994e", gap: "#bc4749", obs: "#2a6f97" };

const STYLE = `
[data-demo="${NAME}"] { flex-direction: column; gap: .4em; }
[data-demo="${NAME}"] .hw-row { display: flex; flex-wrap: wrap; gap: .3em .8em; align-items: center; }
[data-demo="${NAME}"] .hw-main { display: flex; flex-wrap: wrap; gap: 10px 14px; width: 100%; align-items: flex-start; }
[data-demo="${NAME}"] .hw-main svg { min-width: 0; height: auto; }
[data-demo="${NAME}"] .hw-tri { flex: 46 1 300px; max-width: 40%; }
[data-demo="${NAME}"] .hw-bars { flex: 40 1 260px; max-width: 33%; }
[data-demo="${NAME}"] .hw-panel { flex: 1 1 250px; display: flex; flex-direction: column; gap: .45em; min-width: 230px; }
[data-demo="${NAME}"] svg text { font-size: 17px; fill: ${INK}; }
[data-demo="${NAME}"] svg .ttl { font-size: 19px; font-weight: 600; }
[data-demo="${NAME}"] svg .vtx { font-size: 21px; font-weight: 700; font-style: italic; }
[data-demo="${NAME}"] svg .sm { font-size: 15.5px; fill: #4a5866; }
[data-demo="${NAME}"] svg .geno { font-size: 19px; font-style: italic; font-weight: 600; }
[data-demo="${NAME}"] .hw-res { font-family: ui-monospace, monospace; font-size: .92em; background: var(--qb-panel);
  border-radius: 6px; padding: .4em .6em; line-height: 1.45; }
[data-demo="${NAME}"] .hw-res b { font-family: system-ui, sans-serif; }
[data-demo="${NAME}"] .hw-res .sig { color: ${COL.gap}; font-weight: 700; }
[data-demo="${NAME}"] .qb-note { margin: 0; }
.reveal [data-demo="${NAME}"] { font-size: 19px; }
.reveal [data-demo="${NAME}"] .qb-btn { font-size: .8em; padding: .12em .5em; }
.reveal [data-demo="${NAME}"] .qb-note { display: none; }
@media (max-width: 760px) {
  [data-demo="${NAME}"] .hw-tri, [data-demo="${NAME}"] .hw-bars { max-width: 100%; flex-basis: 100%; }
}
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

interface Preset { key: string; label: string; fr: () => Freqs }
const PRESETS: Preset[] = [
  { key: "hwe", label: "HWE, p = 0.5", fr: () => freqsFromPF(0.5, 0) },
  { key: "rare", label: "rare allele q = 0.1", fr: () => freqsFromPF(0.9, 0) },
  { key: "excess", label: "excess heterozygotes", fr: () => [0.2, 0.7, 0.1] },
  { key: "inbred", label: "inbreeding F = 0.25", fr: () => freqsFromPF(0.5, 0.25) },
  { key: "selfed", label: "fully inbred F = 1", fr: () => freqsFromPF(0.5, 1) },
  { key: "f2", label: "Mendel F2 1:2:1", fr: () => [0.25, 0.5, 0.25] },
];

const f3 = (v: number) => v.toFixed(3);
function fP(p: number): string {
  if (p < 0.0001) return p < 1e-12 ? "p < 1e-12" : "p = " + p.toExponential(1);
  if (p < 0.001) return "p = " + p.toFixed(4);
  return "p = " + p.toFixed(3);
}
const fChi = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2));
const fE = (v: number) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));

function niceStep(x: number): number {
  const p = 10 ** Math.floor(Math.log10(x));
  const m = x / p;
  return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
}

function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;

  // ---- initial state from data-* ----
  const nearestN = (n: number) => NS.reduce((b, v, i) => (Math.abs(v - n) < Math.abs(NS[b] - n) ? i : b), 0);
  let ni0 = nearestN(Number(ds.n ?? 200) || 200);
  let fr0: Freqs = freqsFromPF(0.5, 0);
  let counts0: number[] | null = null;
  const pre = PRESETS.find(p => p.key === (ds.preset ?? "").trim());
  if (pre) fr0 = pre.fr();
  if (ds.p !== undefined || ds.f !== undefined) {
    fr0 = freqsFromPF(Math.min(1, Math.max(0, Number(ds.p ?? 0.5))), Number(ds.f ?? 0) || 0);
  }
  const c = numList(ds.counts, []).map(v => Math.max(0, Math.round(v)));
  if (c.length === 3 && c[0] + c[1] + c[2] > 0) {
    const N = c[0] + c[1] + c[2];
    counts0 = c;
    fr0 = [c[0] / N, c[1] / N, c[2] / N];
  }

  const st = { fr: fr0 as Freqs, ni: ni0, counts: counts0 as number[] | null };
  const N = () => (st.counts ? st.counts[0] + st.counts[1] + st.counts[2] : NS[st.ni]);
  const counts = () => st.counts ?? roundCounts(NS[st.ni], st.fr);

  // ---- layout ----
  const top = htmlEl("div", "hw-row", "", host);
  htmlEl("span", "", "Presets:", top);
  const pBtns = presets(top, PRESETS.map(pr => ({
    label: pr.label, apply: () => { st.fr = pr.fr(); st.counts = null; syncSliders(); draw(); },
  })));
  const note = htmlEl("p", "qb-note", "Drag the point, or set p and F. The green curve is Hardy–Weinberg: f(Aa) = 2pq. Points below it have too few heterozygotes (F > 0, e.g. inbreeding); points above have too many (F < 0).", host);
  void note;

  const main = htmlEl("div", "hw-main", "", host);
  const TW = 460, TH = 400;
  const svgT = svgEl("svg", { viewBox: `0 0 ${TW} ${TH}`, class: "hw-tri", role: "img", "aria-label": "de Finetti triangle with the Hardy–Weinberg parabola" }, main);
  const BW = 400, BH = 400;
  const svgB = svgEl("svg", { viewBox: `0 0 ${BW} ${BH}`, class: "hw-bars", role: "img", "aria-label": "Observed and HWE-expected genotype counts" }, main);
  const panel = htmlEl("div", "hw-panel", "", main);

  const sP = slider(panel, "p (allele A)", 0, 1, 0.01, 0.5, v => {
    const F = sF.get();
    st.fr = freqsFromPF(v, F); st.counts = null; clearActive(); syncSliders(); draw();
  }, v => v.toFixed(2));
  const sF = slider(panel, "F", -1, 1, 0.01, 0, v => {
    const p = sP.get();
    const [lo, hi] = fRange(p);
    const F = Math.min(hi, Math.max(lo, v));
    st.fr = freqsFromPF(p, F); st.counts = null; clearActive(); syncSliders(); draw();
  }, v => v.toFixed(2));
  const sN = slider(panel, "N", 0, NS.length - 1, 1, st.ni, v => {
    st.ni = v; st.counts = null; draw();
  }, v => String(NS[Math.round(v)]));
  const brow = htmlEl("div", "hw-row", "", panel);
  button(brow, "snap to HWE", () => {
    st.fr = freqsFromPF(summary(st.fr).p, 0); st.counts = null; clearActive(); syncSliders(); draw();
  });
  button(brow, "reset", () => {
    st.fr = fr0; st.ni = ni0; st.counts = counts0; clearActive(); sN.set(ni0); syncSliders(); draw();
  });
  const res = htmlEl("div", "hw-res", "", panel);

  function clearActive(): void { pBtns.forEach(b => b.classList.remove("active")); }
  function syncSliders(): void {
    const s = summary(st.fr);
    sP.set(Math.round(s.p * 100) / 100);
    sF.set(Math.round(Math.max(-1, Math.min(1, s.F)) * 100) / 100);
  }
  if (pre) pBtns[PRESETS.indexOf(pre)].classList.add("active");
  sN.set(st.ni);
  syncSliders();

  // ---- triangle geometry ----
  const side = 330, x0 = (TW - side) / 2, x1 = x0 + side, yb = 330, ht = side * Math.sqrt(3) / 2;
  const X = (q: number) => x0 + q * side;
  const Y = (h: number) => yb - h * ht;

  const gStatic = svgEl("g", {}, svgT);
  const gDyn = svgEl("g", {}, svgT);
  const handle = svgEl("circle", { r: 13, class: "handle", stroke: COL.pt, "aria-label": "population" }, svgT);

  function drawStatic(): void {
    // light grid: lines of constant f(Aa), and of constant f(AA) / f(aa)
    for (const v of [0.25, 0.5, 0.75]) {
      const xl = X(v / 2), xr = X(1 - v / 2);
      svgEl("line", { x1: xl, x2: xr, y1: Y(v), y2: Y(v), class: "grid" }, gStatic);
      // constant f(aa) = v: from (q = v, H = 0) to (q = (1 + v)/2, H = 1 − v)
      svgEl("line", { x1: X(v), y1: Y(0), x2: X((1 + v) / 2), y2: Y(1 - v), class: "grid" }, gStatic);
      svgEl("line", { x1: X(1 - v), y1: Y(0), x2: X((1 - v) / 2), y2: Y(1 - v), class: "grid" }, gStatic);
    }
    svgEl("path", {
      d: `M${X(0)},${Y(0)} L${X(1)},${Y(0)} L${X(0.5)},${Y(1)} Z`, fill: "none", stroke: INK, "stroke-width": 2,
    }, gStatic);
    // HWE parabola
    let d = "";
    for (let i = 0; i <= 100; i++) {
      const q = i / 100;
      d += (i ? "L" : "M") + X(q).toFixed(1) + "," + Y(2 * q * (1 - q)).toFixed(1);
    }
    svgEl("path", { d, fill: "none", stroke: COL.hwe, "stroke-width": 3 }, gStatic);
    // vertex labels
    svgEl("text", { x: X(0) - 8, y: yb + 7, "text-anchor": "end", class: "vtx" }, gStatic).textContent = "AA";
    svgEl("text", { x: X(1) + 8, y: yb + 7, "text-anchor": "start", class: "vtx" }, gStatic).textContent = "aa";
    svgEl("text", { x: X(0.5), y: Y(1) - 10, "text-anchor": "middle", class: "vtx" }, gStatic).textContent = "Aa";
    // q axis ticks
    for (const q of [0, 0.25, 0.5, 0.75, 1]) {
      svgEl("line", { x1: X(q), x2: X(q), y1: yb, y2: yb + 6, class: "axis" }, gStatic);
      svgEl("text", { x: X(q), y: yb + 24, "text-anchor": "middle", class: "sm" }, gStatic).textContent = String(q);
    }
    svgEl("text", { x: X(0.5), y: yb + 50, "text-anchor": "middle" }, gStatic).textContent = "allele frequency q (of a)";
    // legend in the empty top corners
    svgEl("line", { x1: 10, x2: 36, y1: 24, y2: 24, stroke: COL.hwe, "stroke-width": 3 }, gStatic);
    svgEl("text", { x: 42, y: 30, class: "sm" }, gStatic).textContent = "HWE: Aa = 2pq";
    svgEl("circle", { cx: 23, cy: 52, r: 7, fill: "#fff", stroke: COL.pt, "stroke-width": 3 }, gStatic);
    svgEl("text", { x: 42, y: 58, class: "sm" }, gStatic).textContent = "population";
    svgEl("text", { x: TW - 10, y: 30, "text-anchor": "end", class: "sm" }, gStatic).textContent = "height = f(Aa)";
  }

  draggable(handle, ev => svgPoint(svgT, ev), (x, y) => {
    st.fr = fromXY((x - x0) / side, (yb - y) / ht);
    st.counts = null;
    clearActive(); syncSliders(); draw();
  });

  function drawTriangle(t: ReturnType<typeof hweTest>): void {
    gDyn.replaceChildren();
    const [q, h] = toXY(st.fr);
    const hHwe = 2 * q * (1 - q);
    const px = X(q), py = Y(h), ph = Y(hHwe);
    if (Math.abs(py - ph) > 2) {
      svgEl("line", { x1: px, x2: px, y1: py, y2: ph, stroke: COL.gap, "stroke-width": 2.5, "stroke-dasharray": "6 4" }, gDyn);
    }
    svgEl("circle", { cx: px, cy: ph, r: 4.5, fill: COL.hwe }, gDyn);
    // F in the empty top-right corner, so it never collides with the triangle
    const Fv = summary(st.fr).F;
    const lab = svgEl("text", { x: TW - 10, y: 58, "text-anchor": "end", fill: COL.gap, "font-weight": 600 }, gDyn);
    lab.textContent = `F = ${Math.abs(Fv) < 0.005 ? "0.00" : Fv.toFixed(2)}` +
      (Fv > 0.005 ? " (deficit)" : Fv < -0.005 ? " (excess)" : "");
    lab.style.fill = COL.gap;
    void t;
    handle.setAttribute("cx", String(px));
    handle.setAttribute("cy", String(py));
  }

  // ---- bars ----
  function drawBars(t: ReturnType<typeof hweTest>, obs: number[]): void {
    svgB.replaceChildren();
    const L = 62, R = BW - 10, T = 74, B = 280;
    svgEl("text", { x: 8, y: 24, class: "ttl" }, svgB).textContent = `Sample of N = ${t.N}`;
    svgEl("rect", { x: 10, y: 38, width: 18, height: 14, fill: COL.obs, "fill-opacity": 0.75 }, svgB);
    svgEl("text", { x: 34, y: 51, class: "sm" }, svgB).textContent = "observed";
    svgEl("rect", { x: 140, y: 38, width: 18, height: 14, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "5 3" }, svgB);
    svgEl("text", { x: 164, y: 51, class: "sm" }, svgB).textContent = "HWE expected";
    const m = Math.max(...obs, ...t.exp, 1) * 1.1;
    const step = niceStep(m / 4);
    const yTop = Math.ceil(m / step) * step;
    const sy = (v: number) => B - (v / yTop) * (B - T);
    for (let v = 0; v <= yTop + 1e-9; v += step) {
      svgEl("line", { x1: L, x2: R, y1: sy(v), y2: sy(v), class: v === 0 ? "axis" : "grid" }, svgB);
      svgEl("text", { x: L - 6, y: sy(v) + 5, "text-anchor": "end", class: "sm" }, svgB).textContent = String(v);
    }
    const colW = (R - L) / 3, bw = colW * 0.58;
    const names = ["AA", "Aa", "aa"];
    svgEl("text", { x: L - 6, y: B + 52, "text-anchor": "end", class: "sm" }, svgB).textContent = "O";
    svgEl("text", { x: L - 6, y: B + 76, "text-anchor": "end", class: "sm" }, svgB).textContent = "E";
    for (let i = 0; i < 3; i++) {
      const cx = L + colW * (i + 0.5), xa = cx - bw / 2;
      svgEl("rect", { x: xa, y: sy(obs[i]), width: bw, height: B - sy(obs[i]), fill: COL.obs, "fill-opacity": 0.75 }, svgB);
      svgEl("rect", { x: xa, y: sy(t.exp[i]), width: bw, height: B - sy(t.exp[i]), fill: "none", stroke: INK, "stroke-width": 2.2, "stroke-dasharray": "6 4" }, svgB);
      svgEl("text", { x: cx, y: B + 26, "text-anchor": "middle", class: "geno" }, svgB).textContent = names[i];
      svgEl("text", { x: cx, y: B + 52, "text-anchor": "middle" }, svgB).textContent = String(obs[i]);
      svgEl("text", { x: cx, y: B + 76, "text-anchor": "middle" }, svgB).textContent = fE(t.exp[i]);
    }
    svgEl("text", { x: BW / 2, y: B + 108, "text-anchor": "middle", class: "sm" }, svgB).textContent =
      `E = N·p², 2N·pq, N·q² with p̂ = ${t.p.toFixed(3)}`;
  }

  function drawReadout(t: ReturnType<typeof hweTest>): void {
    const sig = !t.monomorphic && t.pval < 0.05;
    res.innerHTML =
      `p̂ = ${f3(t.p)}   q̂ = ${f3(t.q)}<br>` +
      (t.monomorphic
        ? `only one allele: nothing to test<br>`
        : `χ² = ${fChi(t.chi2)}, df = 1<br>` +
          `<span class="${sig ? "sig" : ""}">${fP(t.pval)}${sig ? "  reject HWE" : ""}</span><br>`) +
      `H<sub>obs</sub> = ${f3(t.hObs)}   H<sub>exp</sub> = ${f3(t.hExp)}<br>` +
      `F = 1 − H<sub>obs</sub>/H<sub>exp</sub> = ${t.F.toFixed(3)}<br>` +
      `<span style="font-family:system-ui,sans-serif;font-size:.85em;color:#555">df = 3 classes − 1 − 1 (p estimated)</span>`;
  }

  function draw(): void {
    const obs = counts();
    const t = hweTest(obs);
    drawTriangle(t);
    drawBars(t, obs);
    drawReadout(t);
    const out = sN.input.parentElement?.querySelector("output");
    if (out) out.value = String(N());
  }

  drawStatic();
  draw();
}

autoMount(NAME, mount);
