// Pure model for the parent–offspring regression demo (no DOM).
//
// Standardised additive model, one value per person (z units, variance 1 in parents):
//   parent    P = A + C + E,   var(A) = h², var(C) = c², var(E) = 1 − h² − c²
//   offspring A_o = (A_mother + A_father)/2 + segregation noise, var h²/2
//             C_o = (C_mother + C_father)/2 + noise, var c²/2  (the child's family
//                   environment resembles the parents' environments: shared environment)
//             E_o independent, var 1 − h² − c²
// So every generation has the same variances, and
//   offspring on midparent:  expected slope = h² + c²
//   offspring on one parent: expected slope = (h² + c²)/2
// With c² = 0 the slope is h² (midparent) or h²/2 (one parent).
// Values are shown as height-like units: 170 + 7·z cm.
import { rng } from "../lib/ui";

export const MEAN = 170, SD = 7, NMAX = 1000;

/** Standard normal draws for NMAX families, fixed for a seed (so sliders move points smoothly). */
export interface Draws { z: Float64Array[] }   // 9 arrays of length NMAX

export function makeDraws(seed: number): Draws {
  const r = rng(seed);
  const z: Float64Array[] = [];
  for (let k = 0; k < 9; k++) {
    const a = new Float64Array(NMAX);
    for (let i = 0; i < NMAX; i++) a[i] = r.norm();
    z.push(a);
  }
  return { z };
}

export interface Families { x: number[]; y: number[] }

/** Phenotypes (cm) of n families. x = midparent (or the mother if single), y = offspring. */
export function families(d: Draws, n: number, h2: number, c2: number, single: boolean): Families {
  const e2 = Math.max(0, 1 - h2 - c2);
  const sa = Math.sqrt(h2), sc = Math.sqrt(c2), se = Math.sqrt(e2);
  const [zAm, zAf, zCm, zCf, zEm, zEf, zSeg, zCo, zEo] = d.z;
  const x: number[] = [], y: number[] = [];
  for (let i = 0; i < n; i++) {
    const Am = sa * zAm[i], Af = sa * zAf[i];
    const Cm = sc * zCm[i], Cf = sc * zCf[i];
    const Pm = Am + Cm + se * zEm[i], Pf = Af + Cf + se * zEf[i];
    // offspring: segregation and environment noise from two independent draws
    const Ao = (Am + Af) / 2 + Math.sqrt(h2 / 2) * zSeg[i];
    const Co = (Cm + Cf) / 2 + Math.sqrt(c2 / 2) * zCo[i];
    const Po = Ao + Co + se * zEo[i];
    x.push(MEAN + SD * (single ? Pm : (Pm + Pf) / 2));
    y.push(MEAN + SD * Po);
  }
  return { x, y };
}

export function expectedSlope(h2: number, c2: number, single: boolean): number {
  return single ? (h2 + c2) / 2 : h2 + c2;
}

export interface Fit { a: number; b: number; se: number; r: number; n: number }

/** Least-squares fit y = a + b x, with the standard error of b and the correlation r. */
export function fit(x: number[], y: number[]): Fit {
  const n = x.length;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
  mx /= n; my /= n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  }
  const b = sxy / sxx, a = my - b * mx;
  const rss = Math.max(0, syy - b * sxy);
  const se = Math.sqrt(rss / Math.max(1, n - 2) / sxx);
  const r = sxy / Math.sqrt(sxx * syy);
  return { a, b, se, r, n };
}
