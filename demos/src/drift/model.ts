// Wright–Fisher model with selection: pure functions, no DOM.
// Diploid population of N individuals (2N gene copies). Allele A has frequency p.
// Fitnesses: wAA = 1 + s, wAa = 1 + h·s, waa = 1. Each generation:
//   1. selection (deterministic): p' = (p² wAA + p q wAa) / w̄
//   2. drift: the next generation's 2N copies are a binomial sample, count ~ Bin(2N, p').
import { rng } from "../lib/ui";

export interface Params {
  N: number;     // diploid individuals
  s: number;     // selection coefficient
  h: number;     // dominance of A
  p0: number;    // starting frequency of A
  reps: number;  // replicate populations
  gens: number;  // generations
  seed: number;
}

export interface Fit { wAA: number; wAa: number; waa: number }

export function fitness(s: number, h: number): Fit {
  return { wAA: Math.max(0, 1 + s), wAa: Math.max(0, 1 + h * s), waa: 1 };
}

/** One generation of selection on allele frequency p (infinite population). */
export function selectStep(p: number, w: Fit): number {
  const q = 1 - p;
  const wbar = p * p * w.wAA + 2 * p * q * w.wAa + q * q * w.waa;
  if (wbar <= 0) return p;
  return (p * p * w.wAA + p * q * w.wAa) / wbar;
}

type Rng = ReturnType<typeof rng>;

/** Seeded binomial draw: exact inversion when n·min(p,1−p) is small, else a normal approximation. */
export function binom(r: Rng, n: number, p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return n;
  const flip = p > 0.5;
  const pp = flip ? 1 - p : p;
  let k: number;
  if (n * pp < 30) {
    // inversion: walk up the cumulative distribution
    const q = 1 - pp;
    let prob = Math.pow(q, n), cum = prob;
    const u = r.unif();
    k = 0;
    while (u > cum && k < n) {
      prob *= ((n - k) / (k + 1)) * (pp / q);
      k++;
      cum += prob;
    }
  } else {
    const mu = n * pp, sd = Math.sqrt(n * pp * (1 - pp));
    k = Math.round(mu + sd * r.norm());
    k = Math.min(n, Math.max(0, k));
  }
  return flip ? n - k : k;
}

/** Simulate `reps` replicate populations; returns one frequency trajectory (length gens+1) per replicate. */
export function simulate(P: Params): Float64Array[] {
  const r = rng(P.seed);
  const w = fitness(P.s, P.h);
  const twoN = 2 * P.N;
  const out: Float64Array[] = [];
  for (let i = 0; i < P.reps; i++) {
    const tr = new Float64Array(P.gens + 1);
    let p = P.p0;
    tr[0] = p;
    for (let t = 1; t <= P.gens; t++) {
      if (p > 0 && p < 1) p = binom(r, twoN, selectStep(p, w)) / twoN;
      tr[t] = p;
    }
    out.push(tr);
  }
  return out;
}

/** Deterministic (infinite-N) trajectory. */
export function deterministic(P: Params): number[] {
  const w = fitness(P.s, P.h);
  const out = [P.p0];
  let p = P.p0;
  for (let t = 1; t <= P.gens; t++) { p = selectStep(p, w); out.push(p); }
  return out;
}

/** Stable polymorphic equilibrium under heterozygote advantage, or null if wAa is not the highest. */
export function hetAdvantageEq(w: Fit): number | null {
  if (!(w.wAa > w.wAA && w.wAa > w.waa)) return null;
  return (w.wAa - w.waa) / (2 * w.wAa - w.wAA - w.waa);
}

export interface Summary {
  fixed: number; lost: number; seg: number;
  meanH: number;      // mean 2pq across replicates at the end
  expH: number;       // H0 (1 − 1/2N)^t, pure drift
  meanP: number;      // mean p at the end
}

export function summarise(P: Params, trs: Float64Array[]): Summary {
  let fixed = 0, lost = 0, seg = 0, H = 0, mp = 0;
  for (const tr of trs) {
    const p = tr[tr.length - 1];
    if (p >= 1) fixed++; else if (p <= 0) lost++; else seg++;
    H += 2 * p * (1 - p);
    mp += p;
  }
  const n = Math.max(1, trs.length);
  const expH = 2 * P.p0 * (1 - P.p0) * Math.pow(1 - 1 / (2 * P.N), P.gens);
  return { fixed, lost, seg, meanH: H / n, expH, meanP: mp / n };
}
