// Epistasis: two genes in one pathway change the dihybrid F2 ratio.
// Left: the 4×4 Punnett square of AaBb × AaBb, each cell coloured by the phenotype that
// genotype gives under the chosen interaction. Right: a small pathway diagram (precursor →
// enzyme A → intermediate → enzyme B → pigment, parallel enzymes, or an inhibitor), the
// collapsed F2 ratio as a bar of 16 squares, and a readout for the selected cell.
// Click a Punnett cell: the pathway shows which enzymes work for that genotype (green ✓ or
// grey ✗), whether the inhibitor is active, and which compounds are made (faded = not made).
//
// Auto-mounts on <div data-demo="epistasis">. data-* options (all optional):
//   data-preset="none|recessive|complementary|dominant|suppression|duplicate"
//                (default "recessive": 9:3:4)
//   data-cell="AaBb"   genotype selected first (default AaBb, the F1)
import { autoMount, htmlEl, presets, svgEl } from "../lib/ui";

const NAME = "epistasis";

const STYLE = `
[data-demo="${NAME}"] { flex-direction: column; gap: .4em; }
[data-demo="${NAME}"] .ep-top { display: flex; flex-wrap: wrap; gap: .35em 1em; align-items: center; }
[data-demo="${NAME}"] svg { width: 100%; height: auto; max-width: 1120px; }
[data-demo="${NAME}"] svg text { font-size: 18px; }
[data-demo="${NAME}"] svg .ttl { font-size: 20px; font-weight: 600; }
[data-demo="${NAME}"] svg .gam { font-size: 20px; font-weight: 700; font-style: italic; }
[data-demo="${NAME}"] svg .geno { font-size: 18px; font-style: italic; pointer-events: none; }
[data-demo="${NAME}"] svg .sm { font-size: 16px; fill: #555; }
[data-demo="${NAME}"] svg .node { font-size: 17px; pointer-events: none; }
[data-demo="${NAME}"] svg .enz { font-size: 17px; font-weight: 700; font-style: italic; }
[data-demo="${NAME}"] svg .big { font-size: 26px; font-weight: 700; }
[data-demo="${NAME}"] svg .cell { cursor: pointer; }
[data-demo="${NAME}"] svg .cell:hover { stroke: #1b2a3a; stroke-width: 2.5; }
.reveal [data-demo="${NAME}"] { font-size: 19px; }
.reveal [data-demo="${NAME}"] .qb-note { font-size: 16px; }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------- model
type Gene = "A" | "B";
interface Pheno { key: string; name: string; col: string }
interface PNode { id: string; x: number; y: number; label: string; col: string; start?: boolean }
interface PEdge { from: string; to: string; gene: Gene | null; bend?: number }
interface Inhib { gene: Gene; edge: number; x: number; y: number }
interface Preset {
  key: string; button: string; title: string; example: string;
  phenos: Pheno[];
  pheno: (A: boolean, B: boolean) => string;   // A = has a dominant A allele (A_), B likewise
  nodes: PNode[]; edges: PEdge[]; inhib?: Inhib;
}

const C = {
  white: "#f6f3ea", purple: "#7b3fa0", red: "#c0392b", blue: "#2a6f97", black: "#262626",
  brown: "#7b4a26", yellow: "#e8b923", green: "#5f9e4a",
};

const PRESETS: Preset[] = [
  {
    key: "none", button: "no interaction 9:3:3:1", title: "Two separate pathways (no epistasis)",
    example: "Each gene makes its own pigment, and the two pigments mix.\nNo gene hides the other: four phenotypes, 9:3:3:1.",
    phenos: [
      { key: "P", name: "purple", col: C.purple }, { key: "R", name: "red", col: C.red },
      { key: "U", name: "blue", col: C.blue }, { key: "W", name: "white", col: C.white }],
    pheno: (A, B) => (A && B ? "P" : A ? "R" : B ? "U" : "W"),
    nodes: [
      { id: "p1", x: 90, y: 30, label: "precursor 1", col: C.white, start: true },
      { id: "r", x: 470, y: 30, label: "red pigment", col: C.red },
      { id: "p2", x: 90, y: 140, label: "precursor 2", col: C.white, start: true },
      { id: "u", x: 470, y: 140, label: "blue pigment", col: C.blue }],
    edges: [{ from: "p1", to: "r", gene: "A" }, { from: "p2", to: "u", gene: "B" }],
  },
  {
    key: "recessive", button: "recessive epistasis 9:3:4", title: "Recessive epistasis: aa hides gene B",
    example: "e.g. Labrador coat: E/e plays the role of A (ee dogs make no dark pigment\nand are yellow), and B/b decides black vs brown.",
    phenos: [
      { key: "K", name: "black", col: C.black }, { key: "N", name: "brown", col: C.brown },
      { key: "Y", name: "yellow", col: C.yellow }],
    pheno: (A, B) => (!A ? "Y" : B ? "K" : "N"),
    nodes: [
      { id: "s", x: 70, y: 75, label: "yellow", col: C.yellow, start: true },
      { id: "m", x: 310, y: 75, label: "brown", col: C.brown },
      { id: "e", x: 550, y: 75, label: "black", col: C.black }],
    edges: [{ from: "s", to: "m", gene: "A" }, { from: "m", to: "e", gene: "B" }],
  },
  {
    key: "complementary", button: "complementary 9:7", title: "Complementary genes: both steps needed",
    example: "e.g. sweet pea flowers (Bateson and Punnett): two white-flowered lines\ngive a purple F₁, because each line supplies the step the other lacks.",
    phenos: [{ key: "P", name: "purple", col: C.purple }, { key: "W", name: "white", col: C.white }],
    pheno: (A, B) => (A && B ? "P" : "W"),
    nodes: [
      { id: "s", x: 70, y: 75, label: "colourless", col: C.white, start: true },
      { id: "m", x: 310, y: 75, label: "colourless", col: C.white },
      { id: "e", x: 550, y: 75, label: "purple", col: C.purple }],
    edges: [{ from: "s", to: "m", gene: "A" }, { from: "m", to: "e", gene: "B" }],
  },
  {
    key: "dominant", button: "dominant epistasis 12:3:1", title: "Dominant epistasis: A_ blocks the first step",
    example: "e.g. summer squash fruit: W_ is white whatever Y/y is;\nww Y_ is yellow; ww yy is green.",
    phenos: [
      { key: "W", name: "white", col: C.white }, { key: "Y", name: "yellow", col: C.yellow },
      { key: "G", name: "green", col: C.green }],
    pheno: (A, B) => (A ? "W" : B ? "Y" : "G"),
    nodes: [
      { id: "s", x: 70, y: 45, label: "white", col: C.white, start: true },
      { id: "m", x: 310, y: 45, label: "green", col: C.green },
      { id: "e", x: 550, y: 45, label: "yellow", col: C.yellow }],
    edges: [{ from: "s", to: "m", gene: null }, { from: "m", to: "e", gene: "B" }],
    inhib: { gene: "A", edge: 0, x: 190, y: 160 },
  },
  {
    key: "suppression", button: "dominant suppression 13:3", title: "Dominant suppression: A_ inhibits enzyme B",
    example: "e.g. chicken feathers: the dominant allele I suppresses colour,\nso only ii C_ birds are coloured.",
    phenos: [{ key: "W", name: "white", col: C.white }, { key: "P", name: "coloured", col: C.purple }],
    pheno: (A, B) => (!A && B ? "P" : "W"),
    nodes: [
      { id: "s", x: 140, y: 45, label: "colourless", col: C.white, start: true },
      { id: "e", x: 460, y: 45, label: "pigment", col: C.purple }],
    edges: [{ from: "s", to: "e", gene: "B" }],
    inhib: { gene: "A", edge: 0, x: 300, y: 160 },
  },
  {
    key: "duplicate", button: "duplicate genes 15:1", title: "Duplicate genes: either enzyme will do",
    example: "e.g. shepherd's purse seed capsules: triangular if A_ or B_,\novoid only in aabb (no product at all).",
    phenos: [{ key: "P", name: "product", col: C.purple }, { key: "W", name: "none", col: C.white }],
    pheno: (A, B) => (A || B ? "P" : "W"),
    nodes: [
      { id: "s", x: 90, y: 100, label: "precursor", col: C.white, start: true },
      { id: "e", x: 470, y: 100, label: "product", col: C.purple }],
    edges: [{ from: "s", to: "e", gene: "A", bend: -55 }, { from: "s", to: "e", gene: "B", bend: 55 }],
  },
];

const GAMETES = ["AB", "Ab", "aB", "ab"];

/** Genotype of a zygote from two gametes, written AaBb-style (dominant allele first). */
function genotype(g1: string, g2: string): string {
  const pair = (x: string, y: string) => (x < y ? x + y : y + x); // "A" < "a" in char codes
  return pair(g1[0], g2[0]) + pair(g1[1], g2[1]);
}
const hasA = (g: string) => g.slice(0, 2).includes("A");
const hasB = (g: string) => g.slice(2).includes("B");
const classOf = (g: string) => (hasA(g) ? "A_" : "aa") + " " + (hasB(g) ? "B_" : "bb");

function textCol(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const l = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return l < 140 ? "#fff" : "#1b2a3a";
}

// ---------------------------------------------------------------- view
function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;
  let pi = Math.max(0, PRESETS.findIndex(p => p.key === (ds.preset ?? "recessive")));
  let sel = /^[Aa]{2}[Bb]{2}$/.test(ds.cell ?? "") ? genotype(ds.cell![0] + ds.cell![2], ds.cell![1] + ds.cell![3]) : "AaBb";

  const top = htmlEl("div", "ep-top", "", host);
  const btns = presets(top, PRESETS.map((p, i) => ({ label: p.button, apply: () => { pi = i; draw(); } })));
  btns[pi].classList.add("active");

  const W = 1120, H = 462;
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img",
    "aria-label": "Dihybrid Punnett square coloured by phenotype, with the pathway that explains the ratio" }, host);
  htmlEl("p", "qb-note", "Click a square: the pathway shows which enzymes that genotype has (✓) and what it can make.", host);

  // Punnett geometry
  const px0 = 78, py0 = 78, cs = 90;
  // right panel
  const rx = 480;

  function draw(): void {
    const P = PRESETS[pi];
    svg.replaceChildren();
    const colOf = (k: string) => P.phenos.find(p => p.key === k)!.col;

    // ---- Punnett square
    svgEl("text", { x: px0 + 2 * cs, y: 24, "text-anchor": "middle", class: "ttl" }, svg).textContent = "F₁ AaBb × AaBb → 16 F₂ squares";
    svgEl("text", { x: px0 + 2 * cs, y: 54, "text-anchor": "middle", class: "sm" }, svg).textContent = "gametes from one parent";
    const rl = svgEl("text", { x: 22, y: py0 + 2 * cs, "text-anchor": "middle", class: "sm",
      transform: `rotate(-90 22 ${py0 + 2 * cs})` }, svg);
    rl.textContent = "gametes from the other parent";
    GAMETES.forEach((g, i) => {
      svgEl("text", { x: px0 + i * cs + cs / 2, y: py0 - 6, "text-anchor": "middle", class: "gam" }, svg).textContent = g;
      svgEl("text", { x: px0 - 8, y: py0 + i * cs + cs / 2 + 7, "text-anchor": "end", class: "gam" }, svg).textContent = g;
    });
    const counts = new Map<string, number>();
    GAMETES.forEach((r, i) => GAMETES.forEach((c, j) => {
      const g = genotype(r, c);
      const k = P.pheno(hasA(g), hasB(g));
      counts.set(k, (counts.get(k) ?? 0) + 1);
      const fill = colOf(k);
      const x = px0 + j * cs, y = py0 + i * cs;
      const rect = svgEl("rect", { x: x + 1.5, y: y + 1.5, width: cs - 3, height: cs - 3, rx: 5, fill,
        stroke: "#9aa5b1", "stroke-width": 1, class: "cell" }, svg);
      rect.addEventListener("click", () => { sel = g; draw(); });
      const t = svgEl("text", { x: x + cs / 2, y: y + cs / 2 + 6, "text-anchor": "middle", class: "geno", fill: textCol(fill) }, svg);
      t.textContent = g;
      t.style.fill = textCol(fill);
      if (g === sel) {
        svgEl("rect", { x: x + 3, y: y + 3, width: cs - 6, height: cs - 6, rx: 5, fill: "none",
          stroke: "#d62728", "stroke-width": 5, "pointer-events": "none" }, svg);
      }
    }));

    // ---- pathway
    const A = hasA(sel), B = hasB(sel);
    svgEl("text", { x: rx, y: 24, class: "ttl" }, svg).textContent = P.title;
    const g0 = svgEl("g", { transform: `translate(${rx},40)` }, svg);
    drawPathway(g0, P, A, B);
    P.example.split("\n").forEach((line, i) =>
      { svgEl("text", { x: rx, y: 258 + 22 * i, class: "sm" }, svg).textContent = line; });

    // ---- readout for the selected genotype
    const k = P.pheno(A, B), ph = P.phenos.find(p => p.key === k)!;
    const steps = P.edges.map(e => e.gene).filter((g): g is Gene => g !== null)
      .filter((g, i, a) => a.indexOf(g) === i)
      .map(g => `enzyme ${g} ${(g === "A" ? A : B) ? "✓" : "✗"}`);
    if (P.inhib) steps.push(`inhibitor ${(P.inhib.gene === "A" ? A : B) ? "on" : "off"}`);
    const ro = svgEl("text", { x: rx, y: 320 }, svg);
    const t1 = svgEl("tspan", { "font-weight": 700, "font-style": "italic" }, ro); t1.textContent = sel;
    const t2 = svgEl("tspan", {}, ro); t2.textContent = `  (${classOf(sel)}):  ${steps.join(",  ")}  →  `;
    const t3 = svgEl("tspan", { "font-weight": 700 }, ro); t3.textContent = ph.name;

    // ---- collapsed ratio
    const ratio = P.phenos.map(p => counts.get(p.key) ?? 0);
    const rt = svgEl("text", { x: rx, y: 366 }, svg);
    svgEl("tspan", { class: "big" }, rt).textContent = ratio.join(" : ");
    svgEl("tspan", { class: "sm" }, rt).textContent =
      "    " + P.phenos.map((p, i) => `${ratio[i]} ${p.name}`).join(",  ") + "  (out of 16)";
    const bw = (W - 20 - rx) / 16;
    let x = rx;
    P.phenos.forEach((p, i) => {
      for (let u = 0; u < ratio[i]; u++) {
        svgEl("rect", { x: x + u * bw + 1, y: 382, width: bw - 2, height: 42, rx: 3, fill: p.col, stroke: "#9aa5b1", "stroke-width": 1 }, svg);
      }
      const mid = x + ratio[i] * bw / 2;
      const lt = svgEl("text", { x: mid, y: 450, "text-anchor": "middle", "font-weight": 600 }, svg);
      lt.textContent = `${ratio[i]}/16`;
      x += ratio[i] * bw;
    });
  }

  function drawPathway(g: SVGGElement, P: Preset, A: boolean, B: boolean): void {
    const NW = 136, NH = 48;
    const dom = (gene: Gene) => (gene === "A" ? A : B);
    const inhibOn = P.inhib ? dom(P.inhib.gene) : false;
    const works = P.edges.map((e, i) => (e.gene === null || dom(e.gene)) && !(P.inhib && inhibOn && P.inhib.edge === i));
    // which compounds are made
    const made = new Set(P.nodes.filter(n => n.start).map(n => n.id));
    let grew = true;
    while (grew) {
      grew = false;
      P.edges.forEach((e, i) => { if (works[i] && made.has(e.from) && !made.has(e.to)) { made.add(e.to); grew = true; } });
    }
    const node = (id: string) => P.nodes.find(n => n.id === id)!;

    // arrowhead markers (one per state)
    const defs = svgEl("defs", {}, g);
    for (const [id, col] of [["ep-ok", "#1b2a3a"], ["ep-no", "#b8bec6"]]) {
      const m = svgEl("marker", { id: id + uid, markerWidth: 18, markerHeight: 18, refX: 14, refY: 7, orient: "auto", markerUnits: "userSpaceOnUse" }, defs);
      svgEl("path", { d: "M0,0 L16,7 L0,14 Z", fill: col }, m);
    }

    // edges
    P.edges.forEach((e, i) => {
      const a = node(e.from), b = node(e.to);
      const x1 = a.x + NW / 2, y1 = a.y, x2 = b.x - NW / 2 - 4, y2 = b.y;
      const bend = e.bend ?? 0;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + bend;
      const ok = works[i];
      const d = bend ? `M${x1},${y1} Q${mx},${my + bend} ${x2},${y2}` : `M${x1},${y1} L${x2},${y2}`;
      svgEl("path", { d, fill: "none", stroke: ok ? "#1b2a3a" : "#b8bec6", "stroke-width": 4,
        "stroke-dasharray": ok ? "" : "8 6", "marker-end": `url(#${ok ? "ep-ok" : "ep-no"}${uid})` }, g);
      // enzyme badge on the arrow
      const ey = bend ? my : y1;
      if (e.gene) {
        const has = dom(e.gene);
        svgEl("circle", { cx: mx, cy: ey, r: 19, fill: has ? "#e3f1df" : "#eceef1", stroke: has ? "#2e7d32" : "#9aa5b1", "stroke-width": 2.5 }, g);
        const t = svgEl("text", { x: mx, y: ey + 6, "text-anchor": "middle", class: "enz" }, g);
        t.textContent = e.gene;
        const lab = svgEl("text", { x: mx, y: ey + (bend > 0 ? 42 : -28), "text-anchor": "middle", "font-weight": 600 }, g);
        lab.textContent = `enzyme ${e.gene} ${has ? "✓" : "✗"}`;
        lab.style.fill = has ? "#2e7d32" : "#c62828";
      } else {
        svgEl("circle", { cx: mx, cy: ey, r: 8, fill: "#fff", stroke: "#1b2a3a", "stroke-width": 2 }, g);
        const lab = svgEl("text", { x: mx, y: ey - 18, "text-anchor": "middle", class: "sm" }, g);
        lab.textContent = "enzyme 1";
      }
    });

    // inhibitor
    if (P.inhib) {
      const e = P.edges[P.inhib.edge], a = node(e.from), b = node(e.to);
      const tx = ((a.x + NW / 2) + (b.x - NW / 2 - 4)) / 2, ty = a.y + (e.gene ? 24 : 12);
      const col = inhibOn ? "#c62828" : "#b8bec6";
      const ix = P.inhib.x, iy = P.inhib.y;
      svgEl("line", { x1: ix, y1: iy - 22, x2: tx, y2: ty + 6, stroke: col, "stroke-width": 4, "stroke-dasharray": inhibOn ? "" : "8 6" }, g);
      // blunt end (T-bar), perpendicular to the inhibitor line
      const ang = Math.atan2(ty + 6 - (iy - 22), tx - ix);
      const px = Math.cos(ang + Math.PI / 2) * 16, py = Math.sin(ang + Math.PI / 2) * 16;
      svgEl("line", { x1: tx - px, y1: ty + 6 - py, x2: tx + px, y2: ty + 6 + py, stroke: col, "stroke-width": 5 }, g);
      svgEl("rect", { x: ix - 95, y: iy - 22, width: 190, height: 44, rx: 8, fill: inhibOn ? "#fde8e8" : "#f3f4f6", stroke: col, "stroke-width": 2.5 }, g);
      const t = svgEl("text", { x: ix, y: iy + 6, "text-anchor": "middle", "font-weight": 600 }, g);
      t.textContent = `inhibitor (${P.inhib.gene}_) ${inhibOn ? "on" : "off"}`;
    }

    // nodes
    for (const n of P.nodes) {
      const on = made.has(n.id);
      svgEl("rect", { x: n.x - NW / 2, y: n.y - NH / 2, width: NW, height: NH, rx: 10, fill: n.col,
        "fill-opacity": on ? 1 : 0.25, stroke: on ? "#1b2a3a" : "#b8bec6", "stroke-width": on ? 2 : 1.5,
        "stroke-dasharray": on ? "" : "6 4" }, g);
      const t = svgEl("text", { x: n.x, y: n.y + 6, "text-anchor": "middle", class: "node" }, g);
      t.textContent = n.label;
      t.style.fill = on ? textCol(n.col) : "#8a929b";
    }
  }

  const uid = ++uidCounter;
  draw();
}

let uidCounter = 0;

autoMount(NAME, mount);
