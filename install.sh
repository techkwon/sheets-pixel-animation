#!/usr/bin/env bash
# Install the sheets-pixel-animation skills (full + lite).
#   ./install.sh            -> Antigravity CLI (agy): ~/.gemini/antigravity-cli/skills/
#   ./install.sh --claude   -> also Claude Code: ~/.claude/skills/
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
install_to() {
  mkdir -p "$1"
  for name in sheets-pixel-animation sheets-pixel-animation-lite; do
    if [ -e "$1/$name" ] && [ ! -L "$1/$name" ]; then
      mv "$1/$name" "$1/$name.bak-$(date +%Y%m%d%H%M%S)"
    fi
    rm -f "$1/$name"
    cp -R "$HERE/skill/$name" "$1/$name"
    chmod +x "$1/$name/scripts/"*.sh
    echo "installed: $1/$name"
  done
}
install_to "$HOME/.gemini/antigravity-cli/skills"
[ "${1:-}" = "--claude" ] && install_to "$HOME/.claude/skills"
for t in agy clasp node python3 ffmpeg; do command -v "$t" >/dev/null || echo "missing (needed): $t"; done
command -v ego-browser >/dev/null || echo "optional: ego-browser (ego-lite) not found - automatic recording will be skipped"
