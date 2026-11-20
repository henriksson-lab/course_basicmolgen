// Three-point testcross: which gene is in the middle?
// The demo lists the 8 offspring classes of a three-point testcross (each class = one
// kind of gamete from the triple heterozygote). The student picks a gene order. For that
// order the demo
//  - draws each class as a small chromosome, loci coloured by which parental chromosome
//    the allele came from (blue / red), so the crossovers show up as colour switches;
//  - groups the classes into parental, single crossover (SCO) in region I and II, and
//    double crossover (DCO), and checks whether the "DCO" pair is really the rarest;
//  - computes the two distances, the expected DCO count, the coefficient of coincidence
//    (CoC) and the interference I = 1 - CoC, and draws the map.
// Presets: the unit's Drosophila data (invented teaching counts on the real X-linked
// order cv - ct - v), a maize data set (invented), and random data sets (seeded).
//
// Auto-mounts on <div data-demo="threepoint">. data-* options (all optional):
//   data-preset="fly|maize|random"   starting data set (default fly)
//   data-order="0|1|2"               index of the gene placed in the middle (default: none)
//   data-seed="1"                    seed of the first random data set
import { svgEl, htmlEl, button, rng, autoMount } from "../lib/ui";

const NAME = "threepoint";
const INK = "#1b2a3a", MUTED = "#5b6b7a", BLUE = "#2a6f97", RED = "#bc4749";
const TINT: Record<Cat, string> = { P: "#eef1f4", S1: "#dbe8d1", S2: "#e3dcef", D: "#f6e2c2", N: "#ffffff" };
const CATCOL: Record<Cat, string> = { P: "#4a5866", S1: "#4f7a37", S2: "#6b4f99", D: "#b06f12", N: MUTED };

const STYLE = `
[data-demo="${NAME}"] { flex-direction: column; gap: .45em; align-items: stretch; }
[data-demo="${NAME}"] .tp-row { display: flex; flex-wrap: wrap; gap: .35em 1.1em; align-items: center; }
[data-demo="${NAME}"] .tp-group { display: flex; flex-wrap: wrap; gap: .3em; align-items: center; }
[data-demo="${NAME}"] .tp-lab { font-weight: 600; }
[data-demo="${NAME}"] .tp-main { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-start; }
[data-demo="${NAME}"] .tp-fig { flex: 62 1 420px; min-width: 0; max-width: 680px; }
[data-demo="${NAME}"] .tp-fig svg { width: 100%; height: auto; }
[data-demo="${NAME}"] .tp-main .qb-readout { flex: 38 1 260px; min-width: 0; margin: 0; }
[data-demo="${NAME}"] svg text { font-size: 18px; fill: ${INK}; }
[data-demo="${NAME}"] svg .hd { font-size: 17px; font-weight: 600; }
[data-demo="${NAME}"] svg .al { font-style: italic; font-size: 19px; }
[data-demo="${NAME}"] svg .sm { font-size: 15px; fill: ${MUTED}; }
[data-demo="${NAME}"] .qb-readout b.ok { color: #2f7d32; }
[data-demo="${NAME}"] .qb-readout b.bad { color: ${RED}; }
.qb-demo[data-demo="${NAME}"] .qb-readout { white-space: normal; line-height: 1.4; font-family: inherit; font-size: .95em; }
[data-demo="${NAME}"] .qb-readout p { margin: .1em 0 .35em; }
.reveal [data-demo="${NAME}"] { font-size: 18px; gap: .3em; }
.reveal [data-demo="${NAME}"] .qb-btn { font-size: .85em; padding: .15em .55em; }
.reveal [data-demo="${NAME}"] .tp-fig { flex: 1 1 640px; max-width: 660px; }
.reveal [data-demo="${NAME}"] .tp-main .qb-readout { flex: 0 1 430px; }
.reveal .qb-demo[data-demo="${NAME}"] .qb-readout { font-size: 17px; }
.reveal [data-demo="${NAME}"] .qb-note { display: none; }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

/** P = parental, S1/S2 = single crossover in region I/II, D = double crossover, N = no order chosen. */
type Cat = "P" | "S1" | "S2" | "D" | "N";

interface DataSet {
  label: string;
  genes: [string, string, string];   // mutant allele symbols; wild type is written "+"
  classes: { a: number[]; n: number }[];   // a[i] = 1 if the gamete carries the mutant allele of gene i
  note: string;
}

// Invented teaching counts (see three-point-cross/data/). Gene order on the X: cv - ct - v.
// Female parent: v cv+ ct+ / v+ cv ct (alleles listed as v, cv, ct).
const FLY: DataSet = {
  label: "Drosophila v ct cv",
  genes: ["v", "cv", "ct"],
  classes: [
    { a: [1, 0, 0], n: 812 }, { a: [0, 1, 1], n: 799 },
    { a: [1, 1, 1], n: 121 }, { a: [0, 0, 0], n: 128 },
    { a: [0, 0, 1], n: 66 }, { a: [1, 1, 0], n: 63 },
    { a: [1, 0, 1], n: 6 }, { a: [0, 1, 0], n: 5 },
  ],
  note: "Invented teaching counts. Female: v cv⁺ ct⁺ / v⁺ cv ct.",
};

// Invented teaching counts. Maize lg, gl, bm; in this invented data set the order is lg - gl - bm.
const MAIZE: DataSet = {
  label: "maize lg gl bm",
  genes: ["lg", "gl", "bm"],
  classes: [
    { a: [1, 1, 1], n: 286 }, { a: [0, 0, 0], n: 301 },
    { a: [1, 1, 0], n: 98 }, { a: [0, 0, 1], n: 92 },
    { a: [0, 1, 1], n: 112 }, { a: [1, 0, 0], n: 98 },
    { a: [0, 1, 0], n: 7 }, { a: [1, 0, 1], n: 6 },
  ],
  note: "Invented teaching counts. Parent: lg gl bm / + + + (coupling).",
};

/** A random three-point data set: random middle gene, distances, interference, phase and N. */
function randomSet(seed: number): DataSet {
  const r = rng(seed * 7919 + 13);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r.unif() * xs.length)];
  const names = pick([["a", "b", "c"], ["y", "sn", "m"], ["pr", "c", "px"], ["d", "e", "f"]]) as string[];
  const mid = Math.floor(r.unif() * 3);
  const order = [0, 1, 2].filter(i => i !== mid);
  const ord = [order[0], mid, order[1]];          // left, middle, right gene indices
  const d1 = 0.04 + r.unif() * 0.2, d2 = 0.04 + r.unif() * 0.2;
  const I = pick([0, 0.2, 0.4, 0.6, 0.8, 1]);
  const N = pick([500, 1000, 2000]);
  const pD = (1 - I) * d1 * d2;
  const probs = [1 - d1 - d2 + pD, d1 - pD, d2 - pD, pD];   // P, S1, S2, D
  const parent = [0, 1, 2].map(() => (r.unif() < 0.5 ? 1 : 0));   // alleles on the "blue" chromosome
  // a gamete for each category, as [origin of left, middle, right] with 0 = blue chromosome
  const origins = [[0, 0, 0], [0, 1, 1], [0, 0, 1], [0, 1, 0]];
  const counts = new Map<string, { a: number[]; n: number }>();
  const add = (a: number[]) => {
    const k = a.join("");
    if (!counts.has(k)) counts.set(k, { a, n: 0 });
    counts.get(k)!.n++;
  };
  // make sure all 8 classes are listed, even with 0 counts
  for (const o of origins) for (const flip of [0, 1]) {
    const a = [0, 0, 0];
    ord.forEach((g, j) => { a[g] = (o[j] ^ flip) ? 1 - parent[g] : parent[g]; });
    counts.set(a.join(""), { a, n: 0 });
  }
  for (let i = 0; i < N; i++) {
    const u = r.unif();
    let c = 0, acc = probs[0];
    while (u > acc && c < 3) { c++; acc += probs[c]; }
    const flip = r.unif() < 0.5 ? 1 : 0;
    const a = [0, 0, 0];
    ord.forEach((g, j) => { a[g] = (origins[c][j] ^ flip) ? 1 - parent[g] : parent[g]; });
    add(a);
  }
  return {
    label: "random", genes: names as [string, string, string],
    classes: [...counts.values()].sort((x, y) => y.n - x.n),
    note: `Random data set #${seed} (simulated: N = ${N}).`,
  };
}

interface Analysis {
  ord: number[];               // left, middle, right gene indices
  cat: Cat[];                  // per class
  n: Record<Cat, number>;
  N: number;
  d1: number; d2: number;      // RF in region I (left-middle) and II (middle-right)
  expD: number; coc: number;
  rarestOk: boolean;           // the DCO pair is the smallest pair
  parentalOk: boolean;         // the parental pair is the largest pair
}

/** Which chromosome (0 = blue, 1 = red) each allele of class a came from; blue = most common class. */
function origin(ds: DataSet, a: number[]): number[] {
  const top = ds.classes.reduce((m, c) => (c.n > m.n ? c : m)).a;
  return a.map((x, i) => (x === top[i] ? 0 : 1));
}

function analyse(ds: DataSet, mid: number): Analysis {
  const others = [0, 1, 2].filter(i => i !== mid);
  const ord = [others[0], mid, others[1]];
  const N = ds.classes.reduce((s, c) => s + c.n, 0);
  const n: Record<Cat, number> = { P: 0, S1: 0, S2: 0, D: 0, N: 0 };
  const cat = ds.classes.map(c => {
    const o = origin(ds, c.a);
    const s1 = o[ord[0]] !== o[ord[1]], s2 = o[ord[1]] !== o[ord[2]];
    const k: Cat = s1 && s2 ? "D" : s1 ? "S1" : s2 ? "S2" : "P";
    n[k] += c.n;
    return k;
  });
  const d1 = (n.S1 + n.D) / N, d2 = (n.S2 + n.D) / N;
  const expD = d1 * d2 * N;
  const pairs = [n.P, n.S1, n.S2, n.D];
  return {
    ord, cat, n, N, d1, d2, expD, coc: expD > 0 ? n.D / expD : NaN,
    rarestOk: n.D <= Math.min(n.S1, n.S2), parentalOk: n.P >= Math.max(...pairs),
  };
}

const PRESETS: Record<string, () => DataSet> = { fly: () => FLY, maize: () => MAIZE };

function mount(host: HTMLElement): void {
  injectStyle();
  const ds0 = host.dataset;
  let seed = Math.max(1, Math.round(Number(ds0.seed ?? 1)) || 1);
  let data: DataSet = ds0.preset === "random" ? randomSet(seed) : (PRESETS[ds0.preset ?? ""] ?? PRESETS.fly)();
  let mid: number | null = ["0", "1", "2"].includes(ds0.order ?? "") ? Number(ds0.order) : null;

  const row1 = htmlEl("div", "tp-row", "", host);
  const gD = htmlEl("span", "tp-group", "", row1);
  htmlEl("span", "tp-lab", "data:", gD);
  const dataBtns: HTMLButtonElement[] = [];
  const setData = (d: DataSet, i: number) => {
    data = d; mid = null;
    dataBtns.forEach((b, j) => b.classList.toggle("active", j === i));
    buildOrderBtns(); draw();
  };
  dataBtns.push(button(gD, "Drosophila", () => setData(FLY, 0)));
  dataBtns.push(button(gD, "maize", () => setData(MAIZE, 1)));
  dataBtns.push(button(gD, "random", () => { seed++; setData(randomSet(seed), 2); }));
  dataBtns[ds0.preset === "random" ? 2 : ds0.preset === "maize" ? 1 : 0].classList.add("active");

  const row2 = htmlEl("div", "tp-row", "", host);
  const gO = htmlEl("span", "tp-group", "", row2);
  let orderBtns: HTMLButtonElement[] = [];
  function buildOrderBtns(): void {
    gO.replaceChildren();
    htmlEl("span", "tp-lab", "gene order:", gO);
    orderBtns = [0, 1, 2].map(m => {
      const o = [0, 1, 2].filter(i => i !== m);
      const b = button(gO, "", () => { mid = m; draw(); });
      b.innerHTML = [o[0], m, o[1]].map(g => `<i>${data.genes[g]}</i>`).join(" – ");
      return b;
    });
  }
  buildOrderBtns();
  button(row2, "clear order", () => { mid = null; draw(); });

  const main = htmlEl("div", "tp-main", "", host);
  const W = 640, ROWH = 42, TOP = 48, H = TOP + 8 * ROWH + 84;
  const fig = htmlEl("div", "tp-fig", "", main);
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": "Offspring classes of a three-point testcross" }, fig);
  const out = htmlEl("div", "qb-readout", "", main);
  const note = htmlEl("p", "qb-note", "", host);

  const txt = (x: number, y: number, s: string, attrs: Record<string, string | number> = {}) => {
    const t = svgEl("text", { x, y, ...attrs }, svg);
    t.textContent = s;
    return t;
  };

  function draw(): void {
    orderBtns.forEach((b, m) => b.classList.toggle("active", m === mid));
    const A = mid === null ? null : analyse(data, mid);
    const ord = A ? A.ord : [0, 1, 2];
    const N = data.classes.reduce((s, c) => s + c.n, 0);
    const rank: Record<Cat, number> = { P: 0, S1: 1, S2: 2, D: 3, N: 0 };
    const rows = data.classes.map((c, i) => ({ c, cat: (A ? A.cat[i] : "N") as Cat }))
      .sort((x, y) => rank[x.cat] - rank[y.cat] || y.c.n - x.c.n);
    const maxN = Math.max(...data.classes.map(c => c.n));

    svg.replaceChildren();
    // header: gene columns in the chosen order
    const XG = [36, 92, 148], XC0 = 196, XC1 = 336, XN = 400, XB = 412, BW = 112;
    ord.forEach((g, j) => txt(XG[j], 30, data.genes[g], { class: "hd al", "text-anchor": "middle" }));
    txt((XC0 + XC1) / 2, 30, "chromosome", { class: "hd", "text-anchor": "middle" });
    txt(XN, 30, "count", { class: "hd", "text-anchor": "end" });
    txt(W - 8, 30, A ? "class" : "", { class: "hd", "text-anchor": "end" });

    const catName = (k: Cat): string => {
      if (!A) return "";
      const g = (j: number) => data.genes[A.ord[j]];
      return k === "P" ? "parental" : k === "D" ? "DCO" : k === "S1" ? `SCO ${g(0)}–${g(1)}` : `SCO ${g(1)}–${g(2)}`;
    };

    rows.forEach((r, i) => {
      const y = TOP + i * ROWH;
      svgEl("rect", { x: 2, y: y + 2, width: W - 4, height: ROWH - 4, rx: 6, fill: TINT[r.cat] }, svg);
      const cy = y + ROWH / 2;
      const o = origin(data, r.c.a);
      ord.forEach((g, j) => {
        const mut = r.c.a[g] === 1;
        txt(XG[j], cy + 7, mut ? data.genes[g] : "+", {
          class: mut ? "al" : "", "text-anchor": "middle", fill: o[g] ? RED : BLUE, "font-weight": 600,
        });
      });
      // the chromosome: three loci, segments coloured by origin; a switch = a crossover
      const lx = [XC0 + 10, (XC0 + XC1) / 2, XC1 - 10];
      const col = (g: number) => (o[g] ? RED : BLUE);
      for (let j = 0; j < 3; j++) {
        const g = ord[j];
        const left = j === 0 ? XC0 : (lx[j - 1] + lx[j]) / 2;
        const right = j === 2 ? XC1 : (lx[j] + lx[j + 1]) / 2;
        svgEl("rect", { x: left, y: cy - 6, width: right - left, height: 12, fill: col(g), rx: j === 1 ? 0 : 5 }, svg);
      }
      for (let j = 0; j < 2; j++) if (o[ord[j]] !== o[ord[j + 1]]) {
        const x = (lx[j] + lx[j + 1]) / 2;
        svgEl("path", { d: `M${x - 6},${cy - 12} L${x + 6},${cy + 12} M${x + 6},${cy - 12} L${x - 6},${cy + 12}`, stroke: INK, "stroke-width": 2.5 }, svg);
      }
      lx.forEach(x => svgEl("line", { x1: x, x2: x, y1: cy - 9, y2: cy + 9, stroke: "#fff", "stroke-width": 2 }, svg));
      txt(XN, cy + 6, String(r.c.n), { "text-anchor": "end", "font-family": "ui-monospace, monospace" });
      const bw = maxN ? (BW * r.c.n) / maxN : 0;
      svgEl("rect", { x: XB, y: cy - 8, width: Math.max(bw, r.c.n ? 1.5 : 0), height: 16, fill: CATCOL[r.cat], opacity: 0.85 }, svg);
      if (A) txt(W - 8, cy + 6, catName(r.cat), { "text-anchor": "end", fill: CATCOL[r.cat], "font-size": 16, "font-weight": 600 });
    });

    // the map
    const ym = TOP + 8 * ROWH + 40;
    if (A) {
      const tot = A.d1 + A.d2, x0 = 70, x1 = W - 70;
      const xm = x0 + (x1 - x0) * (tot > 0 ? A.d1 / tot : 0.5);
      svgEl("line", { x1: x0 - 20, x2: x1 + 20, y1: ym, y2: ym, stroke: INK, "stroke-width": 3 }, svg);
      [x0, xm, x1].forEach((x, j) => {
        svgEl("line", { x1: x, x2: x, y1: ym - 10, y2: ym + 10, stroke: INK, "stroke-width": 3 }, svg);
        txt(x, ym + 32, data.genes[A.ord[j]], { class: "al", "text-anchor": "middle", "font-weight": 600 });
      });
      txt((x0 + xm) / 2, ym - 14, `${(100 * A.d1).toFixed(1)} cM`, { "text-anchor": "middle" });
      txt((xm + x1) / 2, ym - 14, `${(100 * A.d2).toFixed(1)} cM`, { "text-anchor": "middle" });
    } else {
      txt(W / 2, ym + 6, "Pick a gene order to classify the offspring and draw the map.", { class: "sm", "text-anchor": "middle" });
    }

    // readout
    out.replaceChildren();
    const para = (html: string) => { const p = htmlEl("p", "", "", out); p.innerHTML = html; };
    para(`<b>N = ${N}</b> testcross offspring, 8 classes in 4 reciprocal pairs.`);
    if (!A) {
      para("Blue alleles came from one chromosome of the heterozygous parent, red from the other (blue = the most common class).");
      para("Which gene, placed in the middle, makes the <b>rarest</b> pair of classes need two crossovers?");
    } else {
      const g = (j: number) => `<i>${data.genes[A.ord[j]]}</i>`;
      const f = (x: number) => (100 * x).toFixed(1);
      para(A.rarestOk
        ? `<b class="ok">✓ ${g(1)} in the middle:</b> the DCO pair (${A.n.D}) is the rarest pair.`
        : `<b class="bad">✗ Not this order:</b> it calls a pair of ${A.n.D} double crossovers, but a pair of ${Math.min(A.n.S1, A.n.S2)} is rarer. Double crossovers should be the rarest classes.`);
      para(`${g(0)}–${g(1)}: (${A.n.S1} + ${A.n.D}) / ${N} = <b>${f(A.d1)} cM</b><br>` +
        `${g(1)}–${g(2)}: (${A.n.S2} + ${A.n.D}) / ${N} = <b>${f(A.d2)} cM</b><br>` +
        `${g(0)}–${g(2)}: ${f(A.d1)} + ${f(A.d2)} = <b>${f(A.d1 + A.d2)} cM</b>`);
      para(`Expected DCO = ${A.d1.toFixed(3)} × ${A.d2.toFixed(3)} × ${N} = ${A.expD.toFixed(1)}; observed ${A.n.D}.<br>` +
        `CoC = ${A.n.D} / ${A.expD.toFixed(1)} = <b>${Number.isFinite(A.coc) ? A.coc.toFixed(2) : "–"}</b>; ` +
        `I = 1 − CoC = <b>${Number.isFinite(A.coc) ? (1 - A.coc).toFixed(2) : "–"}</b>`);
      if (!A.rarestOk) para("With the wrong order, CoC comes out above 1: far more “double crossovers” than single ones would predict.");
    }
    note.textContent = data.note + " + = wild-type allele. A cross on the chromosome marks a crossover between two loci.";
  }

  draw();
}

autoMount(NAME, mount);
