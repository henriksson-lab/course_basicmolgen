# Code correctness audit checklist

Scope: every source document with a code fence, plus the build and site configuration files. R chunks are written as plain ```` ```r ```` fences (not executed by Quarto). Run them with `Rscript --vanilla` and paste the output into the solutions.

Mark an item complete only after a reviewer has checked every chunk for syntax, dependencies, data-shape assumptions, numerical correctness and consistency with the surrounding teaching material.

## Executable teaching documents

- [ ] `intro-genetics/exercise-r.qmd`
- [ ] `mendel/exercise-r.qmd`
- [ ] `probability-chisq/exercise-r.qmd`
- [ ] `mendel-extensions/exercise-r.qmd`
- [ ] `pedigrees/exercise-r.qmd`
