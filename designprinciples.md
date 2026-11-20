# Design principles

These principles govern how we build course material in this repository. See [audience.md](audience.md) for who we are designing for and [elo.md](elo.md) for what we teach.

## 1. Genetics first, tools second

Every database lookup, R snippet and demo answers a genetics question from that unit. We never teach a tool for its own sake. The bioinformatics thread comes **on top of** the course ELOs and must not crowd out the genetics.

## 2. By hand first

Genetic reasoning (crosses, pedigrees, mapping, Hardy–Weinberg) is learned with pen and paper. Every exercise opens with **By hand** problems. After that, the demo lets students see the same thing move, and R checks it or scales it up.

## 3. Exercise structure

`exercise.qmd` follows this structure: **Goal** → **Background** → **By hand** → **Explore** (`{#explore}`, demo) → **Find it** (databases) → **In R** → **Solutions**. Solutions are in collapsed callouts. A unit with no demo omits Explore; a unit with nothing to search omits Find it.

## 4. Find it: stable facts, explicit links

Database tasks ask for facts that will not change from year to year: chromosome, mode of inheritance, gene function, variant consequence. They do not ask for exact counts that drift. Each task links to the database and names the field to read. Solutions give the expected answer *and* the click path.

## 5. In R: a modest lift, with offline data

Default to the tidyverse, and use base R where it is clearer (`sample`, `rbinom`, `chisq.test`). Introduce one new idiom per unit. Any data read by R is committed under `<unit>/data/`, so no exercise depends on a live download. R chunks are plain `r` fences, run with `Rscript --vanilla`, with the output pasted into the solutions.

## 6. Linked hints over named hints

Every key function, database or concept named in a hint links to its documentation, so students never have to guess search terms.

## 7. Exercises over stretch goals

Write a good number of core exercises rather than long optional tails. A short "Where this leads" note pointing to a later unit is fine.

## 8. Small decks

Each lecture deck is one topic, with roughly 12–18 content slides. If a deck grows too big, split it into a new unit; do not cut good material. Every slide has speaker notes.

## 9. Honest about recaps and simplifications

Mark recap material as recap, and name the earlier course it comes from. When we simplify (complete dominance, no linkage), say so and name the unit where the full story arrives.
