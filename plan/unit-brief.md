# Brief for building one unit

This brief is for whoever builds a unit, whether a person or an agent. Read these first: `designprinciples.md`, `audience.md`, `elo.md`, `plan/plan.md` §3–4, `demos/README.md` and `plan/figure-qa-checklist.md`.

## The reference scaffold

The reference implementation is `/home/mahogny/github/course/quantbio-3MB00A`. Copy its *style and file conventions*, not its content. Study these files closely before writing:

- `pca/lec.qmd`: the reveal.js YAML header (copy it, changing title, subtitle and author), the "About this lecture" opening slide, `{.smaller}` slides, `::: notes` on **every** slide, and SVG figures embedded with `![](figNN-name.svg){width="60%" fig-align="center"}`.
- `pca/quiz.qmd`: the quiz format (**Q1.**, a Hint callout, an Answer callout, `---` between questions).
- `pca/exercise.qmd`: the exercise format (Goal, Background, By hand, Explore with the demo embed, In R, Solutions).
- `demos/src/pca2d/main.ts`, `demos/src/countratio/main.ts` and `demos/src/lib/ui.ts`: the demo code style, `autoMount`, injected style, `data-*` options, and the helpers for sliders, buttons and presets.
- `pca/fig*.svg`: the style of hand-written SVG figures (Helvetica, `#1b2a3a` ink, a muted palette, comments in the SVG).

## What to write in `<unit>/`

1. **`lec.qmd`**: 12–18 content slides on the topic, at year-2 BSc level. Every slide has `::: notes`. Open with "About this lecture" and end with a "Summary" slide and a "Where this leads" slide. Use 3–6 SVG figures (`figNN-*.svg`) drawn by hand in SVG. QA every figure: render it with `python3 -c "import cairosvg; cairosvg.svg2png(url='f.svg', write_to='/scratch/f.png', output_width=1100)"`, look at the PNG, and apply the checklist (no overlapping text, no wasted space, labels inside the canvas). If the unit has a demo, also embed it on a slide.
2. **`quiz.qmd`**: 8–12 conceptual and small numeric questions, each with a Hint and an Answer callout.
3. **`exercise.qmd`**, with sections in this order:
   - **Goal**: a bullet list of "you should be able to…".
   - **Background**: a short recap of the key facts and formulas.
   - **By hand**: 6–10 pen-and-paper problems (B1, B2, …) using genetics with real organisms where possible.
   - **Explore** `{#explore}`: the demo embed plus 3–5 questions (E1, …), with solutions in a collapsed callout. Leave this out if the unit has no demo.
   - **Find it**: 3–5 database tasks (F1, …). Each task links to the database, says what to search for and which field to read, and asks for a fact that is stable over time. **Verify every fact you put in a solution** by fetching the actual page or API, for example the NCBI E-utilities, the Ensembl REST API (`rest.ensembl.org`), or the ClinVar/MedGen pages. If OMIM blocks automated access, use the MIM number with facts confirmed via NCBI (MedGen, Gene) or Orphanet, and link the OMIM page for students. Never invent IDs, numbers or frequencies. Give the click path in the solution.
   - **Solutions** for By hand, Explore and Find it, then **Where this leads**, then a final line: `**Next:** [Exercise in R](exercise-r.qmd): …`.
4. **`exercise-r.qmd`**: the R part, as its own page with the same YAML `format:` block. Its sections are **Goal** (R bullets), **Before you start** (a link back to the exercise, the packages to load, and download links for `data/` files), **Tasks**, **Solutions** and **Where this leads**. The task rules:
   - **Tasks**: 3–6 tasks (R1, …). Students know base R and the tidyverse. Use `library(dplyr)`, `library(ggplot2)` and so on, plus base R where it is clearer. Introduce the **one new R idiom** named for the unit in `plan/plan.md` §3–4. If R reads data, commit it as a small CSV/TSV in `<unit>/data/` and load it in the exercise with a relative path (`read_csv("data/x.csv")`). Also give the download link, as the site serves the file next to the page. Use `set.seed()` for anything random.
   - Solutions go in a collapsed callout, with numbers worked out. Run every R chunk with `Rscript --vanilla` (from the unit folder) and paste the real output. Do not make up output.

   R chunks are plain ```` ```r ```` fences, not `{r}`, so Quarto does not execute them.
5. **Demo** (if the unit has one): `demos/src/<name>/main.ts`, following the rules in `demos/README.md`. No network access, a seeded RNG, readable at slide size, and a reset or preset button. Build it with `demos/build.sh <name>` and type-check it with `node_modules/.bin/tsc --noEmit -p demos`. Embed it in the exercise like this:

   ````md
   ```{=html}
   <link rel="stylesheet" href="../demos/dist/demo.css">
   <div data-demo="<name>"></div>
   <script src="../demos/dist/<name>.js"></script>
   ```
   ````

## Rules

- Write only in your own unit folder and in `demos/src/<your demo>/`. **Do not edit** `_quarto.yml`, `styles.css`, `dictionary.qmd`, `elo.md`, `demos/src/lib/` or other units. If you need a shared helper, put a local copy in your demo folder.
- Write in plain, clear English. Use *italics* for gene symbols. Use correct genetic notation, such as *A*/*a* and *Aa* × *Aa*.
- Use chapter references to the course book by topic, e.g. "Hartwell, Mendel's principles chapter". Do not use page numbers.
- Check that the unit renders: `quarto render <unit>/lec.qmd`, then the quiz and the exercise. Renders go to `docs/` and that is fine. **Do not** run a full-site `quarto render`, since other units are being written in parallel. Do not run git commands.
- At the end, report back:
  1. the files created;
  2. 5–12 glossary entries for `dictionary.qmd`, each in the form `**Term**: definition. See [Unit title](unit/lec.qmd).`;
  3. any database fact you could not verify;
  4. anything you think should change in the plan.

## Lessons from Part 1

- OMIM returns 403 to automated requests. Verify facts through NCBI MedGen and Gene (E-utilities), and link the OMIM page for students.
- Data snapshots record their source accession or release in a column or a comment.
- Check whether `plan/plan.md` §4 has already introduced an R idiom in an earlier unit. If it has, reuse it rather than re-teach it.
