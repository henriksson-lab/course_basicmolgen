// Pure model for the two-hit demo (Knudson 1971, retinoblastoma). No DOM here, so the
// numbers can be checked in node.
//
// Every person has n cell lineages at risk, half in each eye. Each RB1 allele in each
// lineage is hit (inactivated) at rate u per year; the waiting time is exponential.
//  - inherited first hit: every lineage already carries one hit (germline), so a lineage
//    becomes a tumour when its one remaining allele is hit: one more hit needed.
//  - sporadic: both alleles must be hit in the same lineage: two hits needed.
// A tumour arises at the time of the last needed hit, if that is before age T.

export interface Person {
  tumours: number;   // tumours by age T
  left: number;      // tumours in the left eye
  right: number;     // tumours in the right eye
  first: number;     // age at the first tumour (Infinity if none)
}

/** Simulate one group of people. `unif` is a seeded uniform(0,1) generator. */
export function simulateGroup(inherited: boolean, n: number, u: number, T: number,
  people: number, unif: () => number): Person[] {
  const half = Math.floor(n / 2);
  const out: Person[] = [];
  const hit = () => -Math.log(1 - unif()) / u;   // exponential waiting time
  for (let p = 0; p < people; p++) {
    let left = 0, right = 0, first = Infinity;
    for (let c = 0; c < n; c++) {
      let t = hit();
      if (t > T) continue;                        // most lineages are never hit
      if (!inherited) {
        const t2 = hit();
        if (t2 > T) continue;
        t = Math.max(t, t2);                      // the tumour starts at the second hit
      }
      if (c < half) left++; else right++;
      if (t < first) first = t;
    }
    out.push({ tumours: left + right, left, right, first });
  }
  return out;
}

export interface Summary {
  fracAffected: number;        // fraction with >= 1 tumour by age T
  meanTumoursAffected: number; // mean tumours per affected person
  fracBilateral: number;       // fraction of affected people with tumours in both eyes
  medianAge: number;           // median age at first tumour among the affected (NaN if none)
  hist: number[];              // fraction of people with 0, 1, ..., 5, >= 6 tumours
  ages: number[];              // sorted ages at first tumour (affected people only)
  people: number;
}

export const HIST_MAX = 6;     // last class is ">= 6"

export function summarise(ps: Person[]): Summary {
  const aff = ps.filter(p => p.tumours > 0);
  const ages = aff.map(p => p.first).sort((a, b) => a - b);
  const hist = new Array(HIST_MAX + 1).fill(0);
  for (const p of ps) hist[Math.min(p.tumours, HIST_MAX)]++;
  const m = ages.length;
  const median = m === 0 ? NaN : m % 2 ? ages[(m - 1) / 2] : (ages[m / 2 - 1] + ages[m / 2]) / 2;
  return {
    fracAffected: m / ps.length,
    meanTumoursAffected: m ? aff.reduce((s, p) => s + p.tumours, 0) / m : 0,
    fracBilateral: m ? aff.filter(p => p.left > 0 && p.right > 0).length / m : 0,
    medianAge: median,
    hist: hist.map(h => h / ps.length),
    ages,
    people: ps.length,
  };
}

/** Fraction of people with a tumour by age t (empirical). */
export function empiricalCdf(s: Summary, t: number): number {
  // ages are sorted: count those <= t by binary search
  let lo = 0, hi = s.ages.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (s.ages[mid] <= t) lo = mid + 1; else hi = mid; }
  return lo / s.people;
}

/** Expected fraction with a tumour by age t. One hit: 1 - e^(-n u t). Two hits: each
 *  lineage is done with probability (1 - e^(-u t))^2. */
export function theoryCdf(inherited: boolean, n: number, u: number, t: number): number {
  const pHit = 1 - Math.exp(-u * t);
  const pCell = inherited ? pHit : pHit * pHit;
  return 1 - Math.pow(1 - pCell, n);
}
