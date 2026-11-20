# Data for the hardy-weinberg unit

## hwe_snps.csv

Genotype counts for 7 SNPs in selected 1000 Genomes phase 3 populations.

- Source: Ensembl REST API release 116,
  `https://rest.ensembl.org/variation/human/<rsid>?population_genotypes=1`, accessed 2026-11-20
  (also recorded in the `source` column of every row).
- allele_A = reference allele on the GRCh38 forward strand; allele_a = the other allele seen in
  that population. n_AA, n_Aa, n_aa are the counts of the three genotypes.
- SNPs: rs713598 (*TAS2R38*), rs1815739 (*ACTN3* R577X), rs7903146 (*TCF7L2*),
  rs4988235 (*MCM6*, lactase persistence), rs12913832 (*HERC2*), rs334 (*HBB*, HbS),
  rs1426654 (*SLC24A5*).
- Populations: GBR, FIN, CEU, YRI, GWD, CHB, and ALL (all 2504 individuals pooled).
