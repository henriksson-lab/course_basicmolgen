#!/usr/bin/env python3
"""Collect every <unit>/img/CREDITS.md into one site page, credits.qmd.

Run from anywhere:  python3 tools/build-credits.py   (make render runs it first)

Units are listed in sidebar order (read from _quarto.yml). Each unit's own
"# Image credits" heading is dropped and replaced with the unit title.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Sidebar order and unit titles: each "- section: <title>" followed by an href <unit>/lec.qmd.
yml = (ROOT / "_quarto.yml").read_text(encoding="utf-8")
units, title = [], None
for line in yml.splitlines():
    m = re.match(r'\s*- section: "?(.*?)"?\s*$', line)
    if m:
        title = m.group(1)
        continue
    m = re.match(r"\s*href: ([\w-]+)/lec\.qmd", line)
    if m and title and m.group(1) not in [u for u, _ in units]:
        units.append((m.group(1), title))

out = [
    "---",
    'title: "Image credits"',
    "---",
    "",
    "Photos on this site are freely licensed: public domain, CC0, CC BY or CC BY-SA. Most come from "
    "[Wikimedia Commons](https://commons.wikimedia.org). Each licence was checked through the Commons API. "
    "Each photo also carries a credit line where it is shown. Figures and diagrams without a credit were drawn for this course.",
    "",
]
n = 0
for unit, title in units:
    f = ROOT / unit / "img" / "CREDITS.md"
    if not f.exists():
        continue
    body = f.read_text(encoding="utf-8")
    body = re.sub(r"^#\s+Image credits\s*\n", "", body, count=1).strip()
    body = re.sub(r"^#", "###", body, flags=re.M)  # demote any remaining headings
    out += [f"## [{title}]({unit}/lec.qmd)", "", body, ""]
    n += 1

(ROOT / "credits.qmd").write_text("\n".join(out) + "\n", encoding="utf-8")
print(f"credits.qmd: {n} units")
