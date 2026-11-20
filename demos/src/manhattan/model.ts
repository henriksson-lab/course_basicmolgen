// Pure model for the simulated GWAS (no DOM).
//
// Genome: 22 autosomes, lengths from GRCh38 rounded to Mb. A grid of null SNPs spread
// evenly (about one every 0.36 Mb), plus 40 extra SNPs within ±1 Mb of each causal SNP,
// so that the linkage-disequilibrium "tower" around a causal locus has enough markers to
// be seen at genome scale (real arrays have ~1 marker per kb, far too many to draw).
//
// Causal loci: up to KMAX at seeded random positions. Causal SNP i has allele frequency
// f_i in [0.1, 0.5] and per-allele effect β (even i) or β/2 (odd i), in trait SD units.
// Test statistic of the causal SNP: z = ncp + e, ncp = β·sqrt(2 f (1−f) N), e ~ N(0, 1).
// A SNP at distance d from a causal SNP has LD r = exp(−d / 0.25 Mb) (taken as 0 beyond
// 1.5 Mb); its z = r·(ncp + e) + sqrt(1 − r²)·e_j. Null SNPs: z ~ N(0, 1).
// p = 2·Φ(−|z|), computed in log space so that very small p-values stay finite.
//
// All random draws (positions, frequencies, noise) are fixed for a seed, so moving the
// N or β slider changes only the signal, not the noise.
import { rng } from "../lib/ui";

export const CHR_MB = [248, 242, 198, 190, 181, 171, 159, 145, 138, 134, 135,
  133, 114, 107, 102, 90, 83, 80, 59, 64, 47, 51];
export const GENOME_MB = CHR_MB.reduce((a, b) => a + b, 0);
export const CHR_START: number[] = CHR_MB.map((_, i) => CHR_MB.slice(0, i).reduce((a, b) => a + b, 0));
export const KMAX = 10;
export const N_GRID = 8000;
export const N_LOCAL = 40;
export const LD_SCALE = 0.25;   // Mb
export const GW = 5e-8, SUGG = 1e-5;
export const LOG10_GW = -Math.log10(GW), LOG10_SUGG = -Math.log10(SUGG);

export interface Causal { chr: number; pos: number; g: number; freq: number; half: boolean }
export interface Snp { chr: number; pos: number; g: number }   // chr 0-based; pos Mb in chr; g genome Mb

export interface Study {
  snps: Snp[];
  causal: Causal[];        // all KMAX loci; the first k are active
  e: Float64Array;         // per-SNP noise
  eCausal: Float64Array;   // per-locus noise of the causal SNP
  near: Int16Array;        // for each SNP: index of the causal locus it is near (−1 = none)
  rLD: Float64Array;       // LD r with that locus
}

function chrOf(g: number): number {
  let c = 0;
  while (c < 21 && g >= CHR_START[c + 1]) c++;
  return c;
}

export function makeStudy(seed: number): Study {
  const r = rng(seed * 7919 + 13);
  const causal: Causal[] = [];
  while (causal.length < KMAX) {
    const g = r.unif() * GENOME_MB;
    const chr = chrOf(g), pos = g - CHR_START[chr];
    if (pos < 3 || pos > CHR_MB[chr] - 3) continue;              // not at a chromosome end
    if (causal.some(c => Math.abs(c.g - g) < 20)) continue;      // keep loci apart
    causal.push({ chr, pos, g, freq: 0.1 + 0.4 * r.unif(), half: causal.length % 2 === 1 });
  }
  const snps: Snp[] = [];
  for (let i = 0; i < N_GRID; i++) {
    const g = (i + 0.5 + 0.8 * (r.unif() - 0.5)) * GENOME_MB / N_GRID;
    const chr = chrOf(g);
    snps.push({ chr, pos: g - CHR_START[chr], g });
  }
  for (const c of causal) {
    for (let j = 0; j < N_LOCAL; j++) {
      const pos = c.pos + (r.unif() * 2 - 1);
      snps.push({ chr: c.chr, pos, g: CHR_START[c.chr] + pos });
    }
  }
  snps.sort((a, b) => a.g - b.g);
  const m = snps.length;
  const e = new Float64Array(m), near = new Int16Array(m), rLD = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    e[i] = r.norm();
    near[i] = -1;
    let best = 1.5;
    causal.forEach((c, k) => {
      const d = Math.abs(snps[i].g - c.g);
      if (snps[i].chr === c.chr && d < best) { best = d; near[i] = k; }
    });
    rLD[i] = near[i] >= 0 ? Math.exp(-best / LD_SCALE) : 0;
  }
  const eCausal = new Float64Array(KMAX);
  for (let k = 0; k < KMAX; k++) eCausal[k] = r.norm();
  return { snps, causal, e, eCausal, near, rLD };
}

/** log of erfc(x) for x ≥ 0 (Numerical Recipes erfcc; fractional error < 1.2e-7), never underflows. */
function logErfc(x: number): number {
  const t = 1 / (1 + 0.5 * x);
  const poly = -x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
    t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
    t * (-0.82215223 + t * 0.17087277))))))));
  return Math.log(t) + poly;
}

/** −log10 of the two-sided p-value 2·Φ(−|z|) = erfc(|z|/√2). */
export function mlog10p(z: number): number {
  return -logErfc(Math.abs(z) / Math.SQRT2) / Math.LN10;
}

export function ncp(c: Causal, beta: number, n: number): number {
  const b = c.half ? beta / 2 : beta;
  return b * Math.sqrt(2 * c.freq * (1 - c.freq) * n);
}

/** −log10 p for every SNP, given the number of active causal loci k, effect β and sample size N. */
export function scan(s: Study, k: number, beta: number, n: number): Float64Array {
  const out = new Float64Array(s.snps.length);
  for (let i = 0; i < s.snps.length; i++) {
    const c = s.near[i];
    let z = s.e[i];
    if (c >= 0 && c < k) {
      const r = s.rLD[i];
      z = r * (ncp(s.causal[c], beta, n) + s.eCausal[c]) + Math.sqrt(Math.max(0, 1 - r * r)) * s.e[i];
    }
    out[i] = mlog10p(z);
  }
  return out;
}

export interface Hit { chr: number; from: number; to: number; top: number; topPos: number; nSnps: number; causal: number }

/** Clusters of genome-wide significant SNPs (merge if within 1 Mb on the same chromosome). */
export function loci(s: Study, ml: Float64Array, k: number, thr = LOG10_GW): Hit[] {
  const hits: Hit[] = [];
  for (let i = 0; i < s.snps.length; i++) {
    if (ml[i] < thr) continue;
    const sn = s.snps[i];
    const last = hits[hits.length - 1];
    if (last && last.chr === sn.chr && sn.pos - last.to <= 1) {
      last.to = sn.pos; last.nSnps++;
      if (ml[i] > last.top) { last.top = ml[i]; last.topPos = sn.pos; }
    } else hits.push({ chr: sn.chr, from: sn.pos, to: sn.pos, top: ml[i], topPos: sn.pos, nSnps: 1, causal: -1 });
  }
  for (const h of hits) {
    for (let c = 0; c < k; c++) {
      const cc = s.causal[c];
      if (cc.chr === h.chr && cc.pos >= h.from - 1 && cc.pos <= h.to + 1) h.causal = c;
    }
  }
  return hits;
}

export function countAbove(ml: Float64Array, thr: number): number {
  let n = 0;
  for (const v of ml) if (v >= thr) n++;
  return n;
}
