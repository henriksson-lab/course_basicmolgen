// Statistics for the chisq demo: the χ² density and upper-tail probability, computed
// from the regularized incomplete gamma function (series for small x, continued
// fraction for large x; Numerical Recipes §6.2), and a seeded multinomial sampler.
// Checked against R: see the table at the bottom of this file.

/** log Γ(z) for z > 0 (Lanczos, g = 7, n = 9). */
export function lnGamma(z: number): number {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lnGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Lower regularized gamma P(a, x) by its series (good for x < a + 1). */
function gammaPSeries(a: number, x: number): number {
  let sum = 1 / a, term = sum;
  for (let n = 1; n < 500; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
}

/** Upper regularized gamma Q(a, x) by a continued fraction (good for x >= a + 1). */
function gammaQCF(a: number, x: number): number {
  const tiny = 1e-300;
  let b = x + 1 - a, c = 1 / tiny, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/** Upper regularized incomplete gamma Q(a, x) = 1 − P(a, x). */
export function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  return x < a + 1 ? 1 - gammaPSeries(a, x) : gammaQCF(a, x);
}

/** P(X ≥ x) for X ~ χ²(df): the p-value. Same as R's pchisq(x, df, lower.tail = FALSE). */
export function chisqUpper(x: number, df: number): number {
  return gammaQ(df / 2, x / 2);
}

/** P(X ≤ x) for X ~ χ²(df). Same as R's pchisq(x, df). */
export function chisqCdf(x: number, df: number): number {
  return 1 - chisqUpper(x, df);
}

/** χ² density, as R's dchisq(x, df). */
export function chisqPdf(x: number, df: number): number {
  if (x <= 0) return df === 2 ? 0.5 : df < 2 ? Infinity : 0;
  const k = df / 2;
  return Math.exp((k - 1) * Math.log(x) - x / 2 - k * Math.LN2 - lnGamma(k));
}

/** Quantile by bisection: the x with P(X ≥ x) = p. qchisq(1 − p, df) in R. */
export function chisqUpperQuantile(p: number, df: number): number {
  let lo = 0, hi = 1;
  while (chisqUpper(hi, df) > p) hi *= 2;
  for (let i = 0; i < 80; i++) {
    const m = (lo + hi) / 2;
    if (chisqUpper(m, df) > p) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

/** Σ (O − E)² / E, with E = N·p. */
export function chisqStat(obs: number[], probs: number[]): { stat: number; exp: number[]; parts: number[] } {
  const N = obs.reduce((s, v) => s + v, 0);
  const exp = probs.map(p => N * p);
  const parts = obs.map((o, i) => (exp[i] > 0 ? (o - exp[i]) ** 2 / exp[i] : 0));
  return { stat: parts.reduce((s, v) => s + v, 0), exp, parts };
}

/** One multinomial sample of size N: each individual falls in class i with probability probs[i]. */
export function multinomial(N: number, probs: number[], unif: () => number): number[] {
  const cum: number[] = [];
  probs.reduce((s, p, i) => (cum[i] = s + p), 0);
  const out = new Array(probs.length).fill(0);
  const last = probs.length - 1;
  for (let n = 0; n < N; n++) {
    const u = unif() * cum[last];
    let i = 0;
    while (i < last && u >= cum[i]) i++;
    out[i]++;
  }
  return out;
}

// Checked against R (pchisq(x, df, lower.tail = FALSE) and dchisq(x, df)); all agree to
// 10 significant digits. check.ts prints the values from this file.
//   x         df  p-value (R and here)   density (R and here)
//   0.26288   1   0.6081484244           0.6822564122
//   0.47002   3   0.9254267559           0.2162243940
//   3.841459  1   0.04999999465          0.02981945774
//   9.487729  4   0.05000000076          0.02064752995
//   20        1   7.744216431e-06        4.049955478e-06
//   2.138868  7   0.9517559403           0.06107021926
//   100       2   1.928749848e-22        9.643749240e-23
// Run: node_modules/.bin/esbuild demos/src/chisq/check.ts --bundle --platform=node | node
