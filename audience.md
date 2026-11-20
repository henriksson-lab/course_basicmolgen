# Audience

**5MO104** is a compulsory year-2 course in the Life Science BSc at Umeå University, taken after *Microbiology and basic molecular biology* (5MO103). See [designprinciples.md](designprinciples.md) for how we build material and [elo.md](elo.md) for what we teach.

## What we can expect them to know

### Biology
- From 5MO103: the central dogma (replication, transcription and translation, with their regulation), prokaryote vs eukaryote cells, bacterial genetics and gene transfer, and the lac operon as an example of regulation. Book chapters that repeat this material (6, 8, 14, 16) are therefore **recaps**.
- From biochemistry: proteins, enzymes and metabolic pathways. Pathway thinking is useful for epistasis.
- Some genetics from upper-secondary school: Punnett squares and dominant/recessive. Expect misconceptions, for example that dominant means common.

### R
- **They know base R and the tidyverse:** vectors, data frames, indexing, `read_csv`, dplyr verbs and ggplot2.
- **Not yet fluent at:** writing their own functions, loops and simulation (`sample`, `rbinom`, `replicate`), string handling for sequences, joining tables, or reading bioinformatics formats (FASTA, TSV exports from databases).
- The aim is a **modest lift**. Each new idiom is introduced once, with a sentence of explanation, and then reused. No Bioconductor in the core.

### Statistics
- Descriptive statistics, the idea of a p-value and hypothesis tests by name. **The χ² goodness-of-fit test is taught here** from scratch, because it is the core statistical tool of transmission genetics.

### Mathematics
- Upper-secondary level. Fractions and probability (product and sum rules) are recapped in the probability unit. Introduce notation slowly and always with numbers next to it.

### Databases
- **Assume no experience** with NCBI, Ensembl, OMIM and the like. Every "Find it" task gives the link and says exactly which field to read. The aim is that students can find things on their own by the end of the course.
