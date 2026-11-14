#!/bin/zsh
# Usage: new_sheet.sh <project_dir> "<Sheet title>"
# Creates a new Google Sheet with a bound Apps Script (clasp) and pushes <project_dir>/Code.gs into it.
# Re-running on the same project only pushes again.
set -e
P=${1:?project dir}; TITLE=${2:?title}
[ -f "$P/Code.gs" ] || { echo "missing $P/Code.gs"; exit 1; }
node -e "new Function(require('fs').readFileSync('$P/Code.gs','utf8'))" || { echo "Code.gs has a syntax error"; exit 1; }
mkdir -p "$P/clasp"; cd "$P/clasp"
if [ ! -f .clasp.json ]; then clasp create --type sheets --title "$TITLE" >/dev/null; fi
cp ../Code.gs ./Code.gs
clasp push -f >/dev/null
SHEET=$(python3 -c "import json;print(json.load(open('.clasp.json'))['parentId'])")
SCRIPT=$(python3 -c "import json;print(json.load(open('.clasp.json'))['scriptId'])")
MENU=$(grep -oE "createMenu\(['\"][^'\"]+" ../Code.gs | head -1 | cut -c13-)
echo "SHEET_ID=$SHEET"
echo "SHEET_URL=https://docs.google.com/spreadsheets/d/$SHEET/edit"
echo "SCRIPT_URL=https://script.google.com/d/$SCRIPT/edit"
echo "MENU=$MENU"
grep -oE "addItem\(['\"][^'\"]+['\"], *['\"](setup|play)['\"]" ../Code.gs | sed -E "s/addItem\(['\"]([^'\"]+)['\"], *['\"](setup|play)['\"]/\2=\1/"
