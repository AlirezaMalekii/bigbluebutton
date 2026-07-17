'use strict';

/**
 * SafeMeet shared-notes export bidirectional helpers.
 * Applied to Etherpad HTML exports (and therefore PDF/DOC/ODT via LibreOffice).
 */

const RTL_RE = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LTR_RE = /[A-Za-z\u00C0-\u024F]/;
const TAG_SPLIT_RE = /(<[^>]+>)/;

const EXPORT_CSS = `
html { direction: rtl; }
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
[dir="rtl"] { direction: rtl; text-align: right; unicode-bidi: embed; }
[dir="ltr"] { direction: ltr; text-align: left; unicode-bidi: embed; }
div[data-safemeet-bidi="1"] { margin: 0 0 0.35em 0; }
`;

const stripTags = (html) => String(html || '').replace(/<[^>]+>/g, '');

const firstStrongDir = (html) => {
  const plain = stripTags(html);
  for (let i = 0; i < plain.length; i += 1) {
    const ch = plain[i];
    if (RTL_RE.test(ch)) return 'rtl';
    if (LTR_RE.test(ch)) return 'ltr';
  }
  return 'rtl';
};

const charDir = (ch) => {
  if (RTL_RE.test(ch)) return 'rtl';
  if (LTR_RE.test(ch)) return 'ltr';
  return null;
};

const wrapInlineRuns = (html, baseDir) => {
  const parts = String(html || '').split(TAG_SPLIT_RE);
  let out = '';

  parts.forEach((part) => {
    if (!part) return;
    if (part.charAt(0) === '<') {
      out += part;
      return;
    }

    let buf = '';
    let runDir = null;

    const flush = () => {
      if (!buf) return;
      if (runDir && runDir !== baseDir) {
        out += `<span dir="${runDir}">${buf}</span>`;
      } else {
        out += buf;
      }
      buf = '';
      runDir = null;
    };

    for (let i = 0; i < part.length; i += 1) {
      const ch = part[i];
      const d = charDir(ch);
      if (!d) {
        buf += ch;
        continue;
      }
      if (!runDir) {
        runDir = d;
        buf += ch;
        continue;
      }
      if (d === runDir) {
        buf += ch;
        continue;
      }
      flush();
      runDir = d;
      buf += ch;
    }
    flush();
  });

  return out;
};

const wrapLine = (html) => {
  const content = String(html || '').trim();
  if (!content) return html;
  if (/\bdata-safemeet-bidi=(["'])1\1/i.test(content)) return html;

  const base = firstStrongDir(content);
  const marked = wrapInlineRuns(content, base);
  const align = base === 'rtl' ? 'right' : 'left';
  return (
    `<div data-safemeet-bidi="1" dir="${base}" align="${align}" ` +
    `style="direction:${base};text-align:${align};">${marked}</div>`
  );
};

exports.stylesForExport = (hookName, padId, cb) => {
  cb(EXPORT_CSS);
};

exports.getLineHTMLForExport = async (hookName, context) => {
  try {
    if (context && typeof context.lineContent === 'string' && context.lineContent.trim()) {
      context.lineContent = wrapLine(context.lineContent);
    }
  } catch (err) {
    // Never break export on a styling failure.
  }
};
