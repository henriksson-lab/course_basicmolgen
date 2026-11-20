# Data for the Linkage & recombination unit

## sturtevant1913.csv

Real data. Crossover counts between pairs of X-linked factors in *Drosophila melanogaster*, from Table 2 of:

A. H. Sturtevant (1913). The linear arrangement of six sex-linked factors in *Drosophila*, as shown by their mode of association. *Journal of Experimental Zoology* 14: 43–59. Transcribed on 2026-11-20 from the reprint at Electronic Scholarly Publishing, <http://www.esp.org/foundations/genetics/classical/holdings/s/ahs-13.pdf>.

Columns:

- `pair`: Sturtevant's own factor letters. B = yellow body, C and O = white and eosin eyes (two alleles of the same gene, *white*; "(C O)" pools them), P = vermilion eyes, R = miniature wings, M = rudimentary wings.
- `gene1`, `gene2`: the modern gene symbols (*y*, *w*, *v*, *m*, *r*).
- `recombinant`, `total`: crossover gametes and all gametes scored (numerator and denominator in Sturtevant's table).
- `percent_published`: the per cent of crossovers as printed by Sturtevant.

Only the nine rows that use the pooled white factor "(C O)" or that do not involve white are included; Sturtevant's separate C and O rows are left out.

Sturtevant's map (his Diagram 1, distances from B): y 0.0, w 1.0, v 30.7, m 33.7, r 57.6.
