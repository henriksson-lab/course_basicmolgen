// Restriction digest on a virtual agarose gel.
// Pick a DNA (preset) and one or two restriction enzymes. The gel shows a ladder lane, the
// uncut DNA, each single digest and (with two enzymes) the double digest. Fragment sizes
// come from the real cut positions in data.ts (computed from NCBI/Ensembl sequences).
// Migration is a smooth function of log10(size) that depends on the agarose percentage;
// band brightness is proportional to the mass of DNA in the band (size × number of copies),
// so short fragments are faint, and fragments of nearly equal size merge into one band.
// This is a teaching model, not a physical simulation.
//
// Auto-mounts on <div data-demo="gel">. data-* options (all optional):
//   data-preset="lambda|puc19|hbbA|hbbS|hbbAS"   DNA to digest (default lambda)
//   data-enzymes="EcoRI,BamHI"                    up to two enzymes (default EcoRI)
//   data-agarose="0.7|1|2"                        gel percentage (default per preset)
//   data-ladder="1kb|100bp|hind"                  ladder (default per preset)
//   data-sizes="true"                             show the fragment sizes from the start
import { autoMount, button, checkbox, htmlEl, svgEl } from "../lib/ui";
import { CUTS } from "./data";

const NAME = "gel";
const INK = "#1b2a3a";

const STYLE = `
[data-demo="${NAME}"] { flex-direction: column; gap: .4em; }
[data-demo="${NAME}"] .gl-row { display: flex; flex-wrap: wrap; gap: .35em 1.1em; align-items: center; }
[data-demo="${NAME}"] .gl-group { display: flex; flex-wrap: wrap; gap: .3em; align-items: center; }
[data-demo="${NAME}"] .gl-lab { font-weight: 600; }
[data-demo="${NAME}"] .gl-main { display: flex; flex-wrap: wrap; gap: 14px; width: 100%; align-items: flex-start; }
[data-demo="${NAME}"] .gl-main svg { flex: 62 1 420px; max-width: 640px; min-width: 0; height: auto; }
[data-demo="${NAME}"] .gl-side { flex: 38 1 260px; min-width: 0; display: flex; flex-direction: column; gap: .45em; }
[data-demo="${NAME}"] .gl-side .qb-readout { font-size: .86em; }
[data-demo="${NAME}"] svg text { font-size: 16px; fill: ${INK}; }
[data-demo="${NAME}"] svg .lane { font-size: 15px; font-weight: 600; }
[data-demo="${NAME}"] svg .lsize { font-size: 13px; fill: #4a5866; }
[data-demo="${NAME}"] svg .bsize { font-size: 12px; fill: #f3f0e6; }
[data-demo="${NAME}"] .gl-title { font-weight: 600; }
.reveal [data-demo="${NAME}"] { font-size: 18px; }
.reveal [data-demo="${NAME}"] .qb-btn { font-size: .8em; padding: .12em .5em; }
.reveal [data-demo="${NAME}"] .gl-main svg { max-width: 600px; }
.reveal [data-demo="${NAME}"] .qb-note { display: none; }
.reveal [data-demo="${NAME}"] svg .lane { font-size: 20px; }
.reveal [data-demo="${NAME}"] svg .lsize { font-size: 17px; }
.reveal [data-demo="${NAME}"] svg .bsize { font-size: 16px; }
`;

function injectStyle(): void {
  if (document.getElementById("qb-style-" + NAME)) return;
  const s = document.createElement("style");
  s.id = "qb-style-" + NAME;
  s.textContent = STYLE;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------- model

const ENZYMES: { name: string; site: string }[] = [
  { name: "EcoRI", site: "G^AATTC" },
  { name: "BamHI", site: "G^GATCC" },
  { name: "HindIII", site: "A^AGCTT" },
  { name: "PstI", site: "CTGCA^G" },
  { name: "DdeI", site: "C^TNAG" },
];

interface Preset {
  key: string; label: string; title: string;
  /** DNA molecules in the tube: key into CUTS and relative amount (1 = one copy each). */
  parts: { dna: string; amount: number }[];
  agarose: number; ladder: string; enzymes: string[];
}
const PRESETS: Preset[] = [
  { key: "lambda", label: "phage λ", title: "phage λ DNA, 48,502 bp, linear (NC_001416.1)",
    parts: [{ dna: "lambda", amount: 1 }], agarose: 0.7, ladder: "1kb", enzymes: ["EcoRI"] },
  { key: "puc19", label: "pUC19 plasmid", title: "pUC19 plasmid, 2,686 bp, circular (M77789.2)",
    parts: [{ dna: "puc19", amount: 1 }], agarose: 1, ladder: "1kb", enzymes: ["EcoRI", "HindIII"] },
  { key: "hbbA", label: "HBB PCR, HbA/HbA", title: "500-bp HBB PCR product, normal allele (HbA/HbA)",
    parts: [{ dna: "hbbA", amount: 1 }], agarose: 2, ladder: "100bp", enzymes: ["DdeI"] },
  { key: "hbbAS", label: "HBB PCR, HbA/HbS", title: "500-bp HBB PCR product, carrier (HbA/HbS)",
    parts: [{ dna: "hbbA", amount: 0.5 }, { dna: "hbbS", amount: 0.5 }], agarose: 2, ladder: "100bp", enzymes: ["DdeI"] },
  { key: "hbbS", label: "HBB PCR, HbS/HbS", title: "500-bp HBB PCR product, sickle-cell allele (HbS/HbS)",
    parts: [{ dna: "hbbS", amount: 1 }], agarose: 2, ladder: "100bp", enzymes: ["DdeI"] },
];

const LADDERS: Record<string, { label: string; sizes: number[]; equalMass: boolean }> = {
  "1kb": { label: "1 kb ladder", sizes: [10000, 8000, 6000, 5000, 4000, 3000, 2000, 1500, 1000, 500], equalMass: true },
  "100bp": { label: "100 bp ladder", sizes: [1500, 1200, 1000, 900, 800, 700, 600, 500, 400, 300, 200, 100], equalMass: true },
  hind: { label: "λ / HindIII", sizes: [23130, 9416, 6557, 4361, 2322, 2027, 564, 125], equalMass: false },
};
const AGAROSE: Record<string, { m: number; w: number }> = {
  // centre (log10 bp) and width of the sigmoid that maps log size to distance run
  "0.7": { m: 3.5, w: 0.55 }, "1": { m: 3.25, w: 0.45 }, "2": { m: 2.65, w: 0.36 },
};

interface Band { size: number; mass: number; sc?: boolean }

/** Fragment lengths after cutting one molecule at the given positions. */
function fragments(dna: string, enzymes: string[]): { sizes: number[]; circularUncut: boolean } {
  const d = CUTS[dna];
  const cs = [...new Set(enzymes.flatMap(e => d.cuts[e] ?? []))].sort((a, b) => a - b);
  if (cs.length === 0) return { sizes: [d.length], circularUncut: d.circular };
  if (d.circular) {
    return { sizes: cs.map((c, i) => (i + 1 < cs.length ? cs[i + 1] - c : d.length - c + cs[0])), circularUncut: false };
  }
  const b = [0, ...cs, d.length];
  return { sizes: b.slice(1).map((x, i) => x - b[i]), circularUncut: false };
}

function laneBands(p: Preset, enzymes: string[]): Band[] {
  const out: Band[] = [];
  for (const part of p.parts) {
    const f = fragments(part.dna, enzymes);
    for (const s of f.sizes) out.push({ size: s, mass: s * part.amount, sc: f.circularUncut });
  }
  return out;
}

/** Merge identical sizes (same fragment from both alleles, or repeated sizes). */
function merged(bands: Band[]): Band[] {
  const m = new Map<string, Band>();
  for (const b of bands) {
    const k = b.size + (b.sc ? "sc" : "");
    const o = m.get(k);
    if (o) o.mass += b.mass; else m.set(k, { ...b });
  }
  return [...m.values()].sort((a, b) => b.size - a.size);
}

const fmtBp = (n: number) => n.toLocaleString("en-US");

// ---------------------------------------------------------------- UI

function mount(host: HTMLElement): void {
  injectStyle();
  const ds = host.dataset;
  let preset = PRESETS.find(p => p.key === ds.preset) ?? PRESETS[0];
  let enz: string[] = ds.enzymes
    ? ds.enzymes.split(/[\s,]+/).filter(e => ENZYMES.some(x => x.name === e)).slice(0, 2)
    : [...preset.enzymes];
  let agar = ds.agarose && AGAROSE[ds.agarose] ? ds.agarose : String(preset.agarose);
  let ladder = ds.ladder && LADDERS[ds.ladder] ? ds.ladder : preset.ladder;
  let showSizes = ds.sizes === "true";
  const onSlide = !!host.closest(".reveal");
  const labelGap = onSlide ? 17 : 12;   // minimum vertical distance between two size labels

  // controls
  const row1 = htmlEl("div", "gl-row", "", host);
  const gP = htmlEl("span", "gl-group", "", row1);
  htmlEl("span", "gl-lab", "DNA:", gP);
  const pBtns = PRESETS.map(p => button(gP, p.label, () => {
    preset = p; enz = [...p.enzymes]; agar = String(p.agarose); ladder = p.ladder; sync(); draw();
  }));

  const row2 = htmlEl("div", "gl-row", "", host);
  const gE = htmlEl("span", "gl-group", "", row2);
  htmlEl("span", "gl-lab", "enzymes (1 or 2):", gE);
  const eBtns = ENZYMES.map(e => button(gE, e.name, () => {
    if (enz.includes(e.name)) enz = enz.filter(x => x !== e.name);
    else enz = [...enz, e.name].slice(-2);
    sync(); draw();
  }));
  const gA = htmlEl("span", "gl-group", "", row2);
  htmlEl("span", "gl-lab", "agarose:", gA);
  const aKeys = Object.keys(AGAROSE);
  const aBtns = aKeys.map(k => button(gA, k + "%", () => { agar = k; sync(); draw(); }));

  const row3 = htmlEl("div", "gl-row", "", host);
  const gL = htmlEl("span", "gl-group", "", row3);
  htmlEl("span", "gl-lab", "ladder:", gL);
  const lKeys = Object.keys(LADDERS);
  const lBtns = lKeys.map(k => button(gL, LADDERS[k].label, () => { ladder = k; sync(); draw(); }));
  const cb = checkbox(row3, "show fragment sizes", showSizes, v => { showSizes = v; draw(); });
  cb.checked = showSizes;
  button(row3, "reset", () => {
    preset = PRESETS[0]; enz = [...preset.enzymes]; agar = String(preset.agarose); ladder = preset.ladder;
    showSizes = false; cb.checked = false; sync(); draw();
  });

  function sync(): void {
    pBtns.forEach((b, i) => b.classList.toggle("active", PRESETS[i] === preset));
    eBtns.forEach((b, i) => b.classList.toggle("active", enz.includes(ENZYMES[i].name)));
    aBtns.forEach((b, i) => b.classList.toggle("active", aKeys[i] === agar));
    lBtns.forEach((b, i) => b.classList.toggle("active", lKeys[i] === ladder));
  }
  sync();

  const main = htmlEl("div", "gl-main", "", host);
  const W = 640, H = 470;
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Virtual agarose gel" }, main);
  const side = htmlEl("div", "gl-side", "", main);
  htmlEl("p", "qb-note",
    "Teaching model: distance run falls with log(size); brightness is proportional to DNA mass in the band. " +
    "Sequences: λ NC_001416.1, pUC19 M77789.2, HBB PCR product from GRCh38 chr11.", host);

  const txt = (x: number, y: number, s: string, attrs: Record<string, string | number> = {}) => {
    const t = svgEl("text", { x, y, ...attrs }, svg);
    t.textContent = s;
    return t;
  };

  function draw(): void {
    svg.replaceChildren();
    const lanes: { name: string; sub: string; bands: Band[]; ladder?: boolean }[] = [];
    const L = LADDERS[ladder];
    lanes.push({ name: "M", sub: "ladder", ladder: true,
      bands: L.sizes.map(s => ({ size: s, mass: L.equalMass ? 1 : s })) });
    lanes.push({ name: "U", sub: "uncut", bands: merged(laneBands(preset, [])) });
    enz.forEach(e => lanes.push({ name: e, sub: "", bands: merged(laneBands(preset, [e])) }));
    if (enz.length === 2) lanes.push({ name: "both", sub: enz.join("+"), bands: merged(laneBands(preset, enz)) });

    const gx0 = 92, gx1 = W - 8, gy0 = 40, gy1 = H - 8;
    const wellY = gy0 + 14, runTop = wellY + 16, runBot = gy1 - 12;
    svgEl("rect", { x: gx0, y: gy0, width: gx1 - gx0, height: gy1 - gy0, rx: 6, fill: "#1f262d" }, svg);
    const laneW = (gx1 - gx0) / Math.max(lanes.length, 4);
    const bw = laneW * 0.66;
    const A = AGAROSE[agar];
    const dist = (size: number) => 1 / (1 + Math.exp((Math.log10(size) - A.m) / A.w));
    const yOf = (size: number) => runTop + dist(size) * (runBot - runTop) * 1.03;

    lanes.forEach((ln, i) => {
      const cx = gx0 + (i + 0.5) * laneW;
      // lane labels above the gel
      txt(cx, gy0 - 20, ln.name, { class: "lane", "text-anchor": "middle" });
      if (ln.sub) txt(cx, gy0 - 4, ln.sub, { class: "lsize", "text-anchor": "middle" });
      svgEl("rect", { x: cx - bw / 2, y: wellY, width: bw, height: 7, fill: "#0b0f12", stroke: "#58636d", "stroke-width": 1 }, svg);
      const maxMass = Math.max(...ln.bands.map(b => b.mass));
      let lastLabelY = -1e9;   // skip a size label that would overlap the one above it
      for (const b of ln.bands) {
        const apparent = b.sc ? b.size * 0.6 : b.size;  // supercoiled circles run ahead of their size
        const y = yOf(apparent);
        if (y > runBot + 6) continue;                   // ran off the bottom of the gel
        const rel = ln.ladder ? (ladder === "hind" ? Math.max(0.12, b.mass / maxMass) : 0.7) : b.mass / maxMass;
        const op = Math.min(1, 0.1 + 0.9 * Math.pow(rel, 0.6));
        svgEl("rect", { x: cx - bw / 2, y: y - 2.5, width: bw, height: 5, rx: 2, fill: "#ffe3a3", opacity: op.toFixed(3) }, svg);
        if (ln.ladder) {
          if (y - lastLabelY >= labelGap) { txt(gx0 - 6, y + 4, fmtBp(b.size), { class: "lsize", "text-anchor": "end" }); lastLabelY = y; }
        } else if (showSizes && ln.bands.length <= 14 && y - lastLabelY >= labelGap + 1) {
          txt(cx + bw / 2 - 1, y - 5, b.sc ? "sc" : fmtBp(b.size), { class: "bsize", "text-anchor": "end" });
          lastLabelY = y;
        }
      }
    });
    txt(4, gy0 - 20, "bp", { class: "lane" });

    // side panel: what was loaded, and the fragment list
    side.replaceChildren();
    htmlEl("div", "gl-title", preset.title, side);
    const siteTxt = enz.length
      ? enz.map(e => `${e} ${ENZYMES.find(x => x.name === e)!.site}`).join(",  ")
      : "no enzyme chosen: only the uncut DNA is shown";
    htmlEl("div", "", siteTxt, side);
    const ro = htmlEl("div", "qb-readout", "", side);
    if (!showSizes) {
      ro.textContent = lanes.slice(1).map(l => `${l.name}${l.sub && l.name !== "U" ? " (" + l.sub + ")" : ""}: ${l.bands.length} band${l.bands.length === 1 ? "" : "s"}`).join("\n")
        + "\n\nEstimate the sizes from the ladder, then tick\n\"show fragment sizes\" to check.";
    } else {
      ro.textContent = lanes.slice(1).map(l => {
        const head = `${l.name}${l.sub && l.name !== "U" ? " (" + l.sub + ")" : ""}`;
        if (l.bands.some(b => b.sc)) return `${head}: uncut circle (supercoiled; runs ahead of its true ${fmtBp(l.bands[0].size)} bp)`;
        const s = l.bands.map(b => fmtBp(b.size));
        const list = s.length > 12 ? `${s.length} fragments: ${s.slice(0, 8).join(", ")}, …` : s.join(", ");
        const tot = l.bands.reduce((a, b) => a + b.size, 0);
        return `${head}: ${list}` + (preset.parts.length === 1 && s.length > 1 && s.length <= 12 ? `  (sum ${fmtBp(tot)})` : "");
      }).join("\n");
    }
  }
  draw();
}

autoMount(NAME, mount);
