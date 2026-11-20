// LOD score curve. Each family is summarised by n informative meioses, of which k are
// recombinant between the disease locus and the marker. For a phase-known family
//   L(θ) = θ^k (1−θ)^(n−k),    LOD(θ) = log10( L(θ) / L(0.5) ) = log10( L(θ) · 2^n );
// for a phase-unknown family both phases are equally likely a priori:
//   L(θ) = ½ [θ^k (1−θ)^(n−k) + θ^(n−k) (1−θ)^k].
// Families are independent, so their LODs ADD. The plot shows each family's curve (thin)
// and the total (thick) over θ ∈ [0, 0.5], with the thresholds +3 (linkage) and −2
// (exclusion), the maximum LOD and θ̂, and the θ range excluded (total LOD < −2).
//
// Auto-mounts on <div data-demo="lod">. data-* options (all optional):
//   data-families="10:1 6:0 8:1u"   n:k per family; a trailing "u" = phase unknown
//   data-preset="one|hd|exclude"    start from a preset (overrides data-families)
//   data-seed="1"                   seed for "random family"
import { svgEl, htmlEl, button, presets, rng, autoMount, scale } from "../lib/ui";

const NAME = "lod";
const INK = "#1b2a3a", MUTED = "#5b6b7a";
const BLUE = "#2a6f97", RED = "#bc4749", GREEN = "#6a994e", ORANGE = "#d08c2f";
const FAM_COL = ["#7fa7c4", "#d39a9b", "#a7c093", "#e3b878", "#a99bc4", "#8fbfb8", "#c9a37f", "#9aa5b1"];
const MAXFAM = 8, MAXN = 20;

const STYLE = `
[data-demo="${NAME}"] .ld-fams { display: flex; flex-direction: column; gap: .3em; }
[data-demo="${NAME}"] .ld-fam { display: grid; grid-template-columns: 1.2em auto 1fr 1.6em auto 1fr 1.6em auto auto; gap: .25em .4em; align-items: center;
  background: var(--qb-panel); border-radius: 6px; padding: .2em .45em; }
[data-demo="${NAME}"] .ld-fam input[type=range] { width: 100%; min-width: 4em; accent-color: ${BLUE}; }
[data-demo="${NAME}"] .ld-fam output { font-family: ui-monospace, monospace; min-width: 1.4em; text-align: right; color: var(--qb-fg); font-weight: 600; }
[data-demo="${NAME}"] .ld-sw { width: 1.1em; height: 1.1em; border-radius: 3px; }
[data-demo="${NAME}"] .ld-fam label { white-space: nowrap; font-size: .85em; }
[data-demo="${NAME}"] .ld-fam .qb-btn { padding: .05em .45em; }
[data-demo="${NAME}"] .ld-row { display: flex; flex-wrap: wrap; gap: .35em; }
[data-demo="${NAME}"] svg { width: 100%; height: auto; }
[data-demo="${NAME}"] svg text { font-size: 17px; fill: ${INK}; }
[data-demo="${NAME}"] svg .sm { font-size: 15px; fill: ${MUTED}; }
[data-demo="${NAME}"] svg .ttl { font-size: 18px; font-weight: 600; }
[data-demo="${NAME}"] .qb-plot { flex: 1 1 420px; max-width: 620px; }
[data-demo="${NAME}"] .qb-panel { flex: 1 1 330px; max-width: 440px; }
.reveal [data-demo="${NAME}"] { font-size: 18px; gap: .8em; }
.reveal [data-demo="${NAME}"] .qb-plot { flex: 1 1 560px; max-width: 640px; }
.reveal [data-demo="${NAME}"] .qb-panel { flex: 1 1 420px; max-width: 480px; }
.reveal [data-demo="${NAME}"] .qb-readout { font-size: 15px; }
.reveal [data-demo="${NAME}"] .qb-note { display: none; }
.reveal [data-demo="${NAME}"] .ld-fam { padding: .05em .4em; }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

// ---------------- likelihood ----------------

interface Family { n: number; k: number; unknown: boolean; }

const LOG2 = Math.log10(2);
/** log10 of θ^a (1−θ)^b, with 0^0 = 1. */
function logPow(theta: number, a: number, b: number): number {
  const t1 = a === 0 ? 0 : a * Math.log10(theta);
  const t2 = b === 0 ? 0 : b * Math.log10(1 - theta);
  return t1 + t2;
}
/** LOD of one family at θ (may be −Infinity at θ = 0). */
function lod(f: Family, theta: number): number {
  const { n, k } = f;
  if (!f.unknown) return logPow(theta, k, n - k) + n * LOG2;
  const a = logPow(theta, k, n - k), b = logPow(theta, n - k, k);
  const m = Math.max(a, b);
  if (m === -Infinity) return -Infinity;
  return m + Math.log10(0.5 * (Math.pow(10, a - m) + Math.pow(10, b - m))) + n * LOG2;
}
const total = (fs: Family[], t: number) => fs.reduce((s, f) => s + lod(f, t), 0);

const GRID = Array.from({ length: 501 }, (_, i) => i * 0.001);   // θ = 0, 0.001, …, 0.5

function maxLod(fs: Family[]): { theta: number; lod: number } {
  let best = { theta: 0.5, lod: total(fs, 0.5) };
  for (const t of GRID) { const v = total(fs, t); if (v > best.lod + 1e-12) best = { theta: t, lod: v }; }
  return best;
}

// ---------------- presets ----------------

const PRESETS: Record<string, Family[]> = {
  one: [{ n: 10, k: 1, unknown: false }],
  hd: [
    { n: 10, k: 1, unknown: false }, { n: 6, k: 0, unknown: false }, { n: 8, k: 1, unknown: false },
    { n: 5, k: 0, unknown: false }, { n: 7, k: 1, unknown: false },
  ],
  exclude: [
    { n: 8, k: 4, unknown: false }, { n: 6, k: 3, unknown: false }, { n: 10, k: 4, unknown: false },
  ],
};
const PRESET_LABEL: [string, string][] = [["one", "one family (10, 1)"], ["hd", "five families"], ["exclude", "unlinked marker"]];

function parseFamilies(s: string | undefined): Family[] | null {
  if (!s) return null;
  const out: Family[] = [];
  for (const tok of s.trim().split(/[\s,]+/)) {
    const m = /^(\d+):(\d+)(u?)$/i.exec(tok);
    if (!m) return null;
    const n = Math.min(MAXN, Math.max(1, Number(m[1]))), k = Math.min(n, Number(m[2]));
    out.push({ n, k, unknown: m[3] !== "" });
  }
  return out.length ? out.slice(0, MAXFAM) : null;
}

const fmt = (v: number, d = 2) => (v === -Infinity ? "−∞" : v.toFixed(d).replace("-", "−"));

// ---------------- mount ----------------

function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;
  const start: Family[] = (ds.preset && PRESETS[ds.preset]) || parseFamilies(ds.families) || PRESETS.one;
  const seed0 = Number(ds.seed ?? 1) || 1;
  let R = rng(seed0);
  let fams: Family[] = start.map(f => ({ ...f }));

  // ---- plot ----
  const plotBox = htmlEl("div", "qb-plot", "", host);
  const W = 600, H = 440, L = 70, Rr = W - 18, T = 40, B = H - 58;
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "LOD score against recombination fraction theta" }, plotBox);

  // ---- panel ----
  const panel = htmlEl("div", "qb-panel", "", host);
  htmlEl("div", "", "Families (n meioses, k recombinants)", panel).style.fontWeight = "600";
  const famBox = htmlEl("div", "ld-fams", "", panel);
  const row1 = htmlEl("div", "ld-row", "", panel);
  const addBtn = button(row1, "+ add family", () => { if (fams.length < MAXFAM) { fams.push({ n: 6, k: 0, unknown: false }); build(); } });
  button(row1, "+ random family", () => {
    if (fams.length >= MAXFAM) return;
    // a family drawn under true linkage at θ = 0.05, 4–12 meioses
    const n = 4 + Math.floor(R.unif() * 9);
    let k = 0; for (let i = 0; i < n; i++) if (R.unif() < 0.05) k++;
    fams.push({ n, k, unknown: false }); build();
  });
  button(row1, "reset", () => { R = rng(seed0); fams = start.map(f => ({ ...f })); presetBtns.forEach(b => b.classList.remove("active")); build(); });
  htmlEl("div", "", "Presets:", panel);
  const presetBtns = presets(panel, PRESET_LABEL.map(([key, label]) => ({
    label, apply: () => { fams = PRESETS[key].map(f => ({ ...f })); build(); },
  })));
  const readout = htmlEl("div", "qb-readout", "", panel);
  htmlEl("p", "qb-note", "Phase known: L(θ) = θᵏ(1−θ)ⁿ⁻ᵏ. LOD = log₁₀ L(θ)/L(0.5). Tick \"phase ?\" to average over both phases. LODs of independent families add.", panel);

  function build(): void {
    famBox.replaceChildren();
    fams.forEach((f, i) => {
      const row = htmlEl("div", "ld-fam", "", famBox);
      const sw = htmlEl("span", "ld-sw", "", row);
      sw.style.background = FAM_COL[i % FAM_COL.length];
      htmlEl("span", "", "n", row);
      const nIn = htmlEl("input", "", "", row);
      Object.assign(nIn, { type: "range", min: "1", max: String(MAXN), step: "1", value: String(f.n) });
      const nOut = htmlEl("output", "", "", row);
      htmlEl("span", "", "k", row);
      const kIn = htmlEl("input", "", "", row);
      Object.assign(kIn, { type: "range", min: "0", max: String(f.n), step: "1", value: String(f.k) });
      const kOut = htmlEl("output", "", "", row);
      const lab = htmlEl("label", "", "", row);
      const cb = htmlEl("input", "", "", lab);
      cb.type = "checkbox"; cb.checked = f.unknown;
      lab.append(" phase ?");
      button(row, "×", () => { fams.splice(i, 1); build(); });
      const sync = () => { nOut.value = String(f.n); kOut.value = String(f.k); };
      sync();
      nIn.addEventListener("input", () => {
        f.n = Number(nIn.value); f.k = Math.min(f.k, f.n);
        kIn.max = String(f.n); kIn.value = String(f.k); sync(); draw();
      });
      kIn.addEventListener("input", () => { f.k = Number(kIn.value); sync(); draw(); });
      cb.addEventListener("change", () => { f.unknown = cb.checked; cb.blur(); draw(); });
      for (const inp of [nIn, kIn]) { inp.addEventListener("pointerup", () => inp.blur()); inp.addEventListener("change", () => inp.blur()); }
    });
    addBtn.disabled = fams.length >= MAXFAM;
    draw();
  }

  function draw(): void {
    svg.replaceChildren();
    const best = fams.length ? maxLod(fams) : { theta: 0.5, lod: 0 };
    // y range: always show −2 … 3, extend to the data (clip the −∞ end at yMin)
    let yMax = 3.5, yMin = -4;
    for (const t of GRID) {
      const v = total(fams, t);
      if (Number.isFinite(v)) yMax = Math.max(yMax, v);
      for (const f of fams) { const u = lod(f, t); if (Number.isFinite(u)) yMax = Math.max(yMax, u); }
    }
    yMax = Math.ceil(yMax + 0.3);
    const sx = scale(0, 0.5, L, Rr), sy = scale(yMin, yMax, B, T);
    const clip = (v: number) => Math.max(yMin, Math.min(yMax, v));

    // grid and axes
    const ystep = yMax - yMin > 12 ? 2 : 1;
    for (let v = Math.ceil(yMin / ystep) * ystep; v <= yMax + 1e-9; v += ystep) {
      svgEl("line", { x1: L, x2: Rr, y1: sy(v), y2: sy(v), class: v === 0 ? "axis" : "grid" }, svg);
      svgEl("text", { x: L - 8, y: sy(v) + 5, "text-anchor": "end", class: "sm" }, svg).textContent = fmt(v, 0);
    }
    for (let t = 0; t <= 0.5 + 1e-9; t += 0.1) {
      svgEl("line", { x1: sx(t), x2: sx(t), y1: B, y2: B + 6, class: "axis" }, svg);
      svgEl("text", { x: sx(t), y: B + 24, "text-anchor": "middle", class: "sm" }, svg).textContent = t.toFixed(1);
    }
    svgEl("line", { x1: L, x2: L, y1: T, y2: B, class: "axis" }, svg);
    svgEl("line", { x1: L, x2: Rr, y1: B, y2: B, class: "axis" }, svg);
    svgEl("text", { x: (L + Rr) / 2, y: H - 10, "text-anchor": "middle" }, svg).textContent = "recombination fraction θ";
    svgEl("text", { x: 18, y: (T + B) / 2, "text-anchor": "middle", transform: `rotate(-90 18 ${(T + B) / 2})` }, svg).textContent = "LOD score";

    // thresholds
    svgEl("line", { x1: L, x2: Rr, y1: sy(3), y2: sy(3), stroke: GREEN, "stroke-width": 2, "stroke-dasharray": "8 5" }, svg);
    svgEl("text", { x: Rr - 4, y: sy(3) - 6, "text-anchor": "end", fill: GREEN, class: "sm" }, svg).textContent = "+3: linkage";
    svgEl("line", { x1: L, x2: Rr, y1: sy(-2), y2: sy(-2), stroke: RED, "stroke-width": 2, "stroke-dasharray": "8 5" }, svg);
    svgEl("text", { x: Rr - 4, y: sy(-2) + 18, "text-anchor": "end", fill: RED, class: "sm" }, svg).textContent = "−2: excluded";

    // excluded θ region (total < −2)
    const excl = GRID.filter(t => total(fams, t) < -2);
    if (fams.length && excl.length) {
      const x1 = sx(excl[0]), x2 = sx(excl[excl.length - 1]);
      svgEl("rect", { x: x1, y: sy(-2), width: Math.max(1, x2 - x1), height: B - sy(-2), fill: RED, "fill-opacity": 0.08 }, svg);
    }

    const path = (fn: (t: number) => number) => {
      let d = "", pen = false;
      for (const t of GRID) {
        const v = fn(t);
        if (!(v >= yMin)) { pen = false; continue; }      // below the plot (or −∞): lift the pen
        d += (pen ? "L" : "M") + sx(t).toFixed(1) + "," + sy(clip(v)).toFixed(1);
        pen = true;
      }
      return d;
    };
    if (fams.length > 1) fams.forEach((f, i) =>
      svgEl("path", { d: path(t => lod(f, t)), fill: "none", stroke: FAM_COL[i % FAM_COL.length], "stroke-width": 2.2 }, svg));
    if (fams.length) {
      svgEl("path", { d: path(t => total(fams, t)), fill: "none", stroke: BLUE, "stroke-width": 4 }, svg);
      // max marker
      if (Number.isFinite(best.lod) && best.lod <= yMax) {
        const cx = sx(best.theta), cy = sy(best.lod);
        svgEl("line", { x1: cx, x2: cx, y1: cy, y2: B, stroke: ORANGE, "stroke-width": 1.5, "stroke-dasharray": "4 3" }, svg);
        svgEl("circle", { cx, cy, r: 7, fill: ORANGE, stroke: "#fff", "stroke-width": 2 }, svg);
        const right = cx < (L + Rr) / 2;
        svgEl("text", { x: cx + (right ? 12 : -12), y: Math.max(T + 14, cy - 10), "text-anchor": right ? "start" : "end", class: "ttl", fill: ORANGE }, svg)
          .textContent = `max ${fmt(best.lod)} at θ̂ = ${best.theta.toFixed(3)}`;
      }
    }
    svgEl("text", { x: L, y: 24, class: "ttl" }, svg).textContent =
      fams.length > 1 ? `Total LOD (thick) and ${fams.length} families (thin)` : "LOD curve of one family";

    // readout
    if (!fams.length) { readout.textContent = "Add a family."; return; }
    const N = fams.reduce((s, f) => s + f.n, 0), K = fams.reduce((s, f) => s + f.k, 0);
    let verdict: string;
    if (best.lod >= 3) verdict = "max LOD ≥ 3: significant evidence for linkage.";
    else if (excl.length && excl[0] === 0 && excl[excl.length - 1] >= 0.01)
      verdict = `max LOD < 3. LOD < −2 for θ < ${(excl[excl.length - 1] + 0.001).toFixed(3)}: linkage closer than that is excluded.`;
    else verdict = "max LOD < 3: not yet significant. Add families (more meioses)." +
      (K > 0 ? " Any recombinant rules out θ = 0." : "");
    readout.textContent =
      `${fams.length} famil${fams.length === 1 ? "y" : "ies"}: ${N} meioses, ${K} recombinant${K === 1 ? "" : "s"}` +
      `${fams.some(f => f.unknown) ? " (some phase unknown)" : ""}\n` +
      `max LOD = ${fmt(best.lod)} at θ̂ = ${best.theta.toFixed(3)}\n` +
      `LOD(0) = ${fmt(total(fams, 0))}   LOD(0.1) = ${fmt(total(fams, 0.1))}\n` + verdict;
  }

  build();
}

autoMount(NAME, mount);
