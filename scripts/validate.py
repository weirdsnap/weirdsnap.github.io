#!/usr/bin/env python3
"""Validate blog data integrity."""
import json
import re
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


def extract_h1(md_path: Path) -> str | None:
    """Extract the first H1 title from a markdown file."""
    try:
        with open(md_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("# "):
                    return line[2:].strip()
    except (OSError, UnicodeDecodeError):
        pass
    return None


def check_title_mismatch(articles: list[dict]) -> list[str]:
    """Check that index title matches the markdown H1 title.

    Files without an H1 (e.g., placeholders) are skipped.
    """
    mismatches = []
    for a in articles:
        md_path = POSTS_DIR / a["path"]
        h1 = extract_h1(md_path)
        if h1 is not None and h1 != a["title"]:
            mismatches.append(f"{a['path']}: H1='{h1}' != index='{a['title']}'")
    return mismatches


def collect_article_paths(articles: list[dict]) -> set[str]:
    """Return a set of valid article paths from index.json."""
    return {a["path"] for a in articles}


def check_dead_links(article_paths: set[str]) -> list[str]:
    """Check that all ?post=... links in markdown files point to valid articles."""
    dead = []
    # Match ?post=PATH or ?post=PATH&... in markdown links
    link_pattern = re.compile(r"\?post=([^\s\)&]+)")
    for md_file in POSTS_DIR.rglob("*.md"):
        text = md_file.read_text(encoding="utf-8")
        for match in link_pattern.finditer(text):
            target = match.group(1)
            # Decode URL-encoded path for comparison
            target_path = target.replace("%2F", "/").replace("%2f", "/")
            if target_path not in article_paths:
                dead.append(f"{md_file.relative_to(POSTS_DIR)} -> ?post={target_path}")
    return dead


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
    article_paths = collect_article_paths(articles)

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

    # 6. title/H1 mismatch
    mismatches = check_title_mismatch(articles)
    if mismatches:
        errors.append(f"{len(mismatches)} article title(s) do not match H1:")
        for m in mismatches:
            errors.append(f"  - {m}")

    # 7. dead links in markdown
    dead_links = check_dead_links(article_paths)
    if dead_links:
        errors.append(f"{len(dead_links)} dead link(s) found:")
        for link in dead_links:
            errors.append(f"  - {link}")

    if errors:
        print("Validation failed:")
        print("\n".join(errors))
        return 1

    print(f"Validation passed: {len(articles)} articles, no NUL bytes, no duplicates, no mismatches, no dead links.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
