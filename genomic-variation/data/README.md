# Data for the Genomic variation unit

Downloaded 2026-11-20.

| File | Content | Source |
|---|---|---|
| `snp_frequencies.csv` | Allele counts and frequencies of five SNPs (rs4988235, rs334, rs1426654, rs12913832, rs671) in the 26 populations of the **1000 Genomes Project phase 3**. One row per SNP, population and allele **observed** in that population; alleles with count 0 are not listed. Alleles are on the plus strand of GRCh38. | **Ensembl REST API, release 116**: `https://rest.ensembl.org/variation/human/<rsid>?pops=1`, populations named `1000GENOMES:phase_3:<code>`. The five continental (superpopulation) rows and the ALL row were dropped. The `gene` column was added by hand (the gene the variant is in or regulates). |
| `populations.csv` | The 26 population codes with description and superpopulation (AFR, AMR, EAS, EUR, SAS) | International Genome Sample Resource, `https://ftp.1000genomes.ebi.ac.uk/vol1/ftp/phase3/20131219.populations.tsv`; the column `superpopulation_name` was added by hand. |

Effect alleles used in the exercise (plus strand): rs4988235 **A** (= *LCT* −13910T, lactase persistence); rs334 **A** (*HBB* c.20A>T, HbS); rs1426654 **A** (*SLC24A5* Thr111, lighter skin pigmentation); rs12913832 **G** (*HERC2*, regulates *OCA2*, blue eyes); rs671 **A** (*ALDH2* Lys504, alcohol flush).
