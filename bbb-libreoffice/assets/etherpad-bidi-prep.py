#!/usr/bin/env python3
"""
SafeMeet Etherpad export bidirectional preprocessor.

Runs just before LibreOffice conversion (PDF / DOC / ODT) to produce clean
Persian↔English layout:

- Document base direction is RTL (SafeMeet Persian-first)
- Each block gets dir/align from its first strong character
- Opposite-direction inline runs are wrapped in <span dir="…">
- LibreOffice-friendly CSS is injected (direction + text-align + font stack)

Idempotent: safe to run more than once on the same HTML file.
"""

from __future__ import annotations

import re
import sys
from html import unescape

RTL_CHAR_RE = re.compile(
    r'[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF'
    r'\uFB50-\uFDFF\uFE70-\uFEFF]'
)
LTR_CHAR_RE = re.compile(r'[A-Za-z\u00C0-\u024F]')
TAG_SPLIT_RE = re.compile(r'(<[^>]+>)')
BLOCK_SPLIT_RE = re.compile(r'(<br\s*/?>)', re.IGNORECASE)
ALREADY_WRAPPED_RE = re.compile(
    r'^\s*<div\b[^>]*\bdata-safemeet-bidi=(["\'])1\1',
    re.IGNORECASE,
)

EXPORT_CSS = """
/* SafeMeet shared-notes bidirectional export */
html {
  direction: rtl;
}
body {
  background-color: #ffffff;
  color: #1a1a1a;
  direction: rtl;
  text-align: right;
  font-family: "Noto Naskh Arabic", "Noto Sans Arabic", "DejaVu Sans", Tahoma, Arial, sans-serif;
  font-size: 12pt;
  line-height: 1.75;
  margin: 18mm 16mm;
}
[dir="rtl"] {
  direction: rtl;
  text-align: right;
  unicode-bidi: embed;
}
[dir="ltr"] {
  direction: ltr;
  text-align: left;
  unicode-bidi: embed;
}
div[data-safemeet-bidi="1"] {
  margin: 0 0 0.35em 0;
}
ol, ul {
  padding-inline-start: 1.4em;
}
"""


def strip_tags(html: str) -> str:
    return re.sub(r'<[^>]+>', '', html)


def first_strong_dir(text: str) -> str:
    plain = unescape(strip_tags(text))
    for ch in plain:
        if RTL_CHAR_RE.match(ch):
            return 'rtl'
        if LTR_CHAR_RE.match(ch):
            return 'ltr'
    return 'rtl'


def char_dir(ch: str) -> str | None:
    if RTL_CHAR_RE.match(ch):
        return 'rtl'
    if LTR_CHAR_RE.match(ch):
        return 'ltr'
    return None


def wrap_inline_runs(html: str, base_dir: str) -> str:
    """Wrap opposite-direction text runs so LibreOffice keeps mixed scripts tidy."""
    parts = TAG_SPLIT_RE.split(html)
    out: list[str] = []

    for part in parts:
        if not part:
            continue
        if part.startswith('<'):
            out.append(part)
            continue

        buf: list[str] = []
        run_dir: str | None = None

        def flush() -> None:
            nonlocal buf, run_dir
            if not buf:
                return
            text = ''.join(buf)
            if run_dir and run_dir != base_dir:
                out.append(f'<span dir="{run_dir}">{text}</span>')
            else:
                out.append(text)
            buf = []
            run_dir = None

        for ch in part:
            d = char_dir(ch)
            if d is None:
                buf.append(ch)
                continue
            if run_dir is None:
                run_dir = d
                buf.append(ch)
                continue
            if d == run_dir:
                buf.append(ch)
                continue
            flush()
            run_dir = d
            buf.append(ch)
        flush()

    return ''.join(out)


def wrap_block(html: str) -> str:
    content = html.strip()
    if not content:
        return html
    if ALREADY_WRAPPED_RE.search(content):
        return html

    base = first_strong_dir(content)
    marked = wrap_inline_runs(content, base)
    align = 'right' if base == 'rtl' else 'left'
    return (
        f'<div data-safemeet-bidi="1" dir="{base}" align="{align}" '
        f'style="direction:{base};text-align:{align};">{marked}</div>'
    )


def process_body(body: str) -> str:
    # Preserve list markup; only bidi-wrap leaf chunks between <br> and outside lists.
    # Etherpad export uses lots of <br>-separated lines outside lists.
    chunks = BLOCK_SPLIT_RE.split(body)
    result: list[str] = []
    for chunk in chunks:
        if BLOCK_SPLIT_RE.fullmatch(chunk or ''):
            result.append(chunk)
            continue
        if not chunk.strip():
            result.append(chunk)
            continue
        # Do not rewrite inside list structures — leave LO list handling alone,
        # but still set dir on list item inner HTML when it is a simple fragment.
        if re.search(r'</?(ul|ol|li)\b', chunk, re.IGNORECASE):
            result.append(chunk)
            continue
        result.append(wrap_block(chunk))
    return ''.join(result)


def ensure_html_dir(html: str) -> str:
    def repl(match: re.Match[str]) -> str:
        attrs = match.group(1) or ''
        if re.search(r'\bdir\s*=', attrs, re.IGNORECASE):
            attrs = re.sub(
                r'\bdir\s*=\s*(["\']).*?\1',
                'dir="rtl"',
                attrs,
                count=1,
                flags=re.IGNORECASE,
            )
        else:
            attrs = f'{attrs} dir="rtl"'
        if re.search(r'\blang\s*=', attrs, re.IGNORECASE):
            attrs = re.sub(
                r'\blang\s*=\s*(["\']).*?\1',
                'lang="fa"',
                attrs,
                count=1,
                flags=re.IGNORECASE,
            )
        else:
            attrs = f'{attrs} lang="fa"'
        return f'<html{attrs}>'

    if re.search(r'<html\b', html, re.IGNORECASE):
        return re.sub(r'<html([^>]*)>', repl, html, count=1, flags=re.IGNORECASE)
    return f'<!doctype html><html lang="fa" dir="rtl">{html}</html>'


def ensure_css(html: str) -> str:
    marker = 'SafeMeet shared-notes bidirectional export'
    if marker in html:
        return html
    style = f'<style>\n{EXPORT_CSS}\n</style>\n'
    if re.search(r'</head>', html, re.IGNORECASE):
        return re.sub(r'</head>', style + '</head>', html, count=1, flags=re.IGNORECASE)
    if re.search(r'<body\b', html, re.IGNORECASE):
        return re.sub(r'(<body\b[^>]*>)', r'<head>' + style + '</head>\1', html, count=1, flags=re.IGNORECASE)
    return style + html


def ensure_body_dir(html: str) -> str:
    def repl(match: re.Match[str]) -> str:
        attrs = match.group(1) or ''
        if re.search(r'\bdir\s*=', attrs, re.IGNORECASE):
            attrs = re.sub(
                r'\bdir\s*=\s*(["\']).*?\1',
                'dir="rtl"',
                attrs,
                count=1,
                flags=re.IGNORECASE,
            )
        else:
            attrs = f'{attrs} dir="rtl"'
        return f'<body{attrs}>'

    return re.sub(r'<body([^>]*)>', repl, html, count=1, flags=re.IGNORECASE)


def transform(html: str) -> str:
    html = ensure_html_dir(html)
    html = ensure_body_dir(html)
    html = ensure_css(html)

    body_match = re.search(r'(<body[^>]*>)(.*)</body>', html, flags=re.IGNORECASE | re.DOTALL)
    if not body_match:
        return html

    prefix = html[: body_match.start(2)]
    body = body_match.group(2)
    suffix = html[body_match.end(2) :]
    return prefix + process_body(body) + suffix


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(f'Usage: {argv[0]} <html-file>', file=sys.stderr)
        return 2
    path = argv[1]
    with open(path, 'r', encoding='utf-8', errors='replace') as fh:
        original = fh.read()
    updated = transform(original)
    if updated != original:
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(updated)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
