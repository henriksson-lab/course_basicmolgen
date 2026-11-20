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

### Part 2: Chromosomes and mapping

| Unit | A student can… | ELO |
|---|---|---|
| Chromosome theory & sex linkage | count chromosomes and chromatids through mitosis and meiosis; explain the chromosome theory and the evidence from Morgan and Bridges; solve X- and Z-linked crosses; predict gametes from nondisjunction in meiosis I and II; compare sex-determination systems; find a karyotype in Ensembl and *SRY* in NCBI Gene; simulate independent assortment in R and test Morgan's counts with χ² | 1, 2, 3, B1, B4, B5, B6 |
| Linkage & recombination | recognise linkage in testcross data and compute RF; distinguish coupling and repulsion; explain crossing over at the four-strand stage and why RF ≤ 0.5; build a map in cM and convert RF with the Haldane and Kosambi map functions; test for linkage with χ²; look up map positions in FlyBase; write R functions with default arguments | 1, 2, 3, B1, B4, B5, B7 |
| Three-point crosses | determine gene order from the double crossover classes of a three-point testcross; compute map distances, the coefficient of coincidence and interference; explain why two-point crosses underestimate long distances; analyse all gene orders with an R function and `map()` | 1, 2, 3, B5, B7 |
| Human linkage & LOD scores | score recombinants in phase-known pedigrees; compute likelihoods and LOD scores by hand and in R; read a LOD curve (θ̂, the 3 and −2 thresholds) and add LODs across families; locate *HTT* in the UCSC browser and the original mapping papers in PubMed | 1, 2, 3, B1, B3, B7 |

### Part 3: DNA, mutation and gene function

| Unit | A student can… | ELO |
|---|---|---|
| DNA structure & replication (recap) | explain the evidence that genes are DNA; use base pairing and write reverse complements; relate the + strand and c. names of a variant; predict Meselson–Stahl results; describe crossing over via Holliday junctions; download a RefSeq FASTA; write `revcomp()` and compute GC content in R | 1, 2, B1, B6, B7 |
| Mutation & complementation | classify point mutations (transition/transversion; silent/missense/nonsense/frameshift); interpret the fluctuation and Ames tests; relate loss and gain of function to dominance; sort mutants into complementation groups; order a pathway from auxotroph growth; read ClinVar/dbSNP records; translate and classify mutations in R | 1, 2, 3, B1, B6, B7 |
| Gene expression (recap) | explain how promoter, splice-site, poly(A) and coding mutations differ; predict in-frame vs frameshift exon skipping; reason through Crick–Brenner; find transcripts, MANE Select and isoforms in Ensembl/UniProt; summarise an exon table with `group_by`/`summarise` and plot it | 1, 2, B1, B6 |

### Part 4: Genome analysis

| Unit | A student can… | ELO |
|---|---|---|
| Digital analysis of DNA | predict restriction fragments and read sizes off a gel; compute PCR yields and explain Ct, plateau and primer-dimers; check primers with Primer-BLAST; genotype HbS by PCR-RFLP and Sanger traces; BLAST a read; find restriction sites in a FASTA file in R | 1, 3, B1, B2, B6, B7 |
| Genome annotation | explain assembly and ORF-, evidence- and homology-based annotation; run and read BLASTp; read a gene in a genome browser; tell orthologs from paralogs; export BioMart data and summarise gene density in R | 1, B1, B2, B6 |
| Genomic variation | classify SNPs, indels, STRs and CNVs and name them (rs, HGVS, strand); explain haplotypes and LD; choose between arrays and sequencing; look up population frequencies in gnomAD, Ensembl and dbSNP; explain lactase persistence and HbS–malaria; join and plot frequency tables in R | 1, 2, 5, B1, B6 |

### Part 5: Chromosomes in detail

| Unit | A student can… | ELO |
|---|---|---|
| The eukaryotic chromosome | describe chromatin packing, heterochromatin, banding and karyotype notation, centromeres and telomeres; explain the end-replication problem and telomerase; name the elements of a minimal chromosome; find telomeres and centromeres in the T2T genome (UCSC) and count telomere repeats in windows in R | 1, 2, B1, B6 |
| Rearrangements & aneuploidy | classify rearrangements as balanced or unbalanced; derive the gametes of inversion and translocation heterozygotes; explain nondisjunction in meiosis I and II and the maternal age effect; compute balanced-gamete probabilities for triploids; look up CNV syndromes in ClinVar/MedGen; plot published risk data on a log scale and simulate gametes in R | 1, 2, 3, B1, B5, B6 |
| Bacterial genetics (recap) | explain conjugation (F⁺, Hfr, F′), transduction and transformation as mapping tools; order genes and measure distances in minutes from interrupted-mating and cotransduction data; relate map minutes to genome base pairs; find an *E. coli* gene's position and product in NCBI Gene; join and regress mapping data in R | 1, 2, 3, B1, B6 |
| Organelle inheritance | describe the mitochondrial and chloroplast genomes and their endosymbiotic origin; recognise maternal and uniparental inheritance from reciprocal crosses and pedigrees, and tell it apart from nuclear inheritance; explain heteroplasmy, the bottleneck and the threshold effect, and compute the spread of offspring heteroplasmy; simulate the bottleneck in R; read mtDNA variant records in ClinVar/MedGen | 1, 2, 3, B1, B5, B6, B7 |

### Part 6: Gene regulation and development

| Unit | A student can… | ELO |
|---|---|---|
| Prokaryotic regulation (recap) | predict lac phenotypes of haploids and merodiploids; use dominance and cis/trans tests to tell a protein from a DNA site; write the rules as an R function over `expand_grid` | 1, 2, B1, B7 |
| Eukaryotic regulation & epigenetics | tell cis- from trans-regulatory mutations; explain chromatin memory, imprinting, X inactivation and skewing; look up motifs (JASPAR) and expression (GTEx); summarise GTEx data by tissue and sex in R | 1, 2, 3, B1, B6 |
| RNA-mediated regulation | explain miRNA biogenesis, seed pairing and RNAi; reason about the genetics of lin-4/lin-14; use miRBase and TargetScan; find and plot seed matches in a 3′UTR in R | 1, 2, B1, B6, B7 |
| Development & model organisms | explain forward and reverse genetics, screens, maternal effect, the segmentation hierarchy and Hox colinearity; use the Alliance and model-organism databases; join and plot ortholog tables in R | 1, 2, B1, B6 |

### Part 7: Cancer, populations and complex traits

| Unit | A student can… | ELO |
|---|---|---|
| Cancer genetics | distinguish oncogenes from tumour suppressors; explain Knudson's two-hit model, LOH, and why cancer predisposition is dominant in pedigrees; simulate two-hit incidence in R; read *TP53* mutation patterns in cBioPortal and OncoKB | 1, 2, B1, B5, B6 |
| Hardy–Weinberg equilibrium | derive HWE from random mating; test HWE with χ² (df = 1) by hand and in R; compute carrier frequencies (autosomal and X-linked); explain inbreeding (*F*) and the Wahlund effect; read genotype counts in Ensembl and gnomAD | 2, 3, B1, B4, B6, B7 |
| Drift, selection, mutation, migration | explain drift, N~e~ and founder effects (Finnish disease heritage); apply the selection recursion; compute mutation–selection balance and the heterozygote-advantage equilibrium (HbS); simulate Wright–Fisher populations with a loop in R | 2, 3, B1, B3, B5, B7 |
| Complex traits, heritability & GWAS | explain the polygenic model; estimate h² from twins and from parent–offspring regression (`lm` on Galton's data); explain what heritability does not mean; interpret GWAS, LD, 5 × 10⁻⁸, Manhattan and QQ plots; find GWAS hits in the GWAS Catalog | 2, 3, 5, B1, B6 |

### Ethics

| Unit | A student can… | ELO |
|---|---|---|
| Ethics of genetic knowledge | identify who is affected by a genetic decision; analyse cases with the four principles, consent, privacy and the right not to know; explain when Swedish research needs ethical review; find literature with a MeSH-based PubMed search | 4, 5, B3 |
