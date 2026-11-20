# Expected learning outcomes

**5MO104 Basic and molecular genetics**, 15 ECTS, Umeå University. This site covers the theory and ethics content. The course book is Hartwell et al., *Genetics: From Genes to Genomes*, and the site follows its order.

## Outcomes from the syllabus

After the course, a student should be able to:

1. show knowledge of basic genetics, and understanding of how inheritance is governed by molecular mechanisms;
2. explain how inheritance is studied at the level of cells and organisms, and how allele frequencies in populations vary with different factors;
3. test, interpret and statistically evaluate results;
4. study, present and discuss original literature in English;
5. reflect on ethical problems in the application of genetic knowledge.

## Bioinformatics outcomes (in addition to the syllabus)

Running through every part, a student should be able to:

- **B1.** find a gene, variant, disease or organism in the core public databases (NCBI, Ensembl, OMIM, ClinVar, gnomAD, model-organism databases) and extract a specific fact;
- **B2.** run a sequence similarity search (BLAST) and read the result;
- **B3.** search PubMed for original papers on a genetic question;
- **B4.** use R to test genetic ratios and Hardy–Weinberg equilibrium (χ²);
- **B5.** use R to simulate simple genetic processes, such as crosses, drift and bottlenecks;
- **B6.** load a downloaded table or sequence (TSV, CSV, FASTA) into R and summarise or plot it;
- **B7.** write small R functions of their own.

## Outcomes by unit

### Part 1: Mendelian genetics

| Unit | A student can… | ELO |
|---|---|---|
| Genetics as information | describe DNA → gene → protein → phenotype; distinguish gene, allele, locus, genotype and phenotype; find a gene in NCBI Gene and Ensembl | 1, B1 |
| Mendel | predict monohybrid and dihybrid outcomes with Punnett squares and the branch-line method; explain segregation and independent assortment in terms of meiosis; simulate a cross in R | 1, 2, B5, B7 |
| Probability & χ² | apply the product and sum rules and the binomial; carry out a χ² goodness-of-fit test by hand and in R and interpret the p-value | 3, B4 |
| Extensions to Mendel | recognise incomplete dominance, codominance, multiple alleles, lethal alleles, epistasis, penetrance and expressivity from ratios and descriptions; test which modified ratio fits | 1, 3, B1, B4 |
| Pedigree analysis | read pedigrees; decide between autosomal/X-linked and dominant/recessive inheritance; compute carrier and risk probabilities; look up a disease's inheritance in OMIM | 1, 2, B1 |
