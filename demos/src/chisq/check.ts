// Prints chisqUpper / chisqPdf for a few values, to compare with R's pchisq / dchisq.
// Run from the repo root:
//   node_modules/.bin/esbuild demos/src/chisq/check.ts --bundle --platform=node | node
import { chisqUpper, chisqPdf, chisqUpperQuantile } from "./stats";

const cases: [number, number][] = [[0.26288, 1], [0.47002, 3], [3.841459, 1], [5.991465, 2],
  [7.814728, 3], [9.487729, 4], [0.01, 1], [20, 1], [50, 3], [2.138868, 7], [100, 2]];
for (const [x, df] of cases)
  console.log(x, df, chisqUpper(x, df).toPrecision(10), chisqPdf(x, df).toPrecision(10));
for (const df of [1, 2, 3, 4]) console.log("crit", df, chisqUpperQuantile(0.05, df).toPrecision(8));
