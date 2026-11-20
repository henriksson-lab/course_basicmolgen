# Data for the rna-regulation R exercise

`HMGA2_3UTR.fa`: the 3′UTR of human *HMGA2*, canonical transcript **ENST00000403681.7** (HMGA2-204), **Ensembl release 116**, GRCh38, downloaded on 2026-11-20.

How it was made: the cDNA and the CDS of the transcript were downloaded from the Ensembl REST API (`https://rest.ensembl.org/sequence/id/ENST00000403681?type=cdna` and `?type=cds`). The CDS (330 nt, ending in TAG) occurs once in the cDNA (4117 nt); the 3′UTR is everything after it: **2999 nt**. As a check, the soft-masked cDNA (`mask_feature=1`) has exactly this stretch in lower case. The sequence is written as DNA (T, not U), 60 nt per line.

The miRNA sequences used in the exercise are typed into the R code from **miRBase release 23.1**: hsa-let-7a-5p (MIMAT0000062), hsa-miR-1-3p (MIMAT0000416) and hsa-miR-21-5p (MIMAT0000076).
