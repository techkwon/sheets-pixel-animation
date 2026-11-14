#!/bin/zsh
# Usage: make_sheet.sh <project_dir> "<Sheet title>"
# Needs <project_dir>/prompt.txt (scene paragraph + Rules block).
# 1) Gemini 4 Hydrogen writes Code.gs  2) syntax/function check  3) clasp creates the Sheet and pushes the code.
# Re-running skips Hydrogen if Code.gs already exists (delete it to regenerate).
set -e
P=${1:?project dir}; TITLE=${2:?title}
FULL=${0:A:h:h:h}/sheets-pixel-animation
P=$(cd "$P" && pwd)
[ -f "$P/prompt.txt" ] || { echo "missing $P/prompt.txt"; exit 1; }
if [ ! -f "$P/Code.gs" ]; then
  mkdir -p "$P/runs/hydrogen"; cd "$P/runs/hydrogen"
  echo "Hydrogen is writing Code.gs (about 5-6 min)..."
  env -i HOME=$HOME PATH=$PATH USER=$USER agy -p "$(cat "$P/prompt.txt")" --model gemini-4-hydrogen-high \
    --sandbox --dangerously-skip-permissions --output-format json < /dev/null > log.json 2> err.txt || echo "agy exit $? (checking Code.gs anyway)"
  [ -f Code.gs ] || { echo "Hydrogen did not write Code.gs; see $P/runs/hydrogen/err.txt"; exit 1; }
  cp Code.gs "$P/Code.gs"
fi
node -e "new Function(require('fs').readFileSync('$P/Code.gs','utf8'))" || { echo "Code.gs has a syntax error"; exit 1; }
for f in setup play stop onOpen; do grep -qE "function +$f *\(" "$P/Code.gs" || { echo "Code.gs is missing function $f()"; exit 1; }; done
"$FULL/scripts/new_sheet.sh" "$P" "$TITLE"
