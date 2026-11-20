# Data for Gene expression (recap)

## `cftr_exons_ensembl116.csv`

Exon coordinates of every annotated transcript of human *CFTR* (gene ENSG00000001626), one row per exon.

- **Source:** Ensembl REST API, `https://rest.ensembl.org/lookup/symbol/homo_sapiens/CFTR?expand=1;mane=1`
- **Release:** Ensembl 116, assembly GRCh38. Downloaded 2026-11-20.
- **Rows:** 728 exons in 45 transcripts.
- **Coordinates:** chromosome 7, 1-based and inclusive (`start` and `end` are both part of the exon). *CFTR* is on the forward (+) strand, so `exon_rank` (1 = first exon of that transcript) follows the start coordinate.
- **Columns:** `transcript_id` (with version), `transcript_name`, `biotype` (Ensembl transcript biotype), `mane_select` (TRUE for the MANE Select transcript, ENST00000003084.11 = RefSeq NM_000492.4), `protein_length` (amino acids; NA if the transcript has no annotated coding sequence), `exon_rank`, `exon_id`, `start`, `end`.

Built with a short Python script from the JSON returned by the API. Later Ensembl releases may add or remove transcripts, so the counts on the live site can differ from this snapshot.
