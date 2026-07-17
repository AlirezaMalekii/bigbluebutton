#!/bin/bash

# This script is used to enable Etherpad to export to PDF/ODT/DOC
# 1- Edit /usr/share/etherpad-lite/settings.json
# 2- Set "soffice" config to this script path (default "/usr/share/bbb-libreoffice-conversion/etherpad-export.sh")
#
# SafeMeet: before LibreOffice conversion, rewrite the temporary HTML so Persian
# blocks are RTL and English blocks/runs are LTR (mixed-script paragraphs stay tidy).

SRC_HTML="$8"
OUT_TYPE="$7"
DEST_FILE="$(echo "$SRC_HTML" | sed -E -e "s/html|odt/${OUT_TYPE}/")"

PREP_SCRIPT="/usr/share/bbb-libreoffice-conversion/etherpad-bidi-prep.py"
if [ -f "$PREP_SCRIPT" ] && [ -f "$SRC_HTML" ]; then
  # Only preprocess HTML sources (PDF/DOC/ODT conversions start from Etherpad HTML).
  case "$SRC_HTML" in
    *.html|*.htm|*.HTML|*.HTM)
      python3 "$PREP_SCRIPT" "$SRC_HTML" || true
      ;;
  esac
fi

/usr/share/bbb-libreoffice-conversion/convert.sh "$SRC_HTML" "$DEST_FILE" "$OUT_TYPE"

exit 0
