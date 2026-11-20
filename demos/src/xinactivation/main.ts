// X inactivation mosaic: random choice in a few progenitor cells, then clonal growth.
// Left: a patch of tissue as a grid of cells. At the time of X inactivation the embryo has
// N progenitor cells; each one independently (probability ½ each) silences either the
// maternal or the paternal X, and all its descendants keep that choice. The progenitors
// then grow into clonal patches (random region growth from N random starting cells).
// A "cell mixing" slider moves a fraction of cells to random places, from coherent patches
// (as in a calico cat's coat) to a fine salt-and-pepper mosaic (as in blood).
// Right: the fraction of cells with the maternal X active in this embryo, and a histogram
// of that fraction over 1000 simulated embryos with the same N (binomial, k of N
// progenitors), with the share of embryos that are skewed at least 80 : 20.
//
// Auto-mounts on <div data-demo="xinactivation">. data-* options (all optional):
//   data-n="16"      progenitor cells at the time of inactivation (1–256, default 16)
//   data-mix="0"     cell mixing 0–1 (default 0)
//   data-seed="1"
import { svgEl, htmlEl, button, slider, presets, rng, autoMount } from "../lib/ui";

const NAME = "xinactivation";
const INK = "#1b2a3a";
const COL_M = "#e07b39";  // maternal X active (orange, as X^O in a calico cat)
const COL_P = "#262626";  // paternal X active (black)
const NS = [1, 2, 4, 8, 16, 32, 64, 128, 256];
const GW = 72, GH = 44, CS = 9;   // grid size and cell size in px
const REPS = 1000;

const STYLE = `
[data-demo="${NAME}"] { flex-direction: column; gap: .35em; }
[data-demo="${NAME}"] .xi-row { display: flex; flex-wrap: wrap; gap: .4em 1.4em; align-items: center; }
[data-demo="${NAME}"] .xi-row .qb-slider { min-width: 330px; }
[data-demo="${NAME}"] svg { width: 100%; height: auto; max-width: 1120px; }
[data-demo="${NAME}"] svg text { font-size: 18px; fill: ${INK}; }
[data-demo="${NAME}"] svg .ttl { font-size: 20px; font-weight: 600; }
[data-demo="${NAME}"] svg .sm { font-size: 16px; fill: #4a5866; }
[data-demo="${NAME}"] svg .big { font-size: 30px; font-weight: 700; }
.reveal [data-demo="${NAME}"] { font-size: 18px; }
.reveal [data-demo="${NAME}"] .qb-btn { font-size: .8em; }
.reveal [data-demo="${NAME}"] .qb-note { display: none; }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

/** Grow N clonal patches on the grid; returns the progenitor choice (1 = maternal active) and the cell labels. */
function grow(n: number, mix: number, seed: number): { prog: number[]; cells: Int8Array } {
  const r = rng(seed);
  const prog = Array.from({ length: n }, () => (r.unif() < 0.5 ? 1 : 0));
  const owner = new Int32Array(GW * GH).fill(-1);
  const active: number[] = [];
  // N distinct random start cells
  let placed = 0;
  while (placed < n) {
    const i = Math.floor(r.unif() * GW * GH);
    if (owner[i] >= 0) continue;
    owner[i] = placed++;
    active.push(i);
  }
  // random region growth (Eden growth from all seeds at once)
  while (active.length) {
    const k = Math.floor(r.unif() * active.length);
    const i = active[k], x = i % GW, y = (i / GW) | 0;
    const nb: number[] = [];
    if (x > 0 && owner[i - 1] < 0) nb.push(i - 1);
    if (x < GW - 1 && owner[i + 1] < 0) nb.push(i + 1);
    if (y > 0 && owner[i - GW] < 0) nb.push(i - GW);
    if (y < GH - 1 && owner[i + GW] < 0) nb.push(i + GW);
    if (!nb.length) { active[k] = active[active.length - 1]; active.pop(); continue; }
    const j = nb[Math.floor(r.unif() * nb.length)];
    owner[j] = owner[i];
    active.push(j);
  }
  const cells = new Int8Array(GW * GH);
  for (let i = 0; i < cells.length; i++) cells[i] = prog[owner[i]];
  // cell mixing: swap a fraction of cells with random cells anywhere
  for (let i = 0; i < cells.length; i++) {
    if (r.unif() < mix) {
      const j = Math.floor(r.unif() * cells.length);
      const t = cells[i]; cells[i] = cells[j]; cells[j] = t;
    }
  }
  return { prog, cells };
}

/** Fractions maternal (k/N) over many simulated embryos. */
function replicateFractions(n: number, seed: number): number[] {
  const r = rng(seed * 7919 + n);
  const out: number[] = [];
  for (let k = 0; k < REPS; k++) {
    let m = 0;
    for (let i = 0; i < n; i++) if (r.unif() < 0.5) m++;
    out.push(m / n);
  }
  return out;
}

function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;
  const n0 = Number(ds.n ?? 16);
  let ni = NS.reduce((best, v, i) => (Math.abs(v - n0) < Math.abs(NS[best] - n0) ? i : best), 4);
  let mix = Math.min(1, Math.max(0, Number(ds.mix ?? 0) || 0));
  let seed = Number(ds.seed ?? 1) || 1;

  const row = htmlEl("div", "xi-row", "", host);
  const sN = slider(row, "progenitor cells N", 0, NS.length - 1, 1, ni, v => { ni = v; draw(); }, v => String(NS[v]));
  const sM = slider(row, "cell mixing", 0, 1, 0.05, mix, v => { mix = v; draw(); }, v => v.toFixed(2));
  button(row, "new embryo", () => { seed++; draw(); });
  const prow = htmlEl("div", "xi-row", "", host);
  presets(prow, [
    { label: "calico cat (N = 16, patches)", apply: () => { ni = 4; mix = 0; seed = 1; sync(); draw(); } },
    { label: "very early (N = 2)", apply: () => { ni = 1; mix = 0; seed = 1; sync(); draw(); } },
    { label: "many progenitors (N = 256)", apply: () => { ni = 8; mix = 0; seed = 1; sync(); draw(); } },
    { label: "mixed tissue (blood)", apply: () => { ni = 6; mix = 0.9; seed = 1; sync(); draw(); } },
  ]);
  button(prow, "reset", () => { ni = 4; mix = 0; seed = 1; sync(); draw(); });
  function sync(): void { sN.set(ni); sM.set(mix); }

  const W = 1120, H = 470;
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img",
    "aria-label": "A mosaic of cells coloured by which X is active, and a histogram of the maternal fraction over many embryos" }, host);
  htmlEl("p", "qb-note", "Each progenitor silences the maternal or the paternal X at random (½ each); its descendants keep the choice. The histogram repeats that choice in 1000 embryos with the same N.", host);

  const gx = 10, gy = 44;

  function draw(): void {
    const n = NS[ni];
    svg.replaceChildren();
    const { prog, cells } = grow(n, mix, seed);
    svgEl("text", { x: gx, y: 26, class: "ttl" }, svg).textContent = `Tissue of one female (embryo ${seed}), N = ${n}`;
    // cells
    for (let i = 0; i < cells.length; i++) {
      const x = i % GW, y = (i / GW) | 0;
      svgEl("rect", { x: gx + x * CS, y: gy + y * CS, width: CS, height: CS, fill: cells[i] ? COL_M : COL_P }, svg);
    }
    svgEl("rect", { x: gx, y: gy, width: GW * CS, height: GH * CS, fill: "none", stroke: INK, "stroke-width": 1.5 }, svg);

    // right panel
    const rx = 700;
    const km = prog.reduce((a, b) => a + b, 0);
    let tm = 0; for (let i = 0; i < cells.length; i++) tm += cells[i];
    const fT = tm / cells.length;
    // legend
    svgEl("rect", { x: rx, y: 12, width: 18, height: 18, fill: COL_M }, svg);
    svgEl("text", { x: rx + 26, y: 27 }, svg).textContent = "maternal X active";
    svgEl("rect", { x: rx + 210, y: 12, width: 18, height: 18, fill: COL_P }, svg);
    svgEl("text", { x: rx + 236, y: 27 }, svg).textContent = "paternal X active";
    svgEl("text", { x: rx, y: 70, class: "sm" }, svg).textContent = `progenitors: ${km} of ${n} chose the maternal X`;
    const t = svgEl("text", { x: rx, y: 108 }, svg);
    svgEl("tspan", { class: "big" }, t).textContent = `${Math.round(100 * fT)} : ${100 - Math.round(100 * fT)}`;
    svgEl("tspan", { class: "sm", dx: 10 }, t).textContent = "maternal : paternal, % of cells";
    const skew = Math.max(fT, 1 - fT) >= 0.8;
    const sk = svgEl("text", { x: rx, y: 136, "font-weight": 600 }, svg);
    sk.textContent = skew ? "skewed X inactivation (≥ 80 : 20)" : "balanced (not skewed)";
    sk.style.fill = skew ? "#c62828" : "#2e7d32";

    // histogram of k/N over many embryos
    const fr = replicateFractions(n, seed);
    // one bar per possible k/N when N is small, otherwise 40 bins of 2.5 %
    const nb = Math.min(n + 1, 41);
    const bins = new Array(nb).fill(0);
    fr.forEach(f => { bins[Math.round(f * (nb - 1))]++; });
    const hx0 = rx + 34, hx1 = 1086, hy0 = 410, hy1 = 218;
    const X = (v: number) => hx0 + v * (hx1 - hx0);
    const ymax = Math.max(...bins);
    const bw = Math.min(40, (hx1 - hx0) / nb);
    const nSk = fr.filter(f => f <= 0.2 || f >= 0.8).length;
    svgEl("text", { x: rx, y: 172, class: "ttl" }, svg).textContent =
      `1000 embryos, N = ${n}: ${(100 * nSk / REPS).toFixed(1)}% skewed`;
    // skew zones (≤ 20 % or ≥ 80 %)
    svgEl("rect", { x: hx0 - bw / 2, y: hy1, width: X(0.2) - hx0 + bw / 2, height: hy0 - hy1, fill: "#fde8e8" }, svg);
    svgEl("rect", { x: X(0.8), y: hy1, width: hx1 - X(0.8) + bw / 2, height: hy0 - hy1, fill: "#fde8e8" }, svg);
    bins.forEach((c, i) => {
      const h = (hy0 - hy1 - 26) * c / ymax;
      svgEl("rect", { x: X(i / (nb - 1)) - bw / 2 + 1, y: hy0 - h, width: bw - 2, height: h, fill: "#7a8ea3" }, svg);
    });
    svgEl("line", { x1: hx0 - bw / 2, y1: hy0, x2: hx1 + bw / 2, y2: hy0, stroke: INK, "stroke-width": 1.5 }, svg);
    for (const v of [0, 0.2, 0.5, 0.8, 1]) {
      const x = X(v);
      svgEl("line", { x1: x, y1: hy0, x2: x, y2: hy0 + 6, stroke: INK }, svg);
      svgEl("text", { x, y: hy0 + 24, "text-anchor": "middle", class: "sm" }, svg).textContent = `${Math.round(v * 100)}%`;
    }
    svgEl("text", { x: (hx0 + hx1) / 2, y: hy0 + 50, "text-anchor": "middle", class: "sm" }, svg)
      .textContent = "% of progenitors with the maternal X active";
    // this embryo
    const mx = X(km / n);
    svgEl("path", { d: `M${mx},${hy1 - 4} l-8,-14 l16,0 z`, fill: "#c62828" }, svg);
    svgEl("text", { x: mx, y: hy1 - 22, "text-anchor": mx > 1020 ? "end" : mx < 780 ? "start" : "middle", class: "sm" }, svg)
      .textContent = "this embryo";
    svgEl("text", { x: hx0 - bw / 2 + 4, y: hy1 + 18, class: "sm" }, svg).textContent = "skewed";
    const sTxt = svgEl("text", { x: hx1 + bw / 2 - 4, y: hy1 + 18, "text-anchor": "end", class: "sm" }, svg);
    sTxt.textContent = "skewed";
  }

  draw();
}

autoMount(NAME, mount);
