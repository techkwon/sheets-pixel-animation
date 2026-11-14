#!/usr/bin/env bash
# Install the sheets-pixel-animation skill.
#   ./install.sh            -> Antigravity CLI (agy): ~/.gemini/antigravity-cli/skills/
#   ./install.sh --claude   -> also Claude Code: ~/.claude/skills/
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/skill/sheets-pixel-animation"
install_to() {
  mkdir -p "$1"
  if [ -e "$1/sheets-pixel-animation" ] && [ ! -L "$1/sheets-pixel-animation" ]; then
    mv "$1/sheets-pixel-animation" "$1/sheets-pixel-animation.bak-$(date +%Y%m%d%H%M%S)"
  fi
  rm -f "$1/sheets-pixel-animation"
  cp -R "$SRC" "$1/sheets-pixel-animation"
  chmod +x "$1/sheets-pixel-animation/scripts/"*.sh
  echo "installed: $1/sheets-pixel-animation"
}
install_to "$HOME/.gemini/antigravity-cli/skills"
[ "${1:-}" = "--claude" ] && install_to "$HOME/.claude/skills"
for t in agy clasp node python3 ffmpeg; do command -v "$t" >/dev/null || echo "missing (needed): $t"; done
command -v ego-browser >/dev/null || echo "optional: ego-browser (ego-lite) not found - automatic recording will be skipped"
