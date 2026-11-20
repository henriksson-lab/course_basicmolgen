# Basic and molecular genetics (5MO104): course site sources

Teacher information. This file is not part of the published site.

The site follows the order of the course book (Hartwell et al., *Genetics: From Genes to Genomes*). The scaffold comes from the quantbio course (3MB00A). Planning documents are in `plan/`. Start with `plan/plan.md` and `plan/course-order.md`.

## Unit layout

Each unit is one folder:

- `lec.qmd`: reveal.js lecture with speaker notes. Figures are hand-written SVG (`figNN-*.svg`).
- `quiz.qmd`: short questions with collapsible hints and answers.
- `exercise.qmd`: **By hand** → **Explore** (demo) → **Find it** (public databases) → **In R** → solutions.
- `data/`: snapshots of any data the R part reads, so exercises keep working when databases change.

## Building this site

```bash
npm i          # once (or copy node_modules/): esbuild + typescript for the demos
make           # build demos, render the whole site to docs/, git add
make preview   # live-reload preview server
make typecheck # type-check the demo sources
make clean     # delete docs/ and the Quarto cache
```

You need [Quarto](https://quarto.org/docs/get-started/) and a recent [R](https://cran.r-project.org/) with the tidyverse.
