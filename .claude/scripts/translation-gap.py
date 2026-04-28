#!/usr/bin/env python3
"""
Regenerates .claude/translation-gap-analysis.md and prints a summary.
Exits with code 1 (warning) if any gaps are found, 0 if all locales are in sync.
"""
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
TRANSLATIONS = ROOT / "src" / "translations"
OUTPUT = ROOT / ".claude" / "translation-gap-analysis.md"
REFERENCE = "en.json"
LOCALES = ["it.json", "de.json", "es.json", "fr.json", "pt.json"]


def load(name):
    with open(TRANSLATIONS / name) as f:
        return json.load(f)


def gap(source, target):
    return sorted(set(source.keys()) - set(target.keys()))


def extra(source, ref):
    return sorted(set(source.keys()) - set(ref.keys()))


def group_by_prefix(keys):
    groups = {}
    for k in keys:
        prefix = k.split(".")[0]
        groups.setdefault(prefix, []).append(k)
    return groups


def render_key_list(keys):
    lines = []
    for prefix, ks in group_by_prefix(keys).items():
        lines.append(f"\n### {prefix} ({len(ks)})")
        for k in ks:
            lines.append(f"- `{k}`")
    return "\n".join(lines)


def build_report(data, ref_keys):
    today = date.today().isoformat()
    lines = [
        "# Translation Gap Analysis",
        "",
        f"> Last generated: {today}  ",
        f"> Reference locale: `{REFERENCE}` ({len(ref_keys)} keys)",
        "",
        "## Key counts",
        "",
        "| File | Keys | Missing from en | Extra vs en |",
        "|---|---|---|---|",
        f"| `{REFERENCE}` | {len(ref_keys)} | — | — |",
    ]

    for lang in LOCALES:
        m = len(gap(data[REFERENCE], data[lang]))
        e = len(extra(data[lang], data[REFERENCE]))
        m_str = f"**{m}**" if m else "0"
        e_str = f"**{e}**" if e else "0"
        lines.append(f"| `{lang}` | {len(data[lang])} | {m_str} | {e_str} |")

    for lang in LOCALES:
        missing = gap(data[REFERENCE], data[lang])
        orphans = extra(data[lang], data[REFERENCE])
        if not missing and not orphans:
            continue
        lines += ["", f"---", f"", f"## {lang}"]
        if missing:
            lines += [
                "",
                f"### Missing from `{REFERENCE}` ({len(missing)} keys)",
                render_key_list(missing),
            ]
        if orphans:
            lines += [
                "",
                f"### Extra keys NOT in `{REFERENCE}` — orphans to resolve ({len(orphans)})",
            ]
            for k in orphans:
                lines.append(f"- `{k}`")

    return "\n".join(lines) + "\n"


def main():
    data = {REFERENCE: load(REFERENCE)}
    for lang in LOCALES:
        data[lang] = load(lang)

    ref_keys = data[REFERENCE]
    report = build_report(data, ref_keys)
    OUTPUT.write_text(report)

    # --- summary to stdout ---
    total_missing = sum(len(gap(ref_keys, data[l])) for l in LOCALES)
    total_orphans = sum(len(extra(data[l], ref_keys)) for l in LOCALES)

    print(f"\n{'='*55}")
    print(f"  Translation gap analysis — {date.today().isoformat()}")
    print(f"{'='*55}")
    print(f"  {'Locale':<10} {'Keys':>6}  {'Missing':>8}  {'Orphans':>8}")
    print(f"  {'-'*44}")
    for lang in LOCALES:
        m = len(gap(ref_keys, data[lang]))
        e = len(extra(data[lang], ref_keys))
        flag = "  ⚠" if (m or e) else ""
        print(f"  {lang:<10} {len(data[lang]):>6}  {m:>8}  {e:>8}{flag}")
    print(f"{'='*55}")

    if total_missing or total_orphans:
        print(f"\n⚠  {total_missing} missing keys, {total_orphans} orphan keys found.")
        print(f"   Report updated: .claude/translation-gap-analysis.md\n")
        sys.exit(1)
    else:
        print(f"\n✓  All locales in sync with {REFERENCE}.\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
