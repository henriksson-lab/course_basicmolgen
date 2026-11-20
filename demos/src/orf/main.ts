// Six-frame ORF finder.
// Translates a DNA sequence in all six reading frames (three on each strand), marks every
// stop codon, and draws each open reading frame (ATG ... stop) that is at least the chosen
// minimum length as a bar: forward frames in blue, reverse frames in red, arrow = direction of
// translation. Below the frames, the annotated genes (GenBank CDS features) for comparison.
// Click an ORF to see its position, length and protein sequence.
// Presets: human HBB mRNA (NM_000518.5), a 3.3 kb region of phage λ around cI and cro
// (NC_001416.1), and random DNA of the same length (seeded, so it is reproducible).
//
// Auto-mounts on <div data-demo="orf">. data-* options (all optional):
//   data-preset="hbb|lambda|random"   (default lambda)
//   data-seq="ATGC..."                 your own sequence (adds a "your sequence" preset, shown first)
//   data-min="100"                     minimum ORF length in amino acids (default 100)
//   data-seed="1"                      seed for the random sequence
import { autoMount, button, checkbox, htmlEl, presets, rng, slider, svgEl } from "../lib/ui";
import { Gene, HBB_GENES, HBB_MRNA, LAMBDA_CI, LAMBDA_GENES } from "./data";

const NAME = "orf";
const INK = "#1b2a3a";
const C_FWD = "#2a6f97", C_REV = "#bc4749", C_GENE = "#6a994e";

const STYLE = `
[data-demo="${NAME}"] { flex-direction: column; gap: .4em; }
[data-demo="${NAME}"] .of-row { display: flex; flex-wrap: wrap; gap: .35em 1.1em; align-items: center; }
[data-demo="${NAME}"] .of-row .qb-slider { min-width: 320px; }
[data-demo="${NAME}"] svg { width: 100%; height: auto; max-width: 1120px; }
[data-demo="${NAME}"] svg text { font-size: 15px; fill: ${INK}; }
[data-demo="${NAME}"] svg .fr { font-size: 16px; font-weight: 600; }
[data-demo="${NAME}"] svg .sm { font-size: 13px; fill: #4a5866; }
[data-demo="${NAME}"] svg .orf { cursor: pointer; }
[data-demo="${NAME}"] svg .orf:hover { stroke: ${INK}; stroke-width: 1.5; }
[data-demo="${NAME}"] .qb-readout { font-size: .85em; word-break: break-all; }
.reveal [data-demo="${NAME}"] { font-size: 18px; }
.reveal [data-demo="${NAME}"] .qb-btn { font-size: .78em; padding: .12em .5em; }
.reveal [data-demo="${NAME}"] .qb-note { display: none; }
.reveal [data-demo="${NAME}"] svg .sm { font-size: 18px; }
.reveal [data-demo="${NAME}"] svg .fr { font-size: 22px; }
.reveal [data-demo="${NAME}"] .qb-readout { font-size: .72em; }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------- genetics
const BASES = "TCAG";
const AAS = "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG";
const CODE: Record<string, string> = {};
{
  let i = 0;
  for (const a of BASES) for (const b of BASES) for (const c of BASES) CODE[a + b + c] = AAS[i++];
}
const revcomp = (s: string) => s.split("").reverse().map(c => ({ A: "T", C: "G", G: "C", T: "A" } as Record<string, string>)[c] ?? "N").join("");

interface Orf { frame: number; strand: 1 | -1; start: number; end: number; aa: string }  // start/end: 1-based, start < end
interface Frame { strand: 1 | -1; frame: number; stops: number[]; orfs: Orf[] }

/** Translate one frame and collect stop positions and complete ORFs (ATG … stop). */
function scanFrame(seq: string, strand: 1 | -1, f: number): Frame {
  const L = seq.length;
  const s = strand === 1 ? seq : revcomp(seq);
  const stops: number[] = [], orfs: Orf[] = [];
  let open = -1;   // index (in s) of the first ATG since the last stop, or -1
  const toOrig = (i: number) => (strand === 1 ? i + 1 : L - i);   // 1-based position in seq of base i of s
  for (let i = f; i + 3 <= L; i += 3) {
    const cod = s.slice(i, i + 3);
    const aa = CODE[cod] ?? "X";
    if (aa === "*") {
      stops.push(toOrig(i + 1));
      if (open >= 0) {
        let prot = "";
        for (let j = open; j < i; j += 3) prot += CODE[s.slice(j, j + 3)] ?? "X";
        const a = toOrig(open), b = toOrig(i + 2);
        orfs.push({ frame: f + 1, strand, start: Math.min(a, b), end: Math.max(a, b), aa: prot });
      }
      open = -1;
    } else if (cod === "ATG" && open < 0) open = i;
  }
  return { strand, frame: f + 1, stops, orfs };
}

function randomSeq(n: number, seed: number): string {
  const r = rng(seed);
  let s = "";
  for (let i = 0; i < n; i++) s += "ACGT"[Math.floor(r.unif() * 4)];
  return s;
}

// ---------------------------------------------------------------- UI
interface Preset { key: string; label: string; title: string; seq: () => string; genes: Gene[] }

function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;
  let seed = Number(ds.seed ?? 1) || 1;
  const custom = (ds.seq ?? "").toUpperCase().replace(/[^ACGT]/g, "");
  const PRESETS: Preset[] = [];
  if (custom.length >= 30)
    PRESETS.push({ key: "custom", label: "your sequence", title: `your sequence (${custom.length} bp)`, seq: () => custom, genes: [] });
  PRESETS.push(
    { key: "hbb", label: "HBB mRNA", title: "human HBB mRNA, NM_000518.5 (628 nt)", seq: () => HBB_MRNA, genes: HBB_GENES },
    { key: "lambda", label: "phage λ cI–cro region", title: "phage λ, NC_001416.1 positions 36,261–39,600 (3,340 bp)", seq: () => LAMBDA_CI, genes: LAMBDA_GENES },
    { key: "random", label: "random DNA", title: "", seq: () => randomSeq(LAMBDA_CI.length, seed), genes: [] },
  );
  let preset = PRESETS.find(p => p.key === ds.preset) ?? (custom.length >= 30 ? PRESETS[0] : PRESETS.find(p => p.key === "lambda")!);
  let minAa = Math.max(10, Math.min(300, Number(ds.min ?? 100) || 100));
  let showStops = true, showGenes = true;
  let selected: Orf | null = null;

  const row1 = htmlEl("div", "of-row", "", host);
  const pBtns = presets(row1, PRESETS.map(p => ({ label: p.label, apply: () => { preset = p; selected = null; draw(); } })));
  pBtns[PRESETS.indexOf(preset)].classList.add("active");
  button(row1, "new random sequence", () => {
    seed++; preset = PRESETS.find(p => p.key === "random")!; selected = null;
    pBtns.forEach((b, i) => b.classList.toggle("active", PRESETS[i] === preset)); draw();
  });
  const row2 = htmlEl("div", "of-row", "", host);
  slider(row2, "minimum ORF (aa)", 10, 300, 10, minAa, v => { minAa = v; selected = null; draw(); });
  checkbox(row2, "stop codons", showStops, v => { showStops = v; draw(); });
  checkbox(row2, "annotated genes", showGenes, v => { showGenes = v; draw(); });

  const W = 1100, X0 = 70, X1 = W - 12, TH = 40, Y0 = 34;
  const svg = svgEl("svg", { viewBox: `0 0 ${W} 400`, role: "img", "aria-label": "Six-frame ORF map" }, host);
  const ro = htmlEl("div", "qb-readout", "", host);
  htmlEl("p", "qb-note",
    "ORF = ATG to the next in-frame stop codon (TAA, TAG, TGA). Grey ticks: stop codons. Blue: ORFs on the given strand; red: on the reverse complement. Green: genes annotated in GenBank.", host);

  const txt = (x: number, y: number, s: string, attrs: Record<string, string | number> = {}) => {
    const t = svgEl("text", { x, y, ...attrs }, svg);
    t.textContent = s;
    return t;
  };

  function draw(): void {
    const seq = preset.seq();
    const L = seq.length;
    const title = preset.key === "random" ? `random DNA, ${L} bp, equal base frequencies (seed ${seed})` : preset.title;
    const frames: Frame[] = [];
    for (const strand of [1, -1] as const) for (let f = 0; f < 3; f++) frames.push(scanFrame(seq, strand, f));
    const sx = (p: number) => X0 + ((p - 0.5) / L) * (X1 - X0);
    const genesH = showGenes && preset.genes.length ? 46 : 0;
    const H = Y0 + 6 * TH + 14 + genesH + 34;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.replaceChildren();
    txt(X0, 20, title, { class: "sm" });
    txt(X1, 20, "frames +1…+3: given strand  ·  −1…−3: reverse complement", { class: "sm", "text-anchor": "end" });

    let nShown = 0, longest: Orf | null = null;
    frames.forEach((fr, k) => {
      const y = Y0 + k * TH + (k >= 3 ? 10 : 0) + TH / 2;
      const col = fr.strand === 1 ? C_FWD : C_REV;
      txt(X0 - 12, y + 5, `${fr.strand === 1 ? "+" : "−"}${fr.frame}`, { class: "fr", "text-anchor": "end", fill: col, style: `fill:${col}` });
      svgEl("line", { x1: X0, x2: X1, y1: y, y2: y, stroke: "#d6dde4", "stroke-width": 1.5 }, svg);
      if (showStops) for (const p of fr.stops)
        svgEl("line", { x1: sx(p), x2: sx(p), y1: y - 7, y2: y + 7, stroke: "#9aa5b1", "stroke-width": 1 }, svg);
      for (const o of fr.orfs) {
        if (!longest || o.aa.length > longest.aa.length) longest = o;
        if (o.aa.length < minAa) continue;
        nShown++;
        const a = sx(o.start), b = sx(o.end), h = 16, tip = Math.min(9, (b - a) / 2);
        const pts = fr.strand === 1
          ? `${a},${y - h / 2} ${b - tip},${y - h / 2} ${b},${y} ${b - tip},${y + h / 2} ${a},${y + h / 2}`
          : `${b},${y - h / 2} ${a + tip},${y - h / 2} ${a},${y} ${a + tip},${y + h / 2} ${b},${y + h / 2}`;
        const isSel = selected && selected.start === o.start && selected.end === o.end && selected.strand === o.strand;
        const poly = svgEl("polygon", { points: pts, fill: col, class: "orf", stroke: isSel ? INK : "none", "stroke-width": isSel ? 3 : 0, opacity: isSel ? 1 : 0.85 }, svg);
        poly.addEventListener("click", () => { selected = o; draw(); });
        if (b - a > 60) txt((a + b) / 2, y - h / 2 - 4, `${o.aa.length} aa`, { class: "sm", "text-anchor": "middle" });
      }
    });

    let yB = Y0 + 6 * TH + 14;
    if (genesH) {
      txt(X0 - 12, yB + 24, "genes", { class: "sm", "text-anchor": "end" });
      for (const g of preset.genes) {
        const a = sx(g.start), b = sx(g.end), y = yB + 20, h = 12, tip = 8;
        const pts = g.strand === 1
          ? `${a},${y - h / 2} ${b - tip},${y - h / 2} ${b},${y} ${b - tip},${y + h / 2} ${a},${y + h / 2}`
          : `${b},${y - h / 2} ${a + tip},${y - h / 2} ${a},${y} ${a + tip},${y + h / 2} ${b},${y + h / 2}`;
        svgEl("polygon", { points: pts, fill: C_GENE }, svg);
        txt((a + b) / 2, y + h / 2 + 15, g.name, { class: "sm", "text-anchor": "middle", style: "font-style:italic" });
      }
      yB += genesH;
    }
    // axis in bp
    svgEl("line", { x1: X0, x2: X1, y1: yB + 4, y2: yB + 4, stroke: INK }, svg);
    const step = L > 2000 ? 500 : L > 800 ? 200 : L > 300 ? 100 : 50;
    for (let p = 0; p <= L; p += step) {
      svgEl("line", { x1: sx(Math.max(p, 0.5)), x2: sx(Math.max(p, 0.5)), y1: yB + 4, y2: yB + 10, stroke: INK }, svg);
      txt(sx(Math.max(p, 0.5)), yB + 26, p.toLocaleString("en-US"), { class: "sm", "text-anchor": "middle" });
    }

    // readout
    const gc = (seq.match(/[GC]/g)?.length ?? 0) / L;
    const nStops = frames.reduce((a, f) => a + f.stops.length, 0);
    const lines = [
      `${L} bp, GC ${(100 * gc).toFixed(0)}%, ${nStops} stop codons in six frames (expected about ${Math.round(2 * L * 3 / 64)} in random DNA)`,
      `ORFs of at least ${minAa} aa: ${nShown}.  Longest ORF in any frame: ${longest ? (longest as Orf).aa.length + " aa" : "none"}`,
    ];
    if (selected) {
      const o = selected;
      lines.push("", `selected: frame ${o.strand === 1 ? "+" : "−"}${o.frame}, positions ${o.start}–${o.end} (${o.strand === 1 ? "→" : "←"}), ${o.aa.length} aa + stop`,
        `protein: ${o.aa}`);
    } else lines.push("", "Click an ORF to see its protein sequence.");
    ro.textContent = lines.join("\n");
  }
  draw();
}

autoMount(NAME, mount);
