.PHONY: all render preview clean gitadd help figs demos typecheck edit-slides credits

# Default: render the site, then stage every source file in git.
all: render gitadd

render: demos credits
	quarto render

# Collect <unit>/img/CREDITS.md into credits.qmd (the Image credits page).
credits:
	python3 tools/build-credits.py
	@touch docs/.nojekyll

preview:
	quarto preview

# Re-generate the R-made figures (not run by quarto render).
figs:
	@echo "no R-made figures yet"

# Build the interactive demos (TypeScript, demos/src/) into demos/dist/.
# One-time setup: npm i   (installs esbuild + typescript into node_modules/).
demos:
	demos/build.sh

# Type-check the demo sources (esbuild only strips types, it does not check them).
typecheck:
	node_modules/.bin/tsc --noEmit -p demos

# Edit slide text and SVG labels in the browser (tools/slide-editor/).
# Prints a URL with an access token; PORT=... and SLIDE_EDIT_TOKEN=... override.
PORT ?= 8737
edit-slides:
	node tools/slide-editor/server.mjs --port $(PORT)

# Remove the rendered site and Quarto's cache.
clean:
	rm -rf docs .quarto

# Stage every source file AND the built HTML (docs/) so the committed site is
# always current. The .quarto/ cache is never added (it is .gitignored).
gitadd:
	git add -- .

help:
	@echo "Targets:"
	@echo "  make           render the site, then git add all source files"
	@echo "  make render    render the whole site to docs/"
	@echo "  make preview   start a live-reload preview server"
	@echo "  make demos     build the interactive demos into demos/dist/ (needs npm i once)"
	@echo "  make typecheck type-check the demo TypeScript sources"
	@echo "  make figs      re-generate the R-made figures"
	@echo "  make edit-slides  edit slide text and figure labels in the browser (port 8737)"
	@echo "  make gitadd    stage all source files in git"
	@echo "  make clean     remove docs/ and .quarto/"
