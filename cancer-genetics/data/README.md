# Data for the cancer-genetics unit

## tp53_tcga_mutations.csv

Every *TP53* (Entrez Gene 7157) mutation in three TCGA PanCancer Atlas studies on cBioPortal,
one row per mutation.

- Source: cBioPortal REST API, `https://www.cbioportal.org/api/molecular-profiles/<study>_mutations/mutations?sampleListId=<study>_sequenced&entrezGeneId=7157`,
  downloaded 2026-11-20.
- Studies (study_id): `ov_tcga_pan_can_atlas_2018` (ovarian serous cystadenocarcinoma, 523 samples
  with mutation data), `brca_tcga_pan_can_atlas_2018` (breast invasive carcinoma, 1066),
  `coadread_tcga_pan_can_atlas_2018` (colorectal adenocarcinoma, 534). Citation: TCGA, Cell 2018.
- Columns: study, study_id, n_sequenced (samples with mutation data in the study), sample_id,
  protein_change, mutation_type (as in cBioPortal/MAF).
