#!/bin/zsh
# Usage: record.sh <name> <sheet_id> "<menu>" "<setup item>" "<play item>" [out_dir]
# Opens the sheet in ego-lite, runs Setup, then Play, and captures ~68 s of frames.
# If the script still needs authorization it opens the Google consent popup, hands the browser to the user and prints {"need":"auth"}:
# ask the user to click Allow, then run the same command again.
D=${0:A:h}; OUT=${6:-/tmp/sheets-anim}
ARGS=$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1:6]))' "$1" "$2" "$3" "$4" "$5")
mkdir -p "$OUT"
python3 - "$D/record.mjs.tpl" "$ARGS" "$OUT" > "$OUT/record-run.mjs" <<'PY'
import sys
s=open(sys.argv[1]).read().replace("__ARGS__", sys.argv[2]).replace('(process.env.OUT_DIR ?? "/tmp/sheets-anim")', repr(sys.argv[3]).replace("'", '"'))
print(s)
PY
ego-browser nodejs < "$OUT/record-run.mjs" 2>&1 | grep -v "ego-browser:notice" | tail -3
