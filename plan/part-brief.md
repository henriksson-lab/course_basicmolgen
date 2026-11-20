# Brief for building a whole part (several units)

You build every unit of one part, **in order**, so the part reads as a whole: later units build on earlier ones and refer back to them.

## Read first

- `plan/unit-brief.md`: the authoritative spec for one unit, covering the files, the sections and the rules.
- `plan/plan.md` §3–4 and `plan/course-order.md`: your units, demos, Find it ideas and R idioms.
- `audience.md` and `designprinciples.md`.
- Use the finished Part 1 units as **models of quality and style**, especially `mendel/` and `pedigrees/`: `lec.qmd`, `quiz.qmd`, `exercise.qmd`, `exercise-r.qmd` and their figures, plus `demos/src/punnett/` and `demos/src/pedigree/`. Part 1's R parts are being moved into `exercise-r.qmd` while you work; if a Part 1 unit has no `exercise-r.qmd` yet, follow the brief.

## Every unit gets

- `lec.qmd`, `quiz.qmd`, `exercise.qmd` and `exercise-r.qmd`. The R page is required for every unit, even recaps.
- The demo(s) listed in `plan/course-order.md`, at the anchors the sidebar already uses: `#explore`, or `#explore-<x>` for a second demo. The sidebar in `_quarto.yml` is already written. **Do not edit it.** If you think a demo should change, say so in your report.
- **Recap units** (`*-recap`) are lighter: 8–12 slides, 6–8 quiz questions, a short exercise and a short R page. They recap 5MO103 *through the lens of genetics*: which mutations break what, and how we know.

## Tools: avoid permission prompts

- Use only **Read, Edit and Write** to create or change files. No heredocs, `sed -i`, inline `python -c`, or `cd x; …` chains.
- In Bash, run only single plain commands with absolute paths, for example:
  - `quarto render /abs/unit/lec.qmd`
  - `/abs/demos/build.sh name`
  - `/abs/node_modules/.bin/tsc --noEmit -p /abs/demos`
  - `Rscript --vanilla /abs/script.R`
  - `python3 /abs/script.py`
  - `curl -sL -o /abs/unit/data/x.tsv "<url>"`
  - `ls`, `grep`
- **Running R:** write the chunk to a script in the scratchpad, `/big/henriksson/temp/claude-tmp/claude-1001/-data-henriksson-github-course-basicmolgen/scratch-<part>/`. Its first line is `setwd("/data/henriksson/github/course/basicmolgen/<unit>")`, which is not shown to students. Then run it with `Rscript --vanilla`.
- **Figure QA:** write a small Python script in that scratch folder that renders an SVG with cairosvg to PNG. Run it, then Read the PNG.
- Do not run git. Do not run a full-site `quarto render`. Do not edit files outside your part's unit folders, your demo folders and your scratch folder. The only exception is that Part 2 owns `demos/src/meiosis/`.

## Data snapshots

Download real data where the plan asks for it, through public APIs or downloads such as the Ensembl REST API, NCBI E-utilities and Datasets, the GWAS Catalog REST API, cBioPortal and UCSC.

- Keep files small: under about 1 MB each.
- Record the source URL, the release or accession, and the date, either in a `source` column or in a short `data/README.md`.
- Simulated or invented teaching data must say so in the file and on the page.
- Never invent numbers and present them as real.

## Report back

1. The files created, per unit.
2. The glossary entries per unit, in the brief's format, grouped under the unit title.
3. ELO table rows for `elo.md`, one per unit, in the format `| Unit title | A student can… | ELO numbers |`.
4. Facts you could not verify.
5. Suggested changes to the plan or the sidebar.
