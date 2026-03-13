#!/bin/sh
# PitchParse CLI Plugin installer for Claude Code
# Usage: sh install.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="$(pwd)"

# Check if already installed
if [ -d "$TARGET_DIR/.claude/commands/sales-qa" ]; then
  printf "Warning: .claude/commands/sales-qa/ already exists in %s\n" "$TARGET_DIR"
  printf "Existing files will NOT be overwritten (using cp -rn).\n"
  printf "Continue? [y/N] "
  read -r answer
  case "$answer" in
    [Yy]*) ;;
    *) printf "Aborted.\n"; exit 0 ;;
  esac
fi

# Create target directories
mkdir -p "$TARGET_DIR/.claude/commands"
mkdir -p "$TARGET_DIR/.claude/skills"
mkdir -p "$TARGET_DIR/.claude/references"

# Copy plugin contents without overwriting existing files
cp -rn "$SCRIPT_DIR/.claude/commands/"* "$TARGET_DIR/.claude/commands/" 2>/dev/null || true
cp -rn "$SCRIPT_DIR/.claude/skills/"* "$TARGET_DIR/.claude/skills/" 2>/dev/null || true
cp -rn "$SCRIPT_DIR/.claude/references/"* "$TARGET_DIR/.claude/references/" 2>/dev/null || true

printf "\n"
printf "PitchParse CLI plugin installed successfully.\n"
printf "\n"
printf "Next steps:\n"
printf "  1. Set your ANTHROPIC_API_KEY environment variable\n"
printf "  2. (Optional) Set DEEPGRAM_API_KEY for audio transcription\n"
printf "  3. Open Claude Code and run /sales-qa:pipeline to get started\n"
printf "\n"
