# PDF fonts

`DejaVuSans.ttf` / `DejaVuSans-Bold.ttf` are **subsets** of DejaVu Sans, used by
`@react-pdf/renderer` when generating profile and payslip PDFs.

DejaVu Sans is the typeface the ERP's own payslip print format uses, so exports
generated here match the ones payroll issues.

Subset to Basic Latin, Latin-1 Supplement, common punctuation and `U+20B9` (₹) —
the built-in PDF fonts are WinAnsi-encoded and have no rupee sign. This takes the
pair from ~1.4 MB down to ~33 KB.

Regenerate with:

    pyftsubset DejaVuSans.ttf \
      --unicodes="U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2022,U+2026,U+2039,U+203A,U+20B9,U+2713,U+00B7" \
      --layout-features='' --no-hinting --desubroutinize \
      --output-file=DejaVuSans.ttf

License: DejaVu Fonts License (permissive, redistribution allowed).
See https://dejavu-fonts.github.io/License.html
