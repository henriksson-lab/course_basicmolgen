# Brief: expanding lecture decks

The decks were written under an old 12–18 slide cap. That cap is gone: see `designprinciples.md` §8. A deck can now have up to about 40 slides, and quality matters more than quantity. Your job is to make each deck in your part the best lecture for its topic at year-2 BSc level, using the space the content deserves.

## Read first

- `designprinciples.md`, `audience.md`, and `plan/unit-brief.md` (the conventions for decks and figures, and `plan/figure-qa-checklist.md`).
- For each unit: `lec.qmd`, `quiz.qmd`, `exercise.qmd` and `exercise-r.qmd`, so the lecture prepares students for what the exercises ask.

## Decide per deck

First judge where the cap hurt. Look for:

- ideas that were crammed into one dense slide;
- reasoning that jumps a step;
- concepts the exercises use but the lecture only names;
- missing worked examples;
- known student misconceptions that are left unaddressed;
- notes that carry content which belongs on a slide.

Then expand where it helps:

- **Build hard ideas step by step**, over several slides: crosses, meiosis, mapping logic, LOD, HWE derivation, selection recursion, cis/trans tests.
- **Add worked examples with numbers**, in the style of the exam-type by-hand problems in the exercise. Show the method, not the exercise answers.
- **Add a "common mistakes" or "check yourself" slide** where students typically go wrong.
- **Add figures** where a picture explains better than bullets. Use hand-written SVG in the existing style, QA'd with cairosvg per the checklist.
- **Split dense slides.** Move important content from notes onto slides, and keep the notes as the speaker's script.
- **Use the real data and examples** the unit already has, for continuity with the exercise and R page.

Do **not** pad, repeat, or add tangents. A deck that is already complete can stay as it is or get small fixes; say so in your report. Keep the opening "About this lecture", "Summary" and "Where this leads" slides, and update them. Every slide still needs `::: notes`. Check facts as before: verify anything new, and never invent numbers.

If the expanded lecture introduces something that the quiz should check, you may add 1–3 quiz questions. Do not change the exercises or R pages, except to fix an error you find; report any such fix.

## Photos (added on request)

Add **real photos** where they help understanding or make a topic concrete. Examples:
- the organism in question: peas, *Drosophila* mutants, calico cats, Labradors, *C. elegans*, maize;
- a historical figure or apparatus: Mendel, Morgan's fly room, Rosalind Franklin's Photo 51 if it is PD;
- a karyotype, a real gel or a Sanger trace;
- a phenotype: sickle cells in a blood smear, polydactyly, a homeotic fly.

Use them where they add something. Do not decorate.

**Licence:** use only freely licensed images. The usual source is **Wikimedia Commons**. Allowed licences are public domain, CC0, CC BY and CC BY-SA. **Never use** NC, ND, "fair use" or unknown licences. Do not trust the page text; check the licence through the API:

`https://commons.wikimedia.org/w/api.php?action=query&titles=File:<name>&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json`

From the result, read `extmetadata.LicenseShortName`, `Artist`, `LicenseUrl` and `Credit`, plus `thumburl`, a ≤1200 px version.

**Download:** fetch the `thumburl` (not the full original) with curl, into `<unit>/img/<short-name>.jpg` or `.png`. Keep each file under about 400 kB. If one is larger, request a smaller `iiurlwidth`.

**Attribution** is required for CC BY and CC BY-SA, and good practice for everything:
- On the slide, put a small credit line directly under the image: `[Photo: <Artist>, <Licence>, via Wikimedia Commons](<file page URL>){.photo-credit}`. Strip HTML from the Artist field.
- Also append a row to `<unit>/img/CREDITS.md`, a table with columns file | title | author | licence | source URL.
- Do not crop or alter CC BY-SA images beyond resizing, unless you note "cropped" in the credit.

**People:** use only historical or public figures in their scientific role. No photos of identifiable patients unless they come from a published, freely licensed medical illustration and are clearly educational. Prefer micrographs or diagrams for disease phenotypes.

Photos may also go into exercises where they help a question, for example "classify this fly's phenotype". They do not have to be limited to lectures.

## Checking

- After editing a deck, run `quarto render /abs/unit/lec.qmd`.
- Check the slides fit at 1280×720. Screenshot the new or changed slides with headless Chrome, writing helper scripts to your scratch folder. Fix any overflow by splitting the slide or using `{.smaller}`. Do not shrink fonts further.
- Tool rules are the same as `plan/part-brief.md`: use only Read, Edit and Write for files, and only plain single Bash commands with absolute paths. No git. Do not run a full-site render. Do not edit files outside your units.

## Report back

1. For each unit: slide count before and after, and what you added (2–4 bullets). Mark any unit you left essentially unchanged, and say why.
2. New figures, and any quiz questions added.
3. New glossary terms, in the same format as before.
4. Errors found and fixed in any page.
5. Facts you could not verify.
