# Data for the organelle inheritance exercise

- `mtdna_genes.csv`: the 37 genes of the human mitochondrial genome (13 protein-coding, 22 tRNA, 2 rRNA), with start, end, strand and length in bp. Built from the NCBI RefSeq record **NC_012920.1** (*Homo sapiens* mitochondrion, complete genome, the revised Cambridge Reference Sequence, 16 569 bp), feature table downloaded on 2026-11-20 from
  `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NC_012920.1&rettype=ft&retmode=text`.
  The control region (D-loop, positions 16024–576, which wraps around position 1) is not a gene and is not in the table. Lines starting with `#` are comments.

The heteroplasmy data in the exercise are **simulated** in R; they are not measurements.
