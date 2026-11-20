# Data for the bacterial genetics R exercise

## `ecoli_genes.csv` (real data)

Positions of 18 classic mapping markers in *Escherichia coli* K-12 substr. MG1655, reference genome **NC_000913.3** (4 641 652 bp, circular). One representative gene per classic marker (for example `lac` → *lacZ*, `str` → *rpsL*, `azi` → *secA*, `ton` → *fhuA*).

- Source: NCBI Gene, via the E-utilities `esummary` (field `genomicinfo`), retrieved **2026-11-20**. The NCBI Gene ID of each gene is in the `source` column.
- `start` and `end` are 1-based genome coordinates, with `start < end`; `strand` is `+` or `-` (`-` means the gene is read on the complementary strand, `complement(start..end)` in GenBank notation).

## `hfr_entry.csv` (simulated teaching data)

**Not a real experiment.** Times of entry, in minutes, for ten markers in an interrupted-mating experiment with a hypothetical Hfr strain whose origin of transfer lies near 4 300 000 bp and which transfers clockwise (towards increasing coordinates). The times were computed from the real positions in `ecoli_genes.csv` as a 1.5 min lag + 100 min × distance / genome length, plus random noise (SD 0.5 min), rounded to 0.5 min. The comment lines at the top of the file say the same; read it with `read_csv("data/hfr_entry.csv", comment = "#")`.
