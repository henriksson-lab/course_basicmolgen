# Data for the Genome annotation unit

Downloaded 2026-11-20.

| File | Content | Source |
|---|---|---|
| `human_genes.tsv` | All human **protein-coding** genes on chromosomes 1–22, X, Y and MT (20,107 rows): Gene name, Chromosome/scaffold name, Gene start (bp), Gene end (bp), Gene type. Column names exactly as BioMart writes them. 629 genes have no name (empty cell). | **Ensembl BioMart, Ensembl Genes release 116**, dataset `hsapiens_gene_ensembl` (GRCh38.p14), via the BioMart URL API `https://www.ensembl.org/biomart/martservice?query=<XML>` with filters `biotype = protein_coding` and `chromosome_name = 1..22,X,Y,MT`. The Gene stable ID and Strand columns of the download were dropped to keep the file under 1 MB. |
| `chromosome_lengths.tsv` | Length in bp of each chromosome (1–22, X, Y, MT) | Ensembl REST API `https://rest.ensembl.org/info/assembly/homo_sapiens` (assembly GRCh38.p14, accession GCA_000001405.29), field `top_level_region`. |

Gene start and end are the outermost coordinates of all annotated transcripts of the gene (1-based, inclusive), so they can change between releases.
