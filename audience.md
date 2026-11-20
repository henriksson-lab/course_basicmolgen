# Audience

**5MO104** is a compulsory year-2 course in the Life Science BSc at Umeå University, taken after *Microbiology and basic molecular biology* (5MO103). See [designprinciples.md](designprinciples.md) for how we build material and [elo.md](elo.md) for what we teach.

## What we can expect them to know

### Biology
- From 5MO103: the central dogma (replication, transcription and translation, with their regulation), prokaryote vs eukaryote cells, bacterial genetics and gene transfer, and the lac operon as an example of regulation. Book chapters that repeat this material (6, 8, 14, 16) are therefore **recaps**.
- From biochemistry: proteins, enzymes and metabolic pathways. Pathway thinking is useful for epistasis.
- Some genetics from upper-secondary school: Punnett squares and dominant/recessive. Expect misconceptions, for example that dominant means common.

### R and computing
Students learn R and computing in the year-1 course *Data Analysis in Life Sciences* (5KE232). Its material is in `/home/mahogny/github/course/introcomputing`; see its `contentplan.md`. That course is still growing, and students also practise some R in other courses before this one, such as lab data analysis in biochemistry and physiology. So assume they are **reasonably comfortable** with everyday R, a bit beyond 5KE232's current content. We don't need to re-explain data import, dplyr verbs or ggplot2 basics.

- **Known from 5KE232:**
  - RStudio projects and relative paths.
  - Base R objects and vectors, and a consistent `readr`/`dplyr`/`ggplot2` vocabulary for tables and plots.
  - Data checking: missing values, types and identifiers.
  - Grouped summaries.
  - R Markdown reports.
  - `t.test` and `lm`.
  - Basic terminal use (`ls`, `cd`, `grep`, pipes) and files and paths.
- **Expected from 5KE232, but not yet taught there:** writing simple functions of their own, with arguments and a return value. A TODO has been added to `introcomputing/contentplan.md`. **Either way, students practise writing functions here**, through `cross()`, `chisq_p()`, RF → cM and the LOD curve, and that practice stays. Until 5KE232 covers it, the Mendel unit also gives a short from-scratch explanation; that explanation can shrink once 5KE232 does.
- **Explicitly deferred by 5KE232, so it is new here:**
  - loops and simulation (`sample`, `rbinom`, `replicate`);
  - string handling for sequences;
  - joining tables;
  - bioinformatics formats (FASTA, TSV exports from databases);
  - databases and BLAST.
- The aim is a **modest lift**. Introduce each new idiom once, with a sentence of explanation, and then reuse it. Follow 5KE232's rule of one consistent syntax: tidyverse for tables and plots, and base R for simple calculations and random sampling. Do not show parallel base-R and tidyverse solutions. No Bioconductor in the core.

### Statistics
- **Known from 5KE232:**
  - mean, median, variance and SD;
  - biological vs technical replicates;
  - the null hypothesis, and the p-value as the probability of a result at least this extreme under H0;
  - the Welch t-test and the paired t-test;
  - confidence intervals;
  - straight-line fits with `lm`.
- **Not known:** ANOVA, multiple testing, count models and the χ² test. **The χ² goodness-of-fit test is taught here** from scratch, because it is the core statistical tool of transmission genetics. Heritability regression in Part 7 can reuse `lm` directly.

### Mathematics
- Upper-secondary level. Fractions and probability (product and sum rules) are recapped in the probability unit. Introduce notation slowly and always with numbers next to it.

### Databases
- **Assume no experience** with NCBI, Ensembl, OMIM and the like. Every "Find it" task gives the link and says exactly which field to read. The aim is that students can find things on their own by the end of the course.
