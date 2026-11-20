# Data for the complex-traits unit

## galton_families.csv

Galton's family height data (inches): 934 adult children in 205 families, one row per child.
Columns: family, father, mother, midparentHeight (= (father + 1.08 × mother)/2), children,
childNum, gender, childHeight.

- Source: R package **HistData** version 1.1.1 (CRAN), data set `GaltonFamilies`,
  <https://cran.r-project.org/package=HistData>. HistData cites Galton's notebook, transcribed by
  Beverley Shipley (2001), <https://jhanley.biostat.mcgill.ca/galton/galton_heights_197_families.txt>.
- Converted to CSV unchanged (factors written as text) on 2026-11-20.

## gwas_catalog_t2d.csv

All associations in the NHGRI-EBI GWAS Catalog for the trait **type 2 diabetes mellitus**
(MONDO_0005148), reduced to one row per SNP: the association with the smallest p-value.

- Source: GWAS Catalog REST API v2,
  `https://www.ebi.ac.uk/gwas/rest/api/v2/associations?efo_id=MONDO_0005148`, downloaded 2026-11-20
  (9 655 associations from 238 study accessions).
- Kept: single-SNP associations with an rs ID, one GRCh38 location on chromosomes 1–22, and a
  p-value. 5 230 SNPs.
- Columns: rsid, chr, pos (GRCh38), p_mantissa, p_exponent (p = mantissa × 10^exponent),
  neg_log10_p, mapped_gene, study (GCST accession), pubmed_id, first_author.
- The Catalog only contains associations reported as significant (mostly p < 10⁻⁵), so a
  Manhattan plot of this file shows the peaks but not the null background of a full GWAS.
