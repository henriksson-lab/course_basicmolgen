# Data for the three-point-cross unit

Both files are **invented teaching data**, not real counts. Each row is one of the 8 offspring classes of a three-point testcross: the alleles the offspring got from the triple heterozygote (`+` = wild type) and the count `n`.

- `drosophila_v_cv_ct.csv`: *Drosophila melanogaster*, X-linked *v* (vermilion), *cv* (crossveinless), *ct* (cut). Heterozygous females *v cv*^+^ *ct*^+^ / *v*^+^ *cv ct* × *v cv ct* / Y males. The counts were made up to match the real order and approximate map positions on the X (*cv* 1-12, *ct* 1-20, *v* 1-33 cM; NCBI Gene records 44510, 44540 and 32026, "MapLocation" field, checked 2026-11-20), with interference.
- `maize_lg_gl_bm.csv`: maize, *lg* (liguleless), *gl* (glossy), *bm* (brown midrib). Parent *lg gl bm* / + + + (coupling) × *lg gl bm* / *lg gl bm*. The counts, and the gene order they imply, are invented and do not describe the real maize map.

Both files are also used by the `threepoint` demo (`demos/src/threepoint/main.ts`).
