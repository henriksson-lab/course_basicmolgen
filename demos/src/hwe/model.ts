// Pure functions for the hwe demo: genotype frequencies from (p, F), the de Finetti
// coordinates of a population, counts in a sample of N, and the χ² test for HWE (df = 1).
import { chisqUpper } from "./stats";

/** Genotype frequencies [AA, Aa, aa]. */
export type Freqs = [number, number, number];

/** Valid range of F for allele frequency p: all three genotype frequencies must be ≥ 0. */
export function fRange(p: number): [number, number] {
  const q = 1 - p;
  if (p <= 0 || q <= 0) return [0, 1];
  return [-Math.min(p, q) / Math.max(p, q), 1];
}

/** Genotype frequencies for allele frequency p (of A) and inbreeding coefficient F. */
export function freqsFromPF(p: number, F: number): Freqs {
  const q = 1 - p;
  const [lo, hi] = fRange(p);
  const f = Math.min(hi, Math.max(lo, F));
  const fAA = Math.max(0, p * p + f * p * q), faa = Math.max(0, q * q + f * p * q);
  return [fAA, Math.max(0, 1 - fAA - faa), faa];
}

/** p = f(AA) + f(Aa)/2, observed and expected heterozygosity, F = 1 − Hobs/Hexp. */
export function summary(fr: Freqs): { p: number; q: number; hObs: number; hExp: number; F: number } {
  const p = fr[0] + fr[1] / 2, q = 1 - p;
  const hExp = 2 * p * q, hObs = fr[1];
  return { p, q, hObs, hExp, F: hExp > 1e-12 ? 1 - hObs / hExp : 0 };
}

/** de Finetti coordinates: x = q = f(aa) + f(Aa)/2, y = f(Aa). */
export function toXY(fr: Freqs): [number, number] {
  return [fr[2] + fr[1] / 2, fr[1]];
}

/** Inverse of toXY, clamped inside the triangle (0 ≤ H ≤ 2·min(q, 1 − q)). */
export function fromXY(q: number, H: number): Freqs {
  const qq = Math.min(1, Math.max(0, q));
  const h = Math.min(2 * Math.min(qq, 1 - qq), Math.max(0, H));
  const faa = Math.max(0, qq - h / 2), fAA = Math.max(0, 1 - h - faa);
  return [fAA, h, faa];
}

/** Integer counts that add up to N and are as close as possible to N · freqs (largest remainder). */
export function roundCounts(N: number, fr: number[]): number[] {
  const raw = fr.map(f => N * f);
  const out = raw.map(Math.floor);
  let left = N - out.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
  for (let j = 0; left > 0; j++, left--) out[order[j % order.length][1]]++;
  return out;
}

export interface HweTest {
  N: number;
  p: number;          // estimated from the counts
  q: number;
  exp: number[];      // N p², 2Npq, N q²
  parts: number[];    // (O − E)²/E per class
  chi2: number;
  df: number;         // 3 classes − 1 − 1 estimated parameter = 1
  pval: number;
  hObs: number;
  hExp: number;
  F: number;
  monomorphic: boolean;
}

/** χ² test of Hardy–Weinberg equilibrium on counts [nAA, nAa, naa]. */
export function hweTest(obs: number[]): HweTest {
  const N = obs[0] + obs[1] + obs[2];
  const p = N > 0 ? (2 * obs[0] + obs[1]) / (2 * N) : 0.5, q = 1 - p;
  const exp = [N * p * p, 2 * N * p * q, N * q * q];
  const parts = obs.map((o, i) => (exp[i] > 1e-12 ? (o - exp[i]) ** 2 / exp[i] : 0));
  const chi2 = parts.reduce((s, v) => s + v, 0);
  const hExp = 2 * p * q, hObs = N > 0 ? obs[1] / N : 0;
  const monomorphic = p <= 0 || q <= 0;
  return {
    N, p, q, exp, parts, chi2, df: 1, pval: monomorphic ? 1 : chisqUpper(chi2, 1),
    hObs, hExp, F: hExp > 1e-12 ? 1 - hObs / hExp : 0, monomorphic,
  };
}
