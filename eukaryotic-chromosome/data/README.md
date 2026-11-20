# Data for the eukaryotic chromosome unit

| File | What | Source |
|---|---|---|
| `chm13_chr1_pter_10kb.fa` | chr1:1-10,000 (the first 10 kb of the p arm) | T2T-CHM13 v2.0, UCSC genome `hs1`, via the UCSC REST API: `https://api.genome.ucsc.edu/getData/sequence?genome=hs1;chrom=chr1;start=0;end=10000`, downloaded 2026-11-20 |
| `chm13_chr1_qter_10kb.fa` | chr1:248,377,329-248,387,328 (the last 10 kb of the q arm; chr1 is 248,387,328 bp) | same API: `...genome=hs1;chrom=chr1;start=248377328;end=248387328`, downloaded 2026-11-20 |

The sequences are real, unchanged reference sequence (the API returns soft-masked lower case for repeats; it was converted to upper case). Each file is plain FASTA: one header line, then 60 bases per line. Both are the top (forward) strand of the reference, read 5' → 3' from the p end towards the q end.

Assembly: Nurk et al. (2022) The complete sequence of a human genome. *Science* 376:44-53, doi:10.1126/science.abj6987.
