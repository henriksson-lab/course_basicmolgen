# Data for the eukaryotic-regulation R exercise

Both files were downloaded on 2026-11-20 from the **GTEx Portal API v2** (`https://gtexportal.org/api/v2/`), dataset **`gtex_v10`** (GTEx Analysis v10, GENCODE v39, GRCh38). The fetch script is kept by the course team; the commands were:

- `gtex_median_tpm.csv`: `expression/medianGeneExpression?gencodeId=<id>&datasetId=gtex_v10`, one call per gene. Median TPM over **all** RNA-seq samples of each of the 54 tissues, both sexes pooled. Genes: *GAPDH* (ENSG00000111640.15), *ALB* (ENSG00000163631.17), *INS* (ENSG00000254647.7), *HBB* (ENSG00000244734.4), *MYH7* (ENSG00000092054.13), *XIST* (ENSG00000229807.13), *RPS4Y1* (ENSG00000129824.16). Wide format: one row per tissue, one column per gene.
- `gtex_sex_tpm.csv`: `expression/geneExpression?gencodeId=<id>&datasetId=gtex_v10&tissueSiteDetailId=<tissue>&attributeSubset=sex`. One row per sample: the TPM of *XIST* or *RPS4Y1* in skeletal muscle, liver, whole blood and thyroid, with the donor's sex as recorded by GTEx. The endpoint gives no sample IDs, so the *XIST* and *RPS4Y1* rows cannot be paired sample by sample.

These are real measurements, rounded to three decimals in the median file.
