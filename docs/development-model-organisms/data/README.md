# Data for the development-model-organisms R exercise

Downloaded on 2026-11-20.

- `dev_genes.csv`: 13 human genes (11 developmental genes and 2 housekeeping controls) with their **HGNC IDs**, looked up with the HGNC REST service (`https://rest.genenames.org/fetch/symbol/<symbol>`). The `role` column is a short description written by the course team.
- `orthologs.csv`: orthologs of these genes in mouse, zebrafish, *Drosophila melanogaster*, *Caenorhabditis elegans* and *Saccharomyces cerevisiae*, from the **Alliance of Genome Resources, release 9.2.0** (2026-10-28), API `https://www.alliancegenome.org/api/gene/<HGNC id>/orthologs?filter.stringency=stringent`. One row per gene pair. `n_methods` is the number of orthology-prediction methods (PANTHER, OrthoFinder, Ensembl Compara, …) that agree; `best` is the Alliance's "best score" flag (`Yes`, `Yes_Adjusted` or `No`).

Note: the stringent filter is a choice. With `filter.stringency=all`, more distant relatives also appear (for example *Drosophila eyeless* for human *PAX6*, predicted by only one method). Ensembl Compara alone (release 116) gives no fly or worm ortholog for *PAX6*. Absence from this table means "no ortholog under these rules", not "no related gene".
