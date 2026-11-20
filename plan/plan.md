# Plan: new course site for Basic and Molecular Genetics (5MO104)

Status: draft, 2026-11-20. This is a teacher-only planning document. It is excluded from the rendered site.

## 1. What we are building

We are building a Quarto website for **5MO104 Basic and Molecular Genetics**: 15 ECTS, first cycle, year 2 of the Life Science BSc. The site reuses the scaffold of `../quantbio-3MB00A`:

- a docked left sidebar, with one section per part (topic block) and one subsection per unit;
- reveal.js lectures (`lec.qmd`) with speaker notes and SVG figures;
- quizzes (`quiz.qmd`) with hint and answer callouts;
- exercises (`exercise.qmd`) with "By hand", "Explore" (demo) and "In R" parts;
- TypeScript demos (`demos/src/<name>/`) embedded with `data-demo`;
- a glossary and an install page.

Scope: **content only**. Schedule, labs and assessment are out of scope.

There are two layers of content:

1. **The genetics core.** It follows the syllabus ELOs and the order of the course book.
2. **A bioinformatics thread on top of the ELOs.** Each unit has two parts. In **Find it**, students look things up in a public database. In **In R**, they do a small analysis that raises their R level a little. Students already know basic R. The aim is to make them confident at finding information and slightly better at R. It is not a bioinformatics course.

## 2. Syllabus baseline

Source: `../molbiol_program/courses/5MO104.md` and the Umeå syllabus. The syllabus is valid from 2016 and the literature list from 2017 week 44.

Modules: theory (7.5 ECTS), laboratory (6.5), ethics (1). We cover the theory and ethics content; labs and assessment are out of scope.

Official ELOs, paraphrased:

1. Basic genetics, and how molecular mechanisms control inheritance.
2. How inheritance is studied at cell and organism level, and how allele frequencies change in populations.
3. Testing, interpreting and statistically evaluating results.
4. Studying, presenting and discussing original literature in English.
5. Reflecting on the ethics of applying genetic knowledge.

Bioinformatics ELOs that we add on top. Students should be able to:

- B1. Find a gene, variant, disease or organism in the core public databases and pull out a specific fact (location, allele frequency, phenotype, function).
- B2. Run a sequence similarity search (BLAST) and read the result.
- B3. Search PubMed for original papers. This supports ELO 4.
- B4. Use R to test genetic ratios and Hardy–Weinberg equilibrium. This supports ELO 3.
- B7. Write small R functions and simulations of genetic processes, and plot the results with ggplot2.
- B5. Use R to simulate simple genetic processes: crosses, drift, heteroplasmy.
- B6. Load a downloaded table (TSV/CSV/FASTA) into R and summarise or plot it.

**Course book:** Hartwell et al., *Genetics: From Genes to Genomes*. The official list says the **5th edition (2015)**, but newer editions exist. The unit order below follows the 5th edition's chapters. See the open questions.

**Overlap with the preceding course, 5MO103.** That course already covers replication, transcription, translation, prokaryotic regulation and bacterial genetics. Book chapters 6, 8, 14 and 16 are therefore given as **short recap units**, not full units.

## 3. Content, in book order

The sidebar groups units by topic block in book order, with no weeks or dates. Each row is one unit folder, with a lecture, a quiz and an exercise.

### Part 1: Mendelian genetics (Ch 1–3)

| Unit (folder) | Ch | Find it | In R | Demo |
|---|---|---|---|---|
| `intro-genetics`: genetics as information | 1 | NCBI Gene and Ensembl: *HBB* and *CFTR*, chromosome, transcripts, mouse ortholog of *CFTR* | Genome size vs gene count table (NCBI Datasets snapshot); `mutate`, log-scale ggplot with `geom_text` | — |
| `mendel`: segregation and independent assortment | 2 | OMIM: find one recessive and one dominant monogenic disease | `sample()` and a `cross()` function to simulate a monohybrid or dihybrid cross (χ² is left to the next unit) | `punnett`: Punnett square / cross simulator |
| `probability-chisq`: probability rules and the χ² test | 2 | PubMed: reanalyses of Mendel's data ("too good to be true") | χ² by hand, then in R; p-values | `chisq`: observed vs expected, χ² distribution |
| `mendel-extensions`: dominance, lethals, epistasis, penetrance | 3 | OMIM: penetrance and expressivity of a real disease | Modified dihybrid ratios such as 9:7 and 12:3:1; testing which ratio fits | `epistasis`: pathway toggles change the ratio |
| `pedigrees`: pedigree analysis | 2–3 | OMIM/MedGen (DMD, Marfan, PKU, XLH) and ClinVar (*PAH* R408W) | Risk function; `rbinom` + `replicate` sibships; ascertainment bias with `filter` | `pedigree`: guess the mode of inheritance |

### Part 2: Chromosomes and mapping (Ch 4–5)

| Unit | Ch | Find it | In R | Demo |
|---|---|---|---|---|
| `chromosome-theory`: mitosis, meiosis, sex linkage | 4 | Ensembl karyotype view; X-linked genes in OMIM | — | `meiosis`: chromosomes through meiosis I/II, with nondisjunction |
| `linkage`: recombination frequency and mapping | 5 | FlyBase: classic *Drosophila* markers | Write a function: RF → map distance (Haldane vs Kosambi) | `crossover`: crossovers along a chromosome, RF vs distance saturation |
| `three-point-cross`: gene order and interference | 5 | — | Three-point cross analysis on a data frame | `threepoint` |
| `lod-scores`: human linkage and LOD | 5 | UCSC browser: the region around a mapped disease gene | LOD curve across θ, written as a function | `lod` |

### Part 3: DNA, mutation and gene function (Ch 6–8)

| Unit | Ch | Find it | In R | Demo |
|---|---|---|---|---|
| `dna-recap`: DNA structure and replication (recap from 5MO103) | 6 | NCBI Nucleotide: download a FASTA | Strings: `chartr` reverse complement, GC content | — |
| `mutation`: mutation types, complementation, the one gene–one enzyme idea | 7 | ClinVar and dbSNP: one missense and one nonsense variant (reuse *HBB* HbS/HbC from intro-genetics) | Codon table as a named vector; translate a short ORF and see a point mutation's effect | `complementation`: complementation-test grid |
| `gene-expression-recap`: from DNA to protein, splicing (short) | 8 | Ensembl transcripts and UniProt: isoforms of one gene | — | — |

### Part 4: Genome analysis (Ch 9–11). This block has the most bioinformatics.

| Unit | Ch | Find it | In R | Demo |
|---|---|---|---|---|
| `digital-dna`: restriction enzymes, PCR, sequencing | 9 | NCBI Primer-BLAST; BLAST a mystery read | Find restriction sites with `gregexpr`; predict fragment sizes | `gel`: restriction digest → gel; `pcr`: copy number per cycle |
| `genome-annotation`: genes, ORFs, homology, genome browsers | 10 | BLAST (blastn/blastp); UCSC/Ensembl tracks; BioMart export | Read a BioMart TSV; count genes per chromosome; barplot | `orf`: six-frame ORF finder |
| `genomic-variation`: SNPs, CNVs, haplotypes | 11 | gnomAD and 1000 Genomes: allele frequency of a variant across populations | Merge and plot frequency tables | — |

### Part 5: Chromosomes in detail (Ch 12–15)

| Unit | Ch | Find it | In R | Demo |
|---|---|---|---|---|
| `eukaryotic-chromosome`: chromatin, centromeres, telomeres | 12 | UCSC: telomere and centromere tracks | — | — |
| `rearrangements-aneuploidy`: deletions, inversions, translocations, polyploidy | 13 | ClinVar/DECIPHER: a CNV syndrome | Probabilities of aneuploid gametes | `nondisjunction` (shared with `meiosis`) |
| `bacterial-genetics-recap`: conjugation mapping (short, recap) | 14 | — | — | — |
| `organelle-inheritance`: mtDNA, heteroplasmy, maternal inheritance | 15 | MITOMAP | Simulate a heteroplasmy bottleneck with `rbinom`, `replicate` | `bottleneck` |

### Part 6: Gene regulation and development (Ch 16–19)

| Unit | Ch | Find it | In R | Demo |
|---|---|---|---|---|
| `prokaryotic-regulation-recap`: the lac operon as a genetic-analysis example | 16 | — | — | `lacoperon`: merodiploid logic (I⁻, Oᶜ, …) |
| `eukaryotic-regulation`: enhancers, transcription factors, epigenetics, X inactivation | 17 | JASPAR motif for a transcription factor; GTEx tissue expression | GTEx table: expression across tissues, boxplots | `xinactivation`: mosaic |
| `rna-regulation`: miRNA, RNAi | 18 | miRBase | — | — |
| `development-model-organisms`: genetic analysis of development | 19 | Alliance of Genome Resources: one gene across yeast, worm, fly, fish, mouse | — | — |

### Part 7: Beyond the single gene (Ch 20–22)

| Unit | Ch | Find it | In R | Demo |
|---|---|---|---|---|
| `cancer-genetics`: oncogenes, tumour suppressors, two hits | 20 | COSMIC and cBioPortal: mutation frequency of TP53 | Knudson two-hit simulation | `twohit` |
| `hardy-weinberg`: HWE, inbreeding | 21 | gnomAD genotype counts | χ² test for HWE; de Finetti plot | `hwe`: de Finetti triangle |
| `drift-selection`: drift, selection, mutation, migration | 21 | — | Wright–Fisher simulation with a loop, then `replicate` | `drift`: N, s and starting p sliders, many replicate lines |
| `complex-traits`: heritability, QTL, GWAS | 22 | GWAS Catalog: hits for height or T2D | Parent–offspring regression with `lm` (h²); Manhattan plot from a supplied table | `heritability`, `manhattan` |

### Ethics module (1 ECTS)

- `ethics`: a short lecture page covering genetic testing, direct-to-consumer genomics, germline editing, ethical review (Swedish Ethical Review Authority), and data privacy in genomic databases. Students re-identify themselves in the databases they used in the course.
- A group assignment brief, and a list of PubMed search strategies for finding case papers (B3).

### Further reading (optional)

- Biostrings and Bioconductor: a first look.
- biomaRt from R, instead of the BioMart web interface.
- Coalescent and phylogenies.
- CRISPR screens.

## 4. How R skills progress

Students already know base R and the tidyverse. Use the tidyverse (dplyr, ggplot2, readr, stringr) as the default, and use base R where it is clearer, for example `sample`, `rbinom` and `chisq.test`. The lift is towards **writing their own functions, simulating, joining tables and reading bioinformatics file formats**. It does not go as far as Bioconductor.

| Part | New R skill |
|---|---|
| 1 | Simulating crosses with `sample`; `chisq.test` and `pchisq`; writing a function that returns expected ratios |
| 2 | Functions with arguments and defaults (RF → cM); `purrr::map` or `sapply` over parameter values (LOD curve) |
| 3 | stringr: reverse complement, GC content, codon lookup with a named vector or a join |
| 4 | Reading FASTA by hand; `str_locate_all` for restriction sites; `read_tsv` of a BioMart export; `left_join` across populations |
| 5 | Reuse `rbinom`/`replicate` (introduced in pedigrees) for bottleneck simulations; distributions in ggplot2 |
| 6 | `group_by` and `summarise` on GTEx data; long vs wide format with `pivot_longer` |
| 7 | A Wright–Fisher loop; `lm` for heritability; a Manhattan plot built from scratch in ggplot2 |

Every R exercise uses a data snapshot committed under `<unit>/data/`, recording the source accession or release so it stays reproducible. This keeps exercises working when databases change their output. Each Find it task asks for a fact that is stable over time, such as a chromosome, a gene function or a variant's consequence, rather than exact counts.

## 5. Design principles

These are adapted from `quantbio-3MB00A/designprinciples.md`:

- **By hand first.** Genetics reasoning is learned on paper, so every exercise opens with pen-and-paper problems: crosses, pedigrees, mapping and HWE. R and demos come after.
- **Biology first.** Each R or database task answers a genetics question from that unit. No tool is taught for its own sake.
- **Linked hints.** Every database and R function named in a hint is a link.
- Core exercises over stretch goals; a short "Where this leads" note is fine.
- Audience: year-2 BSc students who know base R and the tidyverse. This is a lower level than the quantbio course. Introduce new idioms (functions, simulation, joins) the first time they appear, and keep the maths light.

## 6. Build phases

**Phase 1: copy and strip the scaffold.**

- Copy: `_quarto.yml` (rewrite the sidebar), `Makefile` (empty the `figs` target), `styles.css` (adjust the part-colour `nth-child` count), `theme.scss`, `package.json` (rename), `.gitignore`.
- Copy `demos/` without the content demos: keep `build.sh`, `tsconfig.json`, `demo.css`, `src/lib/ui.ts` and a README.
- Copy `tools/slide-editor/`, `intro/install.qmd` (trimmed to R plus the tidyverse, with no Bioconductor), a `dictionary.qmd` skeleton and `CODE_AUDIT_CHECKLIST.md`.
- Write the teacher docs: `README.md`, `audience.md`, `elo.md` (the syllabus ELOs plus B1–B7, mapped to units), `designprinciples.md`, `plan/course-order.md`. Do not copy `courseplan.md` or the canvas-quiz tooling.
- Write `index.qmd`.

**Phase 2: build one pilot unit end to end.** Use `mendel`: a lecture with figures, a quiz, an exercise (by hand, Explore, Find it, In R), and the `punnett` demo. Review it together and fix the template before scaling up.

**Phase 3: build out part by part.** Use the tables in §3. Each part ends with `make render`, `make typecheck`, a check that every R chunk runs, and a link check.

**Phase 4: demos.** About 20 are listed in §3, in rough priority order: punnett, chisq, crossover, meiosis, pedigree, hwe, drift, gel, pcr, bottleneck, lacoperon, lod, threepoint, epistasis, heritability, manhattan, orf, twohit, xinactivation, complementation.

**Phase 5: wrap-up.** The glossary and the ethics pages.

## 7. Open questions

1. **Book edition.** Do we follow the official 5th edition (2015), or a newer edition? This affects chapter numbering and the "read chapter X" links. Default: follow the topic order, which is stable across editions, and cite chapters by title.
2. **Hosting.** Will this be a public GitHub repo with Pages, like quantbio?
