# translation-gap

Regenerates the translation gap analysis report and prints a summary of missing/orphan keys across all locales.

## Usage

```
/translation-gap
```

## What it does

1. Diffs every locale file (`it`, `de`, `es`, `fr`, `pt`) against `en.json` (the reference)
2. Prints a summary table to the console
3. Overwrites `.claude/translation-gap-analysis.md` with the full report
4. Exits with a warning (non-zero) if gaps exist — does **not** block any workflow

## Instructions

Run the gap analysis script and show the output to the user:

```bash
python3 .claude/scripts/translation-gap.py
```

After the script runs:
- If gaps are found, remind the user that the full report is at `.claude/translation-gap-analysis.md`
- Do not auto-fix anything — report only
