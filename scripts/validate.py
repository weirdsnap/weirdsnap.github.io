#!/usr/bin/env python3
"""Validate blog data integrity."""
import json
import sys
from pathlib import Path

POSTS_DIR = Path("posts")
INDEX_FILE = POSTS_DIR / "index.json"


def check_nul_bytes() -> list[str]:
    """Find .md files containing NUL bytes."""
    bad = []
    for md_file in POSTS_DIR.rglob("*.md"):
        with open(md_file, "rb") as f:
            if b"\x00" in f.read():
                bad.append(str(md_file))
    return bad


def check_index_valid() -> tuple[bool, dict | None]:
    """Check that index.json exists and is valid JSON."""
    if not INDEX_FILE.exists():
        return False, None
    try:
        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return True, data
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        print(f"index.json parse error: {e}")
        return False, None


def collect_articles(data: dict) -> list[dict]:
    """Flatten all articles from index.json."""
    articles = []
    for cat in data.get("categories", []):
        articles.extend(cat.get("articles", []))
        for sub in cat.get("subs", []):
            articles.extend(sub.get("articles", []))
    return articles


def check_paths_exist(articles: list[dict]) -> list[str]:
    """Check that every article path in index.json points to an existing file."""
    missing = []
    for a in articles:
        path = POSTS_DIR / a["path"]
        if not path.exists():
            missing.append(a["path"])
    return missing


def check_duplicate_titles(articles: list[dict]) -> list[str]:
    """Check for duplicate article titles."""
    seen = {}
    dups = []
    for a in articles:
        title = a["title"]
        if title in seen:
            dups.append(f"'{title}' in {seen[title]} and {a['path']}")
        else:
            seen[title] = a["path"]
    return dups


def check_empty_titles(articles: list[dict]) -> list[str]:
    """Check that every article has a non-empty title."""
    bad = []
    for a in articles:
        if not a["title"] or not a["title"].strip():
            bad.append(a["path"])
    return bad


def main() -> int:
    errors = []

    # 1. NUL bytes
    nul_files = check_nul_bytes()
    if nul_files:
        errors.append(f"NUL bytes found in {len(nul_files)} file(s):")
        for f in nul_files:
            errors.append(f"  - {f}")

    # 2. index.json valid
    ok, data = check_index_valid()
    if not ok:
        errors.append("posts/index.json is missing or invalid JSON")
        print("\n".join(errors))
        return 1

    articles = collect_articles(data)

    # 3. paths exist
    missing = check_paths_exist(articles)
    if missing:
        errors.append(f"{len(missing)} article path(s) in index.json do not exist:")
        for p in missing:
            errors.append(f"  - {p}")

    # 4. duplicate titles
    dups = check_duplicate_titles(articles)
    if dups:
        errors.append(f"{len(dups)} duplicate title(s) found:")
        for d in dups:
            errors.append(f"  - {d}")

    # 5. empty titles
    empty = check_empty_titles(articles)
    if empty:
        errors.append(f"{len(empty)} article(s) with empty title:")
        for p in empty:
            errors.append(f"  - {p}")

    if errors:
        print("Validation failed:")
        print("\n".join(errors))
        return 1

    print(f"Validation passed: {len(articles)} articles, no NUL bytes, no duplicates.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
