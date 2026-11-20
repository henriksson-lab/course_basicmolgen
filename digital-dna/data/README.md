# Data for the Digital analysis of DNA unit

Downloaded 2026-11-20.

| File | Content | Source |
|---|---|---|
| `lambda.fasta` | Enterobacteria phage lambda, complete genome, 48,502 bp, linear | NCBI Nucleotide **NC_001416.1**, via E-utilities: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NC_001416.1&rettype=fasta&retmode=text` |
| `hbb_pcr.fasta` | 500-bp PCR product of human *HBB* (normal allele, HbA), in gene orientation | Ensembl release 116, GRCh38 chr11:5,226,722–5,227,221, reverse strand, from `https://rest.ensembl.org/sequence/id/ENSG00000244734?type=genomic;expand_5prime=400`. Primers TGCCAGAAGAGCCAAGGACA and CCCATAACAGCATCAGGAGT, chosen for this course and checked with NCBI Primer-BLAST (one 500-bp product on NC_000011.10). |

The HbS version of the PCR product is made in R (task R6) by changing position 220 (the A of codon 7, GAG) to T.
