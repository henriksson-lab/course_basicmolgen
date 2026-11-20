# Data for the rearrangements & aneuploidy unit

`aneuploidy_maternal_age_denmark.csv`: real, published counts copied by hand from **Table 2** of

> Elmerdahl Frederiksen L, Ølgaard SM, Roos L, Petersen OB, Rode L, Hartwig T, Ekelund CK, Danish Central Cytogenetics Registry Study Group, Vogel I (2024). Maternal age and the risk of fetal aneuploidy: A nationwide cohort study of more than 500 000 singleton pregnancies in Denmark from 2008 to 2017. *Acta Obstet Gynecol Scand* 103(2):351–359. doi:10.1111/aogs.14713. PMID 37986093, open access as PMC10823394.

The table was read from the Europe PMC full-text XML (`https://www.ebi.ac.uk/europepmc/webservices/rest/PMC10823394/fullTextXML`) on 2026-11-20.

| Column | Meaning |
|---|---|
| `age_group` | maternal age group (years) |
| `n_pregnancies` | singleton pregnancies attending first-trimester screening in that group |
| `aneuploidy` | trisomy 21, trisomy 18, trisomy 13, triploidy or monosomy X |
| `cases` | genetically confirmed cases, before or after birth; **empty** where the paper reports "< 3" |
| `source` | the citation |

The paper's row "other sex chromosome aberrations" is not included.
