// lac operon merodiploids: the Jacob–Monod logic, one cell at a time.
// The user sets the genotype of the chromosome and of an F′ plasmid (or no F′) for
// lacI (+, −, s), lacO (+, c), lacZ (+, −) and lacY (+, −), and toggles the inducer.
// The demo draws
//  - the two DNA copies (I, P, O, Z, Y), with repressor bound or not on each operator,
//    and mRNA plus protein products for each copy that is transcribed;
//  - the repressor pool in between: repressor is a diffusible protein, so the repressor
//    made by either copy reaches both operators (trans), while an operator only controls
//    the genes next to it on the same DNA molecule (cis);
//  - a phenotype panel: β-galactosidase and permease without and with inducer
//    (inducible / constitutive / none), and a short explanation.
// Simplifications (stated on the page): inducer means a gratuitous inducer such as IPTG,
// so lacZ and lacY genotypes do not affect induction; basal leaky expression and
// catabolite repression (CAP) are ignored; Iˢ binds the operator whatever the inducer.
//
// Auto-mounts on <div data-demo="lacoperon">. data-* options (all optional):
//   data-chrom="I+ O+ Z+ Y+"   chromosome genotype (I: + - s; O: + c; Z, Y: + -)
//   data-fprime="none"         F′ genotype in the same format, or "none" (default none)
//   data-lactose="0|1"         inducer present (default 0)
//   data-preset="<key>"        one of the preset keys below (overrides chrom/fprime)
import { svgEl, htmlEl, button, presets, autoMount } from "../lib/ui";

const NAME = "lacoperon";
const INK = "#1b2a3a";
const C = {
  rep: "#2a6f97", sup: "#7b3fa0", opP: "#e8b923", opC: "#c0392b", z: "#5f9e4a", y: "#3f8fbf",
  i: "#9db4c8", dead: "#c9ced4", mrna: "#d08c2f", ind: "#e07b39", ok: "#2e7d32", no: "#9aa5b1",
};

const STYLE = `
[data-demo="${NAME}"] { flex-direction: column; gap: .35em; }
[data-demo="${NAME}"] .lo-row { display: flex; flex-wrap: wrap; gap: .3em 1em; align-items: center; }
[data-demo="${NAME}"] .lo-grp { display: flex; gap: .2em; align-items: center; }
[data-demo="${NAME}"] .lo-grp .qb-btn { min-width: 2.2em; padding: .2em .45em; }
[data-demo="${NAME}"] .lo-lab { font-weight: 600; min-width: 6.2em; }
[data-demo="${NAME}"] .lo-gene { font-style: italic; margin-right: .1em; }
[data-demo="${NAME}"] svg { width: 100%; height: auto; max-width: 1120px; }
[data-demo="${NAME}"] svg text { font-size: 18px; fill: ${INK}; }
[data-demo="${NAME}"] svg .ttl { font-size: 20px; font-weight: 600; }
[data-demo="${NAME}"] svg .sm { font-size: 16px; fill: #4a5866; }
[data-demo="${NAME}"] svg .gn { font-size: 19px; font-weight: 700; font-style: italic; }
[data-demo="${NAME}"] svg .big { font-size: 19px; font-weight: 700; }
[data-demo="${NAME}"] .lo-expl { margin: 0; padding: .4em .7em; background: #f6f7f9; border-radius: 6px; font-size: .95em; }
[data-demo="${NAME}"] .lo-expl li { margin: .1em 0; }
.reveal [data-demo="${NAME}"] { font-size: 15px; gap: .2em; }
.reveal [data-demo="${NAME}"] .qb-btn { font-size: .85em; padding: .05em .4em; }
.reveal [data-demo="${NAME}"] svg { max-width: 960px; }
.reveal [data-demo="${NAME}"] .lo-expl { display: none; }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------- model
type IAl = "+" | "-" | "s";
type OAl = "+" | "c";
type PM = "+" | "-";
interface Copy { I: IAl; O: OAl; Z: PM; Y: PM }
interface Cell { chrom: Copy; fp: Copy | null }

const WT: Copy = { I: "+", O: "+", Z: "+", Y: "+" };

function parseCopy(s: string | undefined, fallback: Copy | null): Copy | null {
  if (s === undefined) return fallback;
  if (s.trim().toLowerCase() === "none") return null;
  const c: Copy = { ...WT };
  for (const tok of s.trim().split(/\s+/)) {
    const g = tok[0]?.toUpperCase(), a = tok.slice(1);
    if (g === "I" && (a === "+" || a === "-" || a === "s")) c.I = a;
    if (g === "O" && (a === "+" || a === "c")) c.O = a;
    if (g === "Z" && (a === "+" || a === "-")) c.Z = a;
    if (g === "Y" && (a === "+" || a === "-")) c.Y = a;
  }
  return c;
}

const sup = (a: string) => (a === "+" ? "⁺" : a === "-" ? "⁻" : a === "s" ? "ˢ" : "ᶜ");
const copyText = (c: Copy) => `I${sup(c.I)} O${sup(c.O)} Z${sup(c.Z)} Y${sup(c.Y)}`;
const cellText = (cell: Cell) => cell.fp ? `F′ ${copyText(cell.fp)} / ${copyText(cell.chrom)}` : copyText(cell.chrom);

interface CopyState { bound: boolean; on: boolean; why: string }

/** Which operators are bound and which copies are transcribed, for one cell and inducer state. */
function evaluate(cell: Cell, ind: boolean): { copies: CopyState[]; hasWT: boolean; hasS: boolean } {
  const all = cell.fp ? [cell.chrom, cell.fp] : [cell.chrom];
  const hasWT = all.some(c => c.I === "+"), hasS = all.some(c => c.I === "s");
  const copies = all.map(c => {
    if (c.O === "c") return { bound: false, on: true, why: "Oᶜ cannot bind repressor, so it is always transcribed" };
    if (hasS) return { bound: true, on: false, why: "Iˢ repressor cannot bind inducer and stays on O⁺" };
    if (hasWT && !ind) return { bound: true, on: false, why: "repressor sits on O⁺ (no inducer)" };
    if (hasWT && ind) return { bound: false, on: true, why: "inducer has pulled the repressor off O⁺" };
    return { bound: false, on: true, why: "no working repressor in the cell, so O⁺ is free" };
  });
  return { copies, hasWT, hasS };
}

/** Amount (number of copies making it) of β-gal and permease. */
function products(cell: Cell, ind: boolean): { z: number; y: number } {
  const all = cell.fp ? [cell.chrom, cell.fp] : [cell.chrom];
  const ev = evaluate(cell, ind).copies;
  let z = 0, y = 0;
  all.forEach((c, i) => { if (ev[i].on) { if (c.Z === "+") z++; if (c.Y === "+") y++; } });
  return { z, y };
}

function classify(off: number, on: number): { label: string; col: string } {
  if (off === 0 && on === 0) return { label: "none", col: "#c62828" };
  if (off === 0) return { label: "inducible", col: C.ok };
  if (on > off) return { label: "constitutive (more when induced)", col: C.sup };
  return { label: "constitutive", col: C.sup };
}

// ---------------------------------------------------------------- presets
interface Preset { key: string; label: string; chrom: string; fp: string }
const PRESETS: Preset[] = [
  { key: "wt", label: "wild type", chrom: "I+ O+ Z+ Y+", fp: "none" },
  { key: "iminus", label: "I⁻", chrom: "I- O+ Z+ Y+", fp: "none" },
  { key: "iminus-merodip", label: "F′ I⁺ / I⁻", chrom: "I- O+ Z+ Y+", fp: "I+ O+ Z+ Y+" },
  { key: "oc", label: "Oᶜ", chrom: "I+ Oc Z+ Y+", fp: "none" },
  { key: "oc-cis", label: "F′ O⁺ Z⁻ / Oᶜ Z⁺", chrom: "I+ Oc Z+ Y+", fp: "I+ O+ Z- Y+" },
  { key: "oc-trans", label: "F′ O⁺ Z⁺ / Oᶜ Z⁻", chrom: "I+ Oc Z- Y+", fp: "I+ O+ Z+ Y+" },
  { key: "is", label: "Iˢ", chrom: "Is O+ Z+ Y+", fp: "none" },
  { key: "is-merodip", label: "F′ I⁺ / Iˢ", chrom: "Is O+ Z+ Y+", fp: "I+ O+ Z+ Y+" },
  { key: "zy-trans", label: "F′ Z⁺ Y⁻ / Z⁻ Y⁺", chrom: "I+ O+ Z- Y+", fp: "I+ O+ Z+ Y-" },
];

// ---------------------------------------------------------------- view
function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;
  const cell: Cell = {
    chrom: parseCopy(ds.chrom, { ...WT })!,
    fp: parseCopy(ds.fprime, null),
  };
  let ind = ds.lactose === "1";
  const pre = PRESETS.find(p => p.key === ds.preset);
  if (pre) { cell.chrom = parseCopy(pre.chrom, WT)!; cell.fp = parseCopy(pre.fp, null); }

  // ---- controls
  const prow = htmlEl("div", "lo-row", "", host);
  htmlEl("span", "lo-lab", "Presets:", prow);
  const pbtns = presets(prow, PRESETS.map(p => ({
    label: p.label,
    apply: () => { cell.chrom = parseCopy(p.chrom, WT)!; cell.fp = parseCopy(p.fp, null); syncButtons(); draw(); },
  })));
  if (pre) pbtns[PRESETS.indexOf(pre)].classList.add("active");
  const clearPresets = () => pbtns.forEach(b => b.classList.remove("active"));

  const syncers: (() => void)[] = [];
  function geneGroup(row: HTMLElement, which: "chrom" | "fp", gene: keyof Copy, opts: string[]): void {
    const g = htmlEl("span", "lo-grp", "", row);
    htmlEl("span", "lo-gene", "lac" + gene, g);
    const bs = opts.map(a => button(g, a === "-" ? "−" : a, () => {
      const c = which === "chrom" ? cell.chrom : cell.fp;
      if (!c) return;
      (c as unknown as Record<string, string>)[gene] = a;
      clearPresets(); syncButtons(); draw();
    }));
    syncers.push(() => {
      const c = which === "chrom" ? cell.chrom : cell.fp;
      bs.forEach((b, i) => {
        b.classList.toggle("active", !!c && (c as unknown as Record<string, string>)[gene] === opts[i]);
        b.disabled = !c;
      });
    });
  }
  for (const which of ["fp", "chrom"] as const) {
    const row = htmlEl("div", "lo-row", "", host);
    htmlEl("span", "lo-lab", which === "chrom" ? "Chromosome:" : "F′ plasmid:", row);
    if (which === "fp") {
      const g = htmlEl("span", "lo-grp", "", row);
      const bNone = button(g, "no F′", () => { cell.fp = null; clearPresets(); syncButtons(); draw(); });
      const bHas = button(g, "add F′", () => { if (!cell.fp) cell.fp = { ...WT }; clearPresets(); syncButtons(); draw(); });
      syncers.push(() => { bNone.classList.toggle("active", !cell.fp); bHas.classList.toggle("active", !!cell.fp); });
    }
    geneGroup(row, which, "I", ["+", "-", "s"]);
    geneGroup(row, which, "O", ["+", "c"]);
    geneGroup(row, which, "Z", ["+", "-"]);
    geneGroup(row, which, "Y", ["+", "-"]);
  }
  const irow = htmlEl("div", "lo-row", "", host);
  htmlEl("span", "lo-lab", "Inducer:", irow);
  const ig = htmlEl("span", "lo-grp", "", irow);
  const bOff = button(ig, "no lactose", () => { ind = false; syncButtons(); draw(); });
  const bOn = button(ig, "+ lactose (inducer)", () => { ind = true; syncButtons(); draw(); });
  syncers.push(() => { bOff.classList.toggle("active", !ind); bOn.classList.toggle("active", ind); });
  button(irow, "reset", () => { cell.chrom = { ...WT }; cell.fp = null; ind = false; clearPresets(); syncButtons(); draw(); });

  function syncButtons(): void { syncers.forEach(f => f()); }

  const W = 1120;
  const svg = svgEl("svg", { viewBox: `0 0 ${W} 470`, role: "img",
    "aria-label": "The lac operon on the chromosome and on an F′ plasmid, with repressor, mRNA and enzymes" }, host);
  const expl = htmlEl("ul", "lo-expl", "", host);

  // geometry of one operon drawing
  const X = { i0: 20, i1: 150, p0: 168, p1: 206, o0: 206, o1: 250, z0: 250, z1: 470, y0: 470, y1: 580 };
  const GH = 40;

  function drawCopy(c: Copy, st: CopyState, y: number, title: string, repCol: string | null): void {
    svgEl("text", { x: X.i0, y: y - 54, class: "ttl" }, svg).textContent = title;
    svgEl("line", { x1: X.i0 - 8, y1: y, x2: X.y1 + 18, y2: y, stroke: INK, "stroke-width": 3 }, svg);
    const box = (x0: number, x1: number, fill: string, label: string, dead: boolean) => {
      svgEl("rect", { x: x0, y: y - GH / 2, width: x1 - x0, height: GH, rx: 4, fill: dead ? C.dead : fill,
        stroke: INK, "stroke-width": 1.5 }, svg);
      if (dead) svgEl("path", { d: `M${x0 + 6},${y - GH / 2 + 6} L${x1 - 6},${y + GH / 2 - 6}`, stroke: "#c62828", "stroke-width": 3 }, svg);
      const t = svgEl("text", { x: (x0 + x1) / 2, y: y + 7, "text-anchor": "middle", class: "gn" }, svg);
      t.textContent = label;
    };
    box(X.i0, X.i1, C.i, "lacI" + sup(c.I), c.I === "-");
    // promoter: small arrow
    svgEl("rect", { x: X.p0, y: y - 12, width: X.p1 - X.p0, height: 24, fill: "#fff", stroke: INK, "stroke-width": 1.2 }, svg);
    svgEl("text", { x: (X.p0 + X.p1) / 2, y: y + 6, "text-anchor": "middle", class: "sm" }, svg).textContent = "P";
    svgEl("rect", { x: X.o0, y: y - 14, width: X.o1 - X.o0, height: 28, fill: c.O === "c" ? "#fde8e8" : "#fbf0c9",
      stroke: c.O === "c" ? C.opC : "#b8901a", "stroke-width": 2.5 }, svg);
    svgEl("text", { x: (X.o0 + X.o1) / 2, y: y + 6, "text-anchor": "middle", "font-weight": 700, "font-style": "italic" }, svg)
      .textContent = "O" + sup(c.O);
    box(X.z0, X.z1, C.z, "lacZ" + sup(c.Z), false);
    box(X.y0, X.y1, C.y, "lacY" + sup(c.Y), false);
    if (c.Z === "-") svgEl("text", { x: X.z1 - 10, y: y + 34, "text-anchor": "end", class: "sm" }, svg).textContent = "point mutation";
    if (c.Y === "-") svgEl("text", { x: X.y1 - 4, y: y + 34, "text-anchor": "end", class: "sm" }, svg).textContent = "point mutation";

    // repressor on the operator
    if (st.bound && repCol) {
      svgEl("path", { d: `M${X.o0 - 14},${y - 16} q8,-34 36,-34 q28,0 36,34 z`, fill: repCol, stroke: INK, "stroke-width": 1.5 }, svg);
      svgEl("text", { x: (X.o0 + X.o1) / 2, y: y - 26, "text-anchor": "middle", "font-size": 13, fill: "#fff", "font-weight": 700 }, svg)
        .textContent = "R";
    }
    // mRNA
    if (st.on) {
      let d = `M${X.z0 + 4},${y - 34}`;
      for (let x = X.z0 + 4; x < X.y1 - 8; x += 20) d += ` q5,-9 10,0 q5,9 10,0`;
      svgEl("path", { d, fill: "none", stroke: C.mrna, "stroke-width": 3 }, svg);
      svgEl("text", { x: X.y1 + 6, y: y - 40, class: "sm" }, svg).textContent = "mRNA";
      svgEl("path", { d: `M${X.p1},${y - 22} l0,-12 l30,0`, fill: "none", stroke: C.mrna, "stroke-width": 3 }, svg);
    }
    // products
    const px = 640;
    if (st.on) {
      prod(px, y, "β-gal", c.Z === "+" ? C.z : null);
      prod(px + 128, y, "permease", c.Y === "+" ? C.y : null);
    } else {
      svgEl("text", { x: px, y: y + 6, class: "sm" }, svg).textContent = "not transcribed";
    }
  }

  function prod(x: number, y: number, name: string, col: string | null): void {
    svgEl("rect", { x, y: y - 18, width: 118, height: 36, rx: 18, fill: col ?? "#fff", stroke: col ? INK : C.no,
      "stroke-width": 1.5, "stroke-dasharray": col ? "" : "5 4" }, svg);
    const t = svgEl("text", { x: x + 59, y: y + 6, "text-anchor": "middle", "font-size": 16, "font-weight": 600 }, svg);
    t.textContent = col ? name : name + " ✗";
    t.style.fill = col ? "#fff" : "#8a929b";
  }

  function draw(): void {
    svg.replaceChildren();
    const ev = evaluate(cell, ind);
    const hasF = !!cell.fp;
    const repCol = ev.hasS ? C.sup : ev.hasWT ? C.rep : null;
    const yF = 80, yC = hasF ? 300 : 80;
    svg.setAttribute("viewBox", `0 0 ${W} ${hasF ? 470 : 320}`);

    if (hasF) drawCopy(cell.fp!, ev.copies[1], yF, "F′ plasmid", repCol);
    drawCopy(cell.chrom, ev.copies[0], yC, "Chromosome", repCol);

    // repressor pool (cytoplasm) between the copies
    const py = hasF ? 190 : 160;
    const all = hasF ? [cell.chrom, cell.fp!] : [cell.chrom];
    svgEl("text", { x: X.i0, y: py - 12, class: "sm" }, svg).textContent = "repressor made by lacI (diffusible):";
    let x = X.i0;
    all.forEach((c, k) => {
      const from = k === 0 ? "chromosome" : "F′";
      if (c.I === "-") {
        svgEl("text", { x, y: py + 20, class: "sm" }, svg).textContent = `from ${from}: none (I⁻)`;
        x += 500;
        return;
      }
      const col = c.I === "s" ? C.sup : C.rep;
      for (let r = 0; r < 2; r++) {
        const cx = x + 18 + r * 46;
        svgEl("circle", { cx, cy: py + 14, r: 15, fill: col, stroke: INK, "stroke-width": 1.2 }, svg);
        if (ind) {
          // inducer bound to normal repressor; Iˢ cannot bind it, inducer floats next to it
          const bx = c.I === "+" ? cx + 11 : cx + 21, by = c.I === "+" ? py + 2 : py + 26;
          svgEl("rect", { x: bx - 5, y: by - 5, width: 10, height: 10, fill: C.ind, stroke: INK, "stroke-width": 1,
            transform: `rotate(45 ${bx} ${by})` }, svg);
        }
      }
      svgEl("text", { x: x + 100, y: py + 20, class: "sm" }, svg).textContent =
        `from ${from}: ${c.I === "s" ? "Iˢ (ignores inducer)" : ind ? "I⁺, inducer bound" : "I⁺, active"}`;
      x += 500;
    });
    if (ind) {
      svgEl("rect", { x: 920, y: 18, width: 12, height: 12, fill: C.ind, stroke: INK, transform: "rotate(45 926 24)" }, svg);
      svgEl("text", { x: 940, y: 30, class: "sm" }, svg).textContent = "= inducer";
    }

    // phenotype panel
    const off = products(cell, false), on = products(cell, true);
    const tx = 20, ty = hasF ? 395 : 245;
    svgEl("text", { x: tx, y: ty, class: "ttl" }, svg).textContent = "Phenotype of " + cellText(cell);
    const rows: [string, number, number][] = [["β-galactosidase", off.z, on.z], ["permease", off.y, on.y]];
    rows.forEach(([nm, a, b], i) => {
      const yy = ty + 32 + i * 30;
      const cl = classify(a, b);
      svgEl("text", { x: tx, y: yy, "font-weight": 600 }, svg).textContent = nm;
      svgEl("text", { x: tx + 170, y: yy }, svg).textContent = `no lactose: ${a ? "made" : "—"}${a > 1 ? " (2 copies)" : ""}`;
      svgEl("text", { x: tx + 420, y: yy }, svg).textContent = `+ lactose: ${b ? "made" : "—"}${b > 1 ? " (2 copies)" : ""}`;
      const t = svgEl("text", { x: tx + 670, y: yy, class: "big" }, svg);
      t.textContent = cl.label;
      t.style.fill = cl.col;
    });

    // explanation
    expl.replaceChildren();
    const li = (s: string) => htmlEl("li", "", s, expl);
    const reps = all.map((c, k) => `${k === 0 ? "chromosome" : "F′"} I${sup(c.I)}`).join(", ");
    li(`Repressor: ${reps}. ` + (ev.hasS ? "Iˢ makes a repressor that cannot bind inducer, so it stays on every O⁺ in the cell (trans-dominant)."
      : ev.hasWT ? (hasF && all.some(c => c.I === "-") ? "One I⁺ copy is enough: its repressor diffuses to both operators, so I⁺ is dominant to I⁻ in trans."
        : "Normal repressor binds O⁺ unless inducer is present.")
        : "No working repressor anywhere, so nothing can switch the operon off."));
    all.forEach((c, k) => {
      const st = ev.copies[k];
      const nm = k === 0 ? "Chromosome" : "F′";
      const made = st.on ? `transcribed → ${c.Z === "+" ? "β-gal" : "no active β-gal (Z⁻)"}, ${c.Y === "+" ? "permease" : "no permease (Y⁻)"}` : "not transcribed";
      li(`${nm}: ${st.why}; ${made}.`);
    });
    if (hasF && all.some(c => c.O === "c") && all.some(c => c.O === "+"))
      li("Oᶜ acts only in cis: it makes the genes on its own DNA molecule constitutive, not those on the other copy.");
    if (hasF && cell.chrom.Z !== cell.fp!.Z && cell.chrom.Y !== cell.fp!.Y)
      li("Z⁻ and Y⁻ on different copies complement each other: each copy supplies the protein the other cannot make.");
  }

  syncButtons();
  draw();
}

autoMount(NAME, mount);
