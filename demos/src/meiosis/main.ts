// Meiosis stepper: one or two homologous chromosome pairs through meiosis I and II,
// coloured by parent of origin (blue = from the father, red = from the mother).
// Next/Back step through 9 stages, from G1 to the four gametes. The chromatids move
// between stages (CSS transitions), so students can follow each one.
// Modes:
//  - normal: homologues separate in anaphase I, sisters in anaphase II → four n gametes;
//  - nondisjunction in meiosis I: the homologues of the first pair go to the same pole
//    → two n+1 gametes (one copy from each parent) and two n−1 gametes;
//  - nondisjunction in meiosis II: the sisters of the first pair fail to separate in one
//    cell → one n+1 gamete (two identical copies), one n−1 and two normal gametes.
// "flip orientation" swaps the metaphase I orientation of the last pair (independent assortment).
// No crossing over (that is the Linkage unit); no randomness, so nothing to seed.
//
// Auto-mounts on <div data-demo="meiosis">. data-* options (all optional):
//   data-mode="normal|nondisjunction"  starting mode (default normal)
//   data-division="1|2"                with nondisjunction: in meiosis I (default) or II
//   data-pairs="1|2"                   number of homologous pairs (default 2)
//   data-names="21,2"                  names of the pairs, long pair first (default "1,2")
//   data-step="0..8"                   starting stage (default 0)
import { autoMount, button, htmlEl, svgEl } from "../lib/ui";

const NAME = "meiosis";
const INK = "#1b2a3a", MUTED = "#5b6b7a";
const COL = ["#2a6f97", "#bc4749"];          // homologue 0 = father (blue), 1 = mother (red)
const DARK = ["#1d4f6c", "#8a3335"];         // centromere dots
const BAD = "#c0392b", GOOD = "#2e7d32";
const W = 1000, H = 440, CY = 220;

const STYLE = `
[data-demo="${NAME}"] { flex-direction: column; align-items: stretch; gap: .45em; }
[data-demo="${NAME}"] .ms-row { display: flex; flex-wrap: wrap; gap: .35em .9em; align-items: center; }
[data-demo="${NAME}"] .ms-group { display: flex; flex-wrap: wrap; gap: .3em; align-items: center; }
[data-demo="${NAME}"] .ms-lab { font-weight: 600; }
[data-demo="${NAME}"] .ms-steps { display: flex; flex-wrap: wrap; gap: .25em; }
[data-demo="${NAME}"] .ms-steps .qb-btn { font-size: .78em; padding: .15em .45em; }
[data-demo="${NAME}"] .ms-nav .qb-btn { font-weight: 600; min-width: 5.5em; }
[data-demo="${NAME}"] svg { width: 100%; height: auto; max-height: 440px; }
[data-demo="${NAME}"] svg text { font-size: 20px; fill: ${INK}; }
[data-demo="${NAME}"] svg .cnt { font-size: 19px; fill: ${MUTED}; }
[data-demo="${NAME}"] svg .gl { font-size: 22px; font-weight: 700; }
[data-demo="${NAME}"] svg .gs { font-size: 17px; fill: ${MUTED}; }
[data-demo="${NAME}"] svg .chrom { transition: transform .6s ease, opacity .4s; }
[data-demo="${NAME}"] .ms-cap { background: var(--qb-panel); border-radius: 6px; padding: .45em .7em; min-height: 3.2em; }
[data-demo="${NAME}"] .ms-cap p { margin: .1em 0; }
[data-demo="${NAME}"] .ms-key { display: inline-block; width: .9em; height: .9em; border-radius: 3px; vertical-align: -.1em; margin: 0 .25em 0 .5em; }
.reveal [data-demo="${NAME}"] { font-size: 18px; gap: .25em; }
.reveal [data-demo="${NAME}"] svg { max-height: 400px; }
.reveal [data-demo="${NAME}"] .ms-cap { font-size: 17px; padding: .25em .6em; min-height: 2.6em; }
.reveal [data-demo="${NAME}"] .ms-steps { display: none; }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

const STAGES = [
  "Interphase (G1)", "S phase", "Prophase I", "Metaphase I", "Anaphase I",
  "Telophase I", "Metaphase II", "Anaphase II", "Gametes",
];

// Chromatid geometry: drawn vertically around its centromere at (0,0).
// Pair 0 is long and metacentric, pair 1 short with the centromere off-centre.
const LEN = [100, 60];
const TOP = [-50, -20];                    // y of the top end, relative to the centromere
const CW = 12;                             // chromatid width
const SIS = 7;                             // sister offset from the chromosome axis

interface Chromatid { p: number; h: number; s: number; g: SVGGElement }
interface Pose { x: number; y: number; a: number; o: number }

interface State {
  pairs: number;
  nd: 0 | 1 | 2;          // 0 = normal, 1 = nondisjunction in MI, 2 = in MII
  orient: number[];       // per pair: 0 → father's homologue goes left in MI
  step: number;
}

/** Meiosis I cell (0 = left, 1 = right) of homologue h of pair p. */
function miCell(st: State, p: number, h: number): number {
  if (st.nd === 1 && p === 0) return 0;
  return h ^ st.orient[p];
}

/** Meiosis II daughter (0 = top, 1 = bottom) of sister s. */
function miiDest(st: State, p: number, h: number, s: number): number {
  if (st.nd === 2 && p === 0 && miCell(st, p, h) === 0) return 0;
  return s;
}

const CELLX = [270, 730];
const GAMY = [112, 330];

function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;
  const names = (ds.names ?? "1,2").split(",").map(s => s.trim()).filter(Boolean);
  while (names.length < 2) names.push(String(names.length + 1));
  const st: State = {
    pairs: ds.pairs === "1" ? 1 : 2,
    nd: ds.mode === "nondisjunction" ? (ds.division === "2" ? 2 : 1) : 0,
    orient: [0, 1],   // father's long and mother's short homologue start on the same side
    step: Math.min(8, Math.max(0, Math.round(Number(ds.step ?? 0)) || 0)),
  };

  // ---- controls ----
  const row1 = htmlEl("div", "ms-row", "", host);
  const nav = htmlEl("div", "ms-group ms-nav", "", row1);
  const back = button(nav, "◀ Back", () => go(st.step - 1));
  const next = button(nav, "Next ▶", () => go(st.step + 1));
  button(nav, "restart", () => go(0));
  const modeG = htmlEl("div", "ms-group", "", row1);
  htmlEl("span", "ms-lab", "Mode:", modeG);
  const modeBtns = [
    button(modeG, "normal", () => setMode(0)),
    button(modeG, "nondisjunction in MI", () => setMode(1)),
    button(modeG, "nondisjunction in MII", () => setMode(2)),
  ];
  const row2 = htmlEl("div", "ms-row", "", host);
  const pairG = htmlEl("div", "ms-group", "", row2);
  htmlEl("span", "ms-lab", "Pairs:", pairG);
  const pairBtns = [button(pairG, "1", () => setPairs(1)), button(pairG, "2", () => setPairs(2))];
  button(pairG, "flip orientation", () => { st.orient[st.pairs - 1] ^= 1; update(); });
  const key = htmlEl("span", "qb-note", "", row2);
  const stepsRow = htmlEl("div", "ms-steps", "", host);
  const stepBtns = STAGES.map((s, i) => button(stepsRow, `${i + 1}. ${s}`, () => go(i)));

  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Chromosomes in meiosis" }, host);
  const bg = svgEl("g", {}, svg);
  const mid = svgEl("g", {}, svg);
  const fg = svgEl("g", {}, svg);
  const cap = htmlEl("div", "ms-cap", "", host);

  let chromatids: Chromatid[] = [];

  function build(): void {
    mid.replaceChildren();
    chromatids = [];
    for (let p = 0; p < st.pairs; p++)
      for (let h = 0; h < 2; h++)
        for (let s = 0; s < 2; s++) {
          const g = svgEl("g", { class: "chrom" }, mid);
          svgEl("rect", { x: -CW / 2, y: TOP[p], width: CW, height: LEN[p], rx: CW / 2, fill: COL[h] }, g);
          svgEl("circle", { cx: s ? -3 : 3, cy: 0, r: 5, fill: DARK[h] }, g);   // dots touch: sisters joined
          chromatids.push({ p, h, s, g });
        }
    // place without animation
    const poses = layout();
    chromatids.forEach((c, i) => { c.g.style.transition = "none"; place(c, poses[i]); });
    void svg.getBoundingClientRect();
    chromatids.forEach(c => { c.g.style.transition = ""; });
  }

  function place(c: Chromatid, q: Pose): void {
    c.g.style.transform = `translate(${q.x}px, ${q.y}px) rotate(${q.a}deg)`;
    c.g.style.opacity = String(q.o);
  }

  function go(i: number): void { st.step = Math.min(8, Math.max(0, i)); update(); }
  function setMode(m: 0 | 1 | 2): void { st.nd = m; update(); }
  function setPairs(n: number): void { st.pairs = n; build(); update(); }

  // y of pair p's row when the pairs are stacked (metaphase I, anaphase I)
  const rowY = (p: number) => (st.pairs === 1 ? CY : CY + (p === 0 ? -78 : 78));

  /** Pose of every chromatid at the current step. */
  function layout(): Pose[] {
    const k = st.step;
    return chromatids.map(c => {
      const { p, h, s } = c;
      const sx = s ? SIS : -SIS;
      const cMI = miCell(st, p, h);
      if (k <= 1) {                                     // scattered in the nucleus
        const X = st.pairs === 1 ? [430, 560] : [370, 470];
        const x = p === 0 ? X[h] : [560, 650][h];
        const y = p === 0 ? CY + (h ? 12 : -10) : CY + (h ? 22 : -18);
        return { x: x + (k === 0 ? 0 : sx), y, a: 0, o: k === 0 && s === 1 ? 0 : 1 };
      }
      if (k === 2) {                                    // paired homologues (bivalents)
        const cx = st.pairs === 1 ? 500 : p === 0 ? 420 : 590;
        return { x: cx + (h ? 14 : -14) + sx, y: CY, a: 0, o: 1 };
      }
      if (k === 3) {                                    // bivalents on the equator
        const side = h ^ st.orient[p] ? 1 : -1;           // where it sits on the plate
        return { x: 500 + side * 14 + sx, y: rowY(p), a: 0, o: 1 };
      }
      if (k === 4) {                                    // homologues to the poles
        const mates = chromatidsIn(q => q.p === p && miCell(st, q.p, q.h) === cMI && q.s === 0);
        const j = mates.findIndex(q => q.h === h);
        const off = mates.length > 1 ? (j === 0 ? -17 : 17) : 0;
        return { x: 500 + (cMI ? 185 : -185) + off + sx, y: rowY(p), a: 0, o: 1 };
      }
      if (k === 5) {                                    // two cells, chromosomes upright
        const list = chromosomesInMI(cMI);
        const j = list.findIndex(q => q.p === p && q.h === h);
        return { x: CELLX[cMI] + (j - (list.length - 1) / 2) * 48 + sx, y: CY, a: 0, o: 1 };
      }
      if (k === 6 || k === 7) {                         // MII spindle is vertical: chromosomes lie flat
        const list = chromosomesInMI(cMI);
        const widths = list.map(q => LEN[q.p]);
        const gap = 18, total = widths.reduce((a, b) => a + b, 0) + gap * (list.length - 1);
        let x0 = CELLX[cMI] - total / 2;
        const j = list.findIndex(q => q.p === p && q.h === h);
        for (let i = 0; i < j; i++) x0 += widths[i] + gap;
        const centre = x0 + widths[j] / 2;
        // rotate(90deg) maps (0, y) to (−y, 0): the rod's middle ends up at x − (TOP + LEN/2)
        const x = centre + (TOP[p] + LEN[p] / 2);
        if (k === 6) return { x, y: CY + sx, a: 90, o: 1 };
        const t = miiDest(st, p, h, s);
        const together = st.nd === 2 && p === 0 && cMI === 0;
        return { x, y: CY + (t ? 78 : -78) + (together ? sx : 0), a: 90, o: 1 };
      }
      // k === 8: gametes, chromosomes upright side by side
      const t = miiDest(st, p, h, s);
      const list = chromatidsIn(q => miCell(st, q.p, q.h) === cMI && miiDest(st, q.p, q.h, q.s) === t);
      const j = list.findIndex(q => q.p === p && q.h === h && q.s === s);
      return { x: CELLX[cMI] + (j - (list.length - 1) / 2) * 30, y: GAMY[t] + (p === 1 ? -10 : 0), a: 0, o: 1 };
    });
  }

  function chromatidsIn(f: (c: Chromatid) => boolean): Chromatid[] {
    return chromatids.filter(f).sort((a, b) => a.p - b.p || a.h - b.h || a.s - b.s);
  }
  /** Replicated chromosomes (sister 0 stands for both) in meiosis I cell c. */
  function chromosomesInMI(c: number): Chromatid[] {
    return chromatidsIn(q => q.s === 0 && miCell(st, q.p, q.h) === c);
  }

  // ---- background: cells, spindles, labels ----
  function drawScene(poses: Pose[]): void {
    bg.replaceChildren();
    fg.replaceChildren();
    const k = st.step;
    const cell = (cx: number, cy: number, rx: number, ry: number) =>
      svgEl("ellipse", { cx, cy, rx, ry, fill: "#f4f6f8", stroke: "#7a8794", "stroke-width": 2.5 }, bg);
    const pole = (x: number, y: number) => svgEl("circle", { cx: x, cy: y, r: 7, fill: MUTED }, bg);
    const fibre = (x1: number, y1: number, x2: number, y2: number) =>
      svgEl("line", { x1, y1, x2, y2, stroke: "#9aa5b1", "stroke-width": 1.6 }, bg);
    const text = (x: number, y: number, s: string, cls: string, anchor = "middle", fill?: string) => {
      const t = svgEl("text", { x, y, "text-anchor": anchor, class: cls }, fg);
      if (fill) t.setAttribute("fill", fill), t.style.fill = fill;
      t.textContent = s;
      return t;
    };
    const n = st.pairs;

    if (k <= 3) {
      cell(500, CY, 300, 170);
      if (k <= 1) svgEl("ellipse", { cx: 510, cy: CY, rx: 200, ry: 110, fill: "none", stroke: "#b8c2cc", "stroke-width": 2, "stroke-dasharray": "6 5" }, bg);
      if (k === 3) {
        svgEl("line", { x1: 500, y1: 62, x2: 500, y2: 378, stroke: "#c9d1d9", "stroke-width": 2, "stroke-dasharray": "4 6" }, bg);
        pole(180, CY); pole(820, CY);
        for (let p = 0; p < n; p++) for (let h = 0; h < 2; h++) {
          const side = h ^ st.orient[p] ? 1 : -1;
          const toward = miCell(st, p, h);                       // nondisjunction: both to the left pole
          fibre(toward ? 820 : 180, CY, 500 + side * 14 + (side < 0 ? -SIS : SIS), rowY(p));
        }
      }
      const chromo = 2 * n, chromatidsN = k === 0 ? 2 * n : 4 * n;
      text(500, 420, k === 2 || k === 3
        ? `1 cell · ${n} bivalent${n > 1 ? "s" : ""} · ${chromo} chromosomes · ${chromatidsN} chromatids`
        : `1 cell · 2n = ${chromo} chromosomes · ${chromatidsN} chromatids`, "cnt");
    } else if (k === 4) {
      cell(500, CY, 340, 165);
      pole(150, CY); pole(850, CY);
      chromatids.forEach((c, i) => {
        if (c.s !== 0) return;
        const c0 = miCell(st, c.p, c.h);
        fibre(c0 ? 850 : 150, CY, poses[i].x + SIS, poses[i].y);
      });
      text(500, 420, st.nd === 1 ? "both homologues of the first pair go to the left pole" : "homologues separate; sisters stay together", "cnt");
    } else if (k <= 7) {
      for (let c = 0; c < 2; c++) {
        cell(CELLX[c], CY, 205, k === 7 ? 185 : 160);
        const list = chromosomesInMI(c);
        if (k >= 6) {
          const py = k === 7 ? [40, 400] : [72, 368];
          pole(CELLX[c], py[0]); pole(CELLX[c], py[1]);
          chromatids.forEach((q, i) => {
            if (miCell(st, q.p, q.h) !== c) return;
            const t = miiDest(st, q.p, q.h, q.s);
            fibre(CELLX[c], py[t], poses[i].x, poses[i].y);
          });
        }
        if (k !== 7) {
          const nc = list.length;
          const lab = nc === n ? `n = ${nc}` : nc > n ? `n + ${nc - n} = ${nc}` : `n − ${n - nc} = ${nc}`;
          text(CELLX[c], 423, `${lab} chromosomes · ${2 * nc} chromatids`, "cnt", "middle", nc === n ? undefined : BAD);
        }
      }
    } else {
      for (let c = 0; c < 2; c++) for (let t = 0; t < 2; t++) {
        const gx = CELLX[c], gy = GAMY[t];
        svgEl("circle", { cx: gx, cy: gy, r: 88, fill: "#f4f6f8", stroke: "#7a8794", "stroke-width": 2.5 }, bg);
        const inG = chromatidsIn(q => miCell(st, q.p, q.h) === c && miiDest(st, q.p, q.h, q.s) === t);
        const nc = inG.length;
        const ok = nc === n && new Set(inG.map(q => q.p)).size === n;
        const lab = nc === n ? `n = ${nc}` : nc > n ? `n + 1 = ${nc}` : `n − 1 = ${nc}`;
        text(gx + 104, gy - 4, lab, "gl", "start", ok ? GOOD : BAD);
        const nm = names[0];
        const copies = inG.filter(q => q.p === 0).length;
        const same = copies === 2 && inG.filter(q => q.p === 0).every(q => q.h === inG[0].h);
        const sub = ok ? "normal" : copies === 2 ? (same ? `2 identical copies of chr ${nm}` : `2 copies of chr ${nm}`) : `no chr ${nm}`;
        text(gx + 104, gy + 22, sub, "gs", "start");
      }
    }
  }

  function caption(): string[] {
    const k = st.step, n = st.pairs, nm = names[0];
    const pairsTxt = n === 1 ? `one pair of homologous chromosomes (chromosome ${nm})` : `two pairs of homologous chromosomes (long: chromosome ${names[0]}, short: chromosome ${names[1]})`;
    const ndNote = st.nd === 1 ? " Watch the first pair: it will not separate in anaphase I." : st.nd === 2 ? " Watch the first pair in the left cell during meiosis II." : "";
    switch (k) {
      case 0: return [`<b>Interphase (G1).</b> A diploid cell (2n = ${2 * n}) with ${pairsTxt}. In each pair one homologue came from the father (blue) and one from the mother (red). Each chromosome is one DNA molecule: one chromatid.${ndNote}`];
      case 1: return [`<b>S phase.</b> Every chromosome is replicated and now has two identical <b>sister chromatids</b> joined at the centromere. Still 2n = ${2 * n} chromosomes, but ${4 * n} chromatids: the DNA content has doubled.`];
      case 2: return [`<b>Prophase I.</b> Homologues pair along their length (synapsis). Each pair is now a <b>bivalent</b> of four chromatids. Crossing over happens here (next unit, <i>Linkage & recombination</i>); this demo leaves it out.`];
      case 3: return st.nd === 1
        ? [`<b>Metaphase I.</b> The bivalents line up on the equator. Here both homologues of chromosome ${nm} are attached to the <b>same</b> (left) pole: nondisjunction is about to happen.`]
        : [`<b>Metaphase I.</b> The bivalents line up on the equator, one homologue facing each pole. ${n === 2 ? "Each pair's orientation is random and independent of the other pair: this is <b>independent assortment</b>. Press <i>flip orientation</i> to try the other one." : "Which homologue faces which pole is random: ½ each."}`];
      case 4: return st.nd === 1
        ? [`<b>Anaphase I: nondisjunction.</b> The two homologues of chromosome ${nm} fail to separate and both go to the left pole. The other pairs separate normally.`]
        : [`<b>Anaphase I.</b> <b>Homologues</b> separate and move to opposite poles; sister chromatids stay together. Meiosis I is the <b>reductional</b> division, and it is where the two alleles of a gene segregate (Mendel's first law).`];
      case 5: return st.nd === 1
        ? [`<b>Telophase I.</b> Two cells, but unequal: the left one has both copies of chromosome ${nm} (n + 1), the right one has none (n − 1). Each chromosome still has two chromatids.`]
        : [`<b>Telophase I.</b> Two cells, each <b>haploid</b> (n = ${n}): one chromosome of each pair, but each chromosome still has two chromatids.`];
      case 6: return [`<b>Metaphase II.</b> In each cell the chromosomes line up on a new spindle, at right angles to the first. Meiosis II works like mitosis, but with only one set of chromosomes.${st.nd === 2 ? " In the left cell, both sister chromatids of chromosome " + nm + " are attached to the top pole." : ""}`];
      case 7: return st.nd === 2
        ? [`<b>Anaphase II: nondisjunction.</b> In the left cell the sister chromatids of chromosome ${nm} fail to separate and both go to the top pole. The right cell divides normally.`]
        : [`<b>Anaphase II.</b> The <b>sister chromatids</b> separate and move to opposite poles. Meiosis II is the <b>equational</b> division.`];
      default: {
        if (st.nd === 1) return [
          `<b>Gametes.</b> All four are abnormal: two are <b>n + 1</b> (one father's <i>and</i> one mother's copy of chromosome ${nm}), two are <b>n − 1</b> (no copy).`,
          `Fertilised by a normal gamete: n + 1 gives a <b>trisomic</b> zygote (2n + 1), n − 1 a <b>monosomic</b> one (2n − 1).`];
        if (st.nd === 2) return [
          `<b>Gametes.</b> Two are normal (n = ${n}). One is <b>n + 1</b> with two <b>identical</b> copies of chromosome ${nm} (same colour: sister chromatids), and one is <b>n − 1</b>.`,
          `Compare with nondisjunction in MI, where the n + 1 gamete carries one copy from each grandparent. Markers that tell the copies apart reveal in which division the error happened.`];
        return [
          `<b>Gametes.</b> Four haploid cells (n = ${n}), each with exactly one chromosome of each pair and one chromatid per chromosome.`,
          n === 2 ? `Which parent's copy a gamete gets is decided independently for each pair: with 2 pairs there are 2² = 4 combinations (press <i>flip orientation</i>); with 23 pairs, 2²³ ≈ 8.4 million.` : `Half the gametes carry the father's copy, half the mother's: the 1 : 1 segregation of Mendel's first law.`];
      }
    }
  }

  function update(): void {
    const poses = layout();
    chromatids.forEach((c, i) => place(c, poses[i]));
    drawScene(poses);
    cap.replaceChildren();
    for (const html of caption()) { const p = htmlEl("p", "", "", cap); p.innerHTML = html; }
    back.disabled = st.step === 0;
    next.disabled = st.step === 8;
    modeBtns.forEach((b, i) => b.classList.toggle("active", i === st.nd));
    pairBtns.forEach((b, i) => b.classList.toggle("active", i + 1 === st.pairs));
    stepBtns.forEach((b, i) => b.classList.toggle("active", i === st.step));
    key.innerHTML = `Stage ${st.step + 1}/9: <b>${STAGES[st.step]}</b>`
      + `<span class="ms-key" style="background:${COL[0]}"></span>from father`
      + `<span class="ms-key" style="background:${COL[1]}"></span>from mother`;
  }

  build();
  update();
}

autoMount(NAME, mount);
