// χ² goodness of fit. Observed counts (filled bars) against the counts expected under a
// hypothesis ratio (dashed outlines). Each class shows its (O − E)²/E contribution; the
// right panel shows the χ² density for df = k − 1, the observed χ² and the shaded tail
// (the p-value). "simulate under H0" draws one seeded multinomial sample from the
// hypothesis; "simulate 1000×" adds a histogram of 1000 simulated χ² values to the curve.
// Counts change with the −/+ buttons under each bar or by dragging a bar top.
//
// Auto-mounts on <div data-demo="chisq">. data-* options (all optional):
//   data-ratio="3:1"          initial hypothesis: 3:1, 1:2:1, 1:1, 9:3:3:1, 1:1:1:1 or 9:7
//   data-counts="5474 1850"   initial observed counts (one per class; sets N)
//   data-n="100"              initial N if no counts are given (counts start at expected)
//   data-seed="1"
import { svgEl, htmlEl, button, presets, svgPoint, scale, rng, numList, autoMount } from "../lib/ui";
import { chisqStat, chisqUpper, chisqPdf, chisqUpperQuantile, multinomial } from "./stats";

const NAME = "chisq";

interface Hyp { key: string; ratio: number[]; labels: string[]; note: string }
const HYPS: Hyp[] = [
  { key: "3:1", ratio: [3, 1], labels: ["A_", "aa"], note: "monohybrid F2, complete dominance" },
  { key: "1:2:1", ratio: [1, 2, 1], labels: ["AA", "Aa", "aa"], note: "monohybrid F2, genotypes" },
  { key: "1:1", ratio: [1, 1], labels: ["Aa", "aa"], note: "test cross Aa × aa" },
  { key: "9:3:3:1", ratio: [9, 3, 3, 1], labels: ["A_B_", "A_bb", "aaB_", "aabb"], note: "dihybrid F2" },
  { key: "1:1:1:1", ratio: [1, 1, 1, 1], labels: ["AaBb", "Aabb", "aaBb", "aabb"], note: "dihybrid test cross" },
  { key: "9:7", ratio: [9, 7], labels: ["A_B_", "rest"], note: "complementary genes (epistasis)" },
];
const NS = [20, 50, 100, 200, 556, 1000, 7324];
const NSIM = 1000;

const STYLE = `
[data-demo="${NAME}"] { flex-direction: column; gap: .45em; }
[data-demo="${NAME}"] .cq-controls { display: flex; flex-wrap: wrap; gap: .35em 1.2em; align-items: center; }
[data-demo="${NAME}"] .cq-group { display: flex; flex-wrap: wrap; gap: .35em; align-items: center; }
[data-demo="${NAME}"] .cq-plots { display: flex; flex-wrap: wrap; gap: 12px; width: 100%; }
[data-demo="${NAME}"] .cq-plots svg { flex: 1 1 380px; min-width: 0; max-width: calc(50% - 6px); height: auto; }
[data-demo="${NAME}"] svg text { font-size: 17px; }
[data-demo="${NAME}"] svg .ttl { font-size: 19px; font-weight: 600; }
[data-demo="${NAME}"] svg .big { font-size: 21px; font-weight: 700; }
[data-demo="${NAME}"] svg .sm { font-size: 15.5px; fill: #555; }
[data-demo="${NAME}"] svg .lab { font-size: 18px; font-style: italic; font-weight: 600; }
[data-demo="${NAME}"] svg .pm { cursor: pointer; }
[data-demo="${NAME}"] svg .pm rect { fill: var(--qb-panel); stroke: #bbb; }
[data-demo="${NAME}"] svg .pm:hover rect { stroke: var(--qb-accent); }
[data-demo="${NAME}"] svg .pm text { font-size: 20px; font-weight: 700; pointer-events: none; }
[data-demo="${NAME}"] .qb-note { margin: 0; }
.reveal [data-demo="${NAME}"] { font-size: 20px; }
.reveal [data-demo="${NAME}"] .qb-note { font-size: 17px; }
@media (max-width: 760px) { [data-demo="${NAME}"] .cq-plots svg { max-width: 100%; flex-basis: 100%; } }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

const COL = { obs: "var(--qb-c1)", tail: "var(--qb-c2)", crit: "#555", sim: "#9a9a9a", low: "var(--qb-c4)" };

/** Format numbers for the readouts. */
const fE = (v: number): string => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(v >= 1000 ? 0 : 1));
const f2 = (v: number): string => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2));
function fP(p: number): string {
  if (p < 0.0001) return "< 0.0001";
  if (p < 0.001) return p.toFixed(4);
  return p.toFixed(3);
}
const fN = (v: number): string => (v >= 10000 ? v.toLocaleString("en-US").replace(/,/g, " ") : String(v));

function niceStep(x: number): number {
  const p = 10 ** Math.floor(Math.log10(x));
  const m = x / p;
  return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
}

/** Counts that add up to N and are as close as possible to N · probs. */
function roundedExpected(N: number, probs: number[]): number[] {
  const raw = probs.map(p => N * p);
  const out = raw.map(Math.floor);
  let left = N - out.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
  for (let j = 0; left > 0; j++, left--) out[order[j % order.length][1]]++;
  return out;
}

function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;
  const hi0 = Math.max(0, HYPS.findIndex(h => h.key === (ds.ratio ?? "3:1").trim()));
  const seed0 = Number(ds.seed ?? 1) || 1;
  const counts0 = numList(ds.counts, []).map(v => Math.max(0, Math.round(v)));
  const n0 = Math.max(4, Math.round(Number(ds.n ?? 100)) || 100);

  const st = {
    hi: hi0,
    obs: [] as number[],
    yTop: 10,
    sims: null as number[] | null,
    simKey: "",
    drag: -1,
  };
  const hyp = () => HYPS[st.hi];
  const probs = () => { const r = hyp().ratio, s = r.reduce((a, b) => a + b, 0); return r.map(v => v / s); };
  const total = () => st.obs.reduce((s, v) => s + v, 0);
  const key = () => `${hyp().key}|${total()}`;
  let R = rng(seed0);

  function initial(): void {
    st.hi = hi0;
    st.obs = counts0.length === hyp().ratio.length ? counts0.slice() : roundedExpected(n0, probs());
    st.sims = null;
    rescale();
  }
  function rescale(): void {
    const { exp } = chisqStat(st.obs, probs());
    const m = Math.max(...st.obs, ...exp, 4);
    const step = niceStep(m * 1.25 / 4);
    st.yTop = Math.ceil(m * 1.25 / step) * step;
  }

  // ---- controls ----
  const ctr = htmlEl("div", "cq-controls", "", host);
  const g1 = htmlEl("div", "cq-group", "", ctr);
  htmlEl("span", "", "H0 ratio:", g1);
  const hBtns = presets(g1, HYPS.map((h, i) => ({
    label: h.key, apply: () => {
      st.hi = i;
      const N = total() || n0;
      st.obs = roundedExpected(N, probs());
      st.sims = null;
      rescale(); draw();
    },
  })));
  const g2 = htmlEl("div", "cq-group", "", ctr);
  htmlEl("span", "", "N:", g2);
  const nBtns = presets(g2, NS.map(n => ({
    label: fN(n), apply: () => { st.obs = roundedExpected(n, probs()); st.sims = null; rescale(); draw(); },
  })));
  const g3 = htmlEl("div", "cq-group", "", ctr);
  button(g3, "simulate under H0", () => {
    st.obs = multinomial(Math.max(1, total()), probs(), R.unif);
    rescale(); draw();
  });
  button(g3, `simulate ${NSIM}×`, () => {
    const N = Math.max(1, total()), p = probs();
    const out: number[] = [];
    for (let s = 0; s < NSIM; s++) out.push(chisqStat(multinomial(N, p, R.unif), p).stat);
    st.sims = out; st.simKey = key();
    draw();
  });
  button(g3, "reset", () => {
    R = rng(seed0);
    initial(); draw();
  });
  const note = htmlEl("p", "qb-note", "", host);

  const plots = htmlEl("div", "cq-plots", "", host);
  const W = 560, H = 430;
  const svgA = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Observed and expected counts per class" }, plots);
  const svgB = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Chi-squared density with the observed statistic and its tail" }, plots);

  // ---------------- (a) observed vs expected ----------------
  const aL = 84, aR = W - 12, aT = 80, aB = 268;

  function drawA(): void {
    const p = probs(), k = p.length;
    const { exp, parts } = chisqStat(st.obs, p);
    const sy = scale(0, st.yTop, aB, aT);
    svgA.replaceChildren();
    svgEl("text", { x: 8, y: 24, class: "ttl" }, svgA).textContent = `Observed vs expected, N = ${fN(total())}`;
    const lg = svgEl("g", {}, svgA);
    svgEl("rect", { x: 10, y: 37, width: 18, height: 14, fill: COL.obs, "fill-opacity": 0.75 }, lg);
    svgEl("text", { x: 34, y: 50, class: "sm" }, lg).textContent = "observed O (drag the top)";
    svgEl("rect", { x: 262, y: 37, width: 18, height: 14, fill: "none", stroke: "var(--qb-fg)", "stroke-width": 2, "stroke-dasharray": "5 3" }, lg);
    svgEl("text", { x: 286, y: 50, class: "sm" }, lg).textContent = `expected E (${hyp().key})`;

    const step = niceStep(st.yTop / 4);
    for (let v = 0; v <= st.yTop + 1e-9; v += step) {
      svgEl("line", { x1: aL, x2: aR, y1: sy(v), y2: sy(v), class: v === 0 ? "axis" : "grid" }, svgA);
      svgEl("text", { x: aL - 6, y: sy(v) + 5, "text-anchor": "end", class: "sm" }, svgA).textContent = fN(v);
    }
    const yt = svgEl("text", { x: 16, y: (aT + aB) / 2, "text-anchor": "middle", transform: `rotate(-90 16 ${(aT + aB) / 2})` }, svgA);
    yt.textContent = "count";

    const colW = (aR - aL) / k, bw = Math.min(90, colW * 0.6);
    const rowLab = aB + 24, rowO = aB + 48, rowE = aB + 70, rowC = aB + 92, rowB = aB + 106;
    svgEl("text", { x: aL - 6, y: rowO, "text-anchor": "end", class: "sm" }, svgA).textContent = "O";
    svgEl("text", { x: aL - 6, y: rowE, "text-anchor": "end", class: "sm" }, svgA).textContent = "E";
    const ct = svgEl("text", { x: aL - 6, y: rowC, "text-anchor": "end", class: "sm" }, svgA);
    ct.textContent = "(O−E)²/E";
    ct.style.fontSize = "14px";
    const maxPart = Math.max(...parts);

    for (let i = 0; i < k; i++) {
      const cx = aL + colW * (i + 0.5), x0 = cx - bw / 2;
      const top = sy(Math.min(st.obs[i], st.yTop));
      svgEl("rect", { x: x0, y: top, width: bw, height: aB - top, fill: COL.obs, "fill-opacity": 0.75 }, svgA);
      svgEl("rect", { x: x0, y: sy(exp[i]), width: bw, height: aB - sy(exp[i]), fill: "none", stroke: "var(--qb-fg)", "stroke-width": 2.2, "stroke-dasharray": "6 4" }, svgA);
      // drag handle on the bar top
      const h = svgEl("rect", { x: x0 - 4, y: top - 9, width: bw + 8, height: 18, rx: 5, fill: "#fff", "fill-opacity": 0.01, stroke: COL.obs, "stroke-width": 2.5, class: "handle" }, svgA);
      h.style.cursor = "ns-resize";
      h.style.touchAction = "none";
      h.addEventListener("pointerdown", ev => { ev.preventDefault(); startDrag(i, sy); });

      svgEl("text", { x: cx, y: rowLab, "text-anchor": "middle", class: "lab" }, svgA).textContent = hyp().labels[i];
      svgEl("text", { x: cx, y: rowO, "text-anchor": "middle", "font-weight": 600 }, svgA).textContent = fN(st.obs[i]);
      svgEl("text", { x: cx, y: rowE, "text-anchor": "middle" }, svgA).textContent = fE(exp[i]);
      const c = svgEl("text", { x: cx, y: rowC, "text-anchor": "middle", "font-weight": 600 }, svgA);
      c.textContent = f2(parts[i]);
      if (parts[i] === maxPart && maxPart > 0.5) c.style.fill = COL.tail;
      // −/+ buttons
      const pm = (dx: number, lab: string, d: number) => {
        const g = svgEl("g", { class: "pm", role: "button", "aria-label": `${lab} one ${hyp().labels[i]}` }, svgA);
        svgEl("rect", { x: cx + dx - 17, y: rowB + 4, width: 34, height: 26, rx: 6 }, g);
        svgEl("text", { x: cx + dx, y: rowB + 24, "text-anchor": "middle" }, g).textContent = lab;
        g.addEventListener("click", () => { st.obs[i] = Math.max(0, st.obs[i] + d); rescale(); draw(); });
      };
      pm(-21, "−", -1);
      pm(21, "+", 1);
    }
  }

  // Dragging: the listeners sit on window, because each redraw replaces the handle.
  // The y scale is frozen while dragging and refitted on release.
  function startDrag(i: number, sy: ReturnType<typeof scale>): void {
    st.drag = i;
    const move = (e: PointerEvent) => {
      const [, y] = svgPoint(svgA, e);
      const v = Math.max(0, Math.min(Math.round(sy.invert(y)), Math.floor(st.yTop)));
      if (v !== st.obs[i]) { st.obs[i] = v; draw(); }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      st.drag = -1; rescale(); draw();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  // ---------------- (b) χ² distribution ----------------
  const bL = 62, bR = W - 14, bT = 112, bB = H - 52;

  function drawB(): void {
    const p = probs(), df = p.length - 1;
    const { stat, exp } = chisqStat(st.obs, p);
    const pval = chisqUpper(stat, df);
    const crit = chisqUpperQuantile(0.05, df);
    const xmaxBase = chisqUpperQuantile(0.002, df);
    const xmax = Math.max(xmaxBase, Math.min(stat * 1.12, xmaxBase * 2.5));
    const sx = scale(0, xmax, bL, bR);
    const ymax = df === 1 ? 1.0 : df === 2 ? 0.55 : chisqPdf(Math.max(df - 2, 0.01), df) * 1.3;
    const sy = scale(0, ymax, bB, bT);
    svgB.replaceChildren();
    const clipId = `cq-clip-${uid}`;
    const defs = svgEl("defs", {}, svgB);
    const cp = svgEl("clipPath", { id: clipId }, defs);
    svgEl("rect", { x: bL, y: bT, width: bR - bL, height: bB - bT }, cp);

    const t = svgEl("text", { x: 8, y: 26, class: "big" }, svgB);
    const parts: [string, string][] = [[`χ² = ${f2(stat)}`, COL.tail], [`  ·  df = ${df}  ·  `, ""], [`p = ${fP(pval)}`, pval < 0.05 ? COL.tail : ""]];
    for (const [s, c] of parts) { const sp = svgEl("tspan", {}, t); sp.textContent = s; if (c) sp.style.fill = c; }
    svgEl("text", { x: 8, y: 52, class: "sm" }, svgB).textContent =
      pval < 0.05 ? `p < 0.05: reject H0 (${hyp().key})` : `p ≥ 0.05: fail to reject H0 (${hyp().key})`;

    // simulated histogram
    let simLine = "";
    if (st.sims && st.simKey === key()) {
      const bw = niceStep(xmax / 30);
      const nb = Math.ceil(xmax / bw);
      const hist = new Array(nb).fill(0);
      let over = 0, ge = 0;
      for (const v of st.sims) {
        if (v >= stat - 1e-9) ge++;
        const b = Math.floor(v / bw);
        if (b < nb) hist[b]++; else over++;
      }
      const g = svgEl("g", { "clip-path": `url(#${clipId})` }, svgB);
      hist.forEach((c, b) => {
        if (!c) return;
        const d = c / st.sims!.length / bw;
        svgEl("rect", { x: sx(b * bw) + 0.5, y: sy(d), width: sx(bw) - sx(0) - 1, height: bB - sy(d), fill: COL.sim, "fill-opacity": 0.55 }, g);
      });
      simLine = `${st.sims.length} simulated χ² (grey): ${(100 * ge / st.sims.length).toFixed(1)}% ≥ observed`;
      if (over) simLine += `, ${over} off scale`;
    } else if (st.sims) {
      simLine = "N or H0 changed: simulate again";
    }
    if (simLine) svgEl("text", { x: 8, y: 76, class: "sm" }, svgB).textContent = simLine;

    // axes and grid
    const xs = niceStep(xmax / 6);
    for (let v = 0; v <= xmax + 1e-9; v += xs) {
      svgEl("line", { x1: sx(v), x2: sx(v), y1: bB, y2: bB + 5, class: "axis" }, svgB);
      svgEl("text", { x: sx(v), y: bB + 21, "text-anchor": "middle", class: "sm" }, svgB).textContent = String(+v.toFixed(2));
    }
    svgEl("line", { x1: bL, x2: bR, y1: bB, y2: bB, class: "axis" }, svgB);
    svgEl("line", { x1: bL, x2: bL, y1: bT, y2: bB, class: "axis" }, svgB);
    svgEl("text", { x: (bL + bR) / 2, y: H - 8, "text-anchor": "middle" }, svgB).textContent = "χ² statistic";
    const yt = svgEl("text", { x: 18, y: (bT + bB) / 2, "text-anchor": "middle", transform: `rotate(-90 18 ${(bT + bB) / 2})` }, svgB);
    yt.textContent = "density";

    // curve and shaded tail
    const NP = 240, pts: string[] = [], tail: string[] = [];
    const x0 = df === 1 ? xmax / 2000 : 0;
    for (let j = 0; j <= NP; j++) {
      const x = x0 + (xmax - x0) * j / NP;
      const y = Math.min(chisqPdf(x, df), ymax * 1.5);
      pts.push(`${sx(x).toFixed(1)},${sy(y).toFixed(1)}`);
    }
    if (stat < xmax) {
      tail.push(`${sx(stat).toFixed(1)},${bB}`);
      for (let j = 0; j <= NP; j++) {
        const x = stat + (xmax - stat) * j / NP;
        const y = Math.min(chisqPdf(Math.max(x, 1e-6), df), ymax * 1.5);
        tail.push(`${sx(x).toFixed(1)},${sy(y).toFixed(1)}`);
      }
      tail.push(`${bR},${bB}`);
    }
    const g = svgEl("g", { "clip-path": `url(#${clipId})` }, svgB);
    if (tail.length) svgEl("polygon", { points: tail.join(" "), fill: COL.tail, "fill-opacity": 0.3 }, g);
    svgEl("polyline", { points: pts.join(" "), fill: "none", stroke: "var(--qb-fg)", "stroke-width": 2.5 }, g);

    // 5% critical value
    if (crit < xmax) {
      svgEl("line", { x1: sx(crit), x2: sx(crit), y1: bT + 22, y2: bB, stroke: COL.crit, "stroke-width": 1.5, "stroke-dasharray": "5 4" }, svgB);
      svgEl("text", { x: sx(crit) + 5, y: bT + 16, class: "sm" }, svgB).textContent = `5% cut-off ${crit.toFixed(2)}`;
    }
    // observed statistic
    const xo = Math.min(stat, xmax);
    svgEl("line", { x1: sx(xo), x2: sx(xo), y1: bT - 4, y2: bB, stroke: COL.tail, "stroke-width": 3 }, svgB);
    const left = sx(xo) > bR - 120;
    const lab = svgEl("text", { x: sx(xo) + (left ? 6 : -6), y: bT - 8, "text-anchor": left ? "end" : "start", "font-weight": 600 }, svgB);
    lab.style.fill = COL.tail;
    lab.textContent = stat > xmax ? `observed χ² = ${f2(stat)} →` : "observed χ²";

    // note line under the controls
    const minE = Math.min(...exp);
    note.textContent = `${hyp().key}: ${hyp().note}. df = ${p.length} classes − 1 = ${df}.` +
      (minE < 5 ? `  Warning: an expected count is ${fE(minE)} (< 5), so the χ² approximation is poor.` : "");
    note.style.color = minE < 5 ? "var(--qb-c2)" : "";
  }

  function draw(): void {
    hBtns.forEach((b, i) => b.classList.toggle("active", i === st.hi));
    nBtns.forEach((b, i) => b.classList.toggle("active", NS[i] === total()));
    drawA();
    drawB();
  }

  const uid = ++uidCounter;
  initial();
  draw();
}

let uidCounter = 0;

autoMount(NAME, mount);
