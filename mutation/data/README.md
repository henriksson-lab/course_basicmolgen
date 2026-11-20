# Data for Mutation & complementation

## `genetic_code.csv`

The standard genetic code: 64 rows, one per codon, written as DNA (coding strand, T instead of U).
Columns: `codon`, `aa` (three-letter amino acid, `Stop` for a stop codon) and `aa1` (one-letter code, `*` for stop).

Typed in box by box from the standard codon table, then checked in R against NCBI translation table 1
("Standard", `ncbieaa` string in `https://ftp.ncbi.nih.gov/entrez/misc/data/gc.prt`, downloaded 2026-11-20). All 64 codons match.

## `HBB_NM_000518.5.fasta`

The human *HBB* (β-globin) mRNA, RefSeq **NM_000518.5** (MANE Select; 628 nt; coding sequence at positions 51–494).
Downloaded 2026-11-20 with NCBI E-utilities:
`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&id=NM_000518.5&rettype=fasta&retmode=text`.
The same file is used in the DNA structure & replication (recap) unit.
