#!/usr/bin/env bash
# .claude/scripts/sync-todos.sh
# Regenerates .claude/todo-analysis.md — called by the sync-todos PostToolUse hook after every git commit.

set -euo pipefail

REPO="$(git rev-parse --show-toplevel)"
OUT="$REPO/.claude/todo-analysis.md"
DATE="$(date '+%Y-%m-%d')"

mine_files=()
mine_lines=()
mine_contents=()

tmpl_files=()
tmpl_lines=()
tmpl_contents=()

while IFS= read -r line; do
  file="${line%%:*}"
  tmp="${line#*:}"
  lineno="${tmp%%:*}"
  content="${tmp#*:}"

  [[ -z "$file" || -z "$lineno" ]] && continue
  [[ ! "$lineno" =~ ^[0-9]+$ ]] && continue

  blame=$(git -C "$REPO" blame -L "${lineno},${lineno}" -- "$file" 2>/dev/null | head -1)

  rel="${file#"$REPO/"}"
  trimmed=$(printf '%s' "$content" | sed 's/^[[:space:]]*//' | sed 's/`/\\`/g' | sed 's/|/\\|/g')

  if printf '%s' "$blame" | grep -qi "pietro"; then
    mine_files+=("$rel")
    mine_lines+=("$lineno")
    mine_contents+=("$trimmed")
  else
    tmpl_files+=("$rel")
    tmpl_lines+=("$lineno")
    tmpl_contents+=("$trimmed")
  fi
done < <(grep -rn "TODO" "$REPO/src" "$REPO/server" \
  --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.css" \
  2>/dev/null)

mine_count="${#mine_files[@]}"
tmpl_count="${#tmpl_files[@]}"
total=$(( mine_count + tmpl_count ))

{
  printf '# TODO Analysis\n\n'
  printf '> Auto-updated by `sync-todos` hook after every git commit. Last updated: %s.\n\n' "$DATE"
  printf '**%d** total — **%d yours**, %d from template.\n\n' "$total" "$mine_count" "$tmpl_count"
  printf '%s\n\n' '---'

  printf '## Your TODOs (%d)\n\n' "$mine_count"
  if [[ "$mine_count" -eq 0 ]]; then
    printf 'None — clean slate.\n\n'
  else
    printf '| File | Line | Comment |\n'
    printf '|------|------|---------|\n'
    for i in "${!mine_files[@]}"; do
      printf '| \`%s\` | %s | \`%s\` |\n' "${mine_files[$i]}" "${mine_lines[$i]}" "${mine_contents[$i]}"
    done
    printf '\n'
  fi

  printf '%s\n\n' '---'

  printf '## Template TODOs (%d)\n\n' "$tmpl_count"
  if [[ "$tmpl_count" -eq 0 ]]; then
    printf 'None.\n\n'
  else
    printf '| File | Line | Comment |\n'
    printf '|------|------|---------|\n'
    for i in "${!tmpl_files[@]}"; do
      printf '| \`%s\` | %s | \`%s\` |\n' "${tmpl_files[$i]}" "${tmpl_lines[$i]}" "${tmpl_contents[$i]}"
    done
    printf '\n'
  fi
} > "$OUT"

printf '✓ TODO analysis updated (%d yours, %d template)\n' "$mine_count" "$tmpl_count"
