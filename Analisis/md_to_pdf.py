#!/usr/bin/env python3
"""Convierte REPORTE_BEE_VS_QR.md a PDF con enlaces clicables."""
import sys
from pathlib import Path

import markdown
from weasyprint import HTML, CSS

MD_PATH = Path(__file__).parent / "REPORTE_BEE_VS_QR.md"
PDF_PATH = Path(__file__).parent / "REPORTE_BEE_VS_QR.pdf"

STYLE = """
@page { size: A4; margin: 2cm; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif; font-size: 11pt; line-height: 1.4; }
h1 { font-size: 1.6em; margin-top: 0; }
h2 { font-size: 1.3em; margin-top: 1.2em; border-bottom: 1px solid #ccc; }
h3 { font-size: 1.1em; margin-top: 1em; }
table { border-collapse: collapse; margin: 0.8em 0; }
th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
th { background: #f5f5f5; }
a { color: #0066cc; text-decoration: none; }
a:hover { text-decoration: underline; }
ul { margin: 0.4em 0; }
li { margin: 0.2em 0; }
"""


def main():
    md_content = MD_PATH.read_text(encoding="utf-8")
    html_body = markdown.markdown(md_content, extensions=["tables"])
    html_doc = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Reporte Bee vs QR</title>
</head>
<body>
{html_body}
</body>
</html>"""
    HTML(string=html_doc, base_url=str(Path(__file__).parent)).write_pdf(
        PDF_PATH, stylesheets=[CSS(string=STYLE)]
    )
    print(f"PDF generado: {PDF_PATH}")


if __name__ == "__main__":
    main()
