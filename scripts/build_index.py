#!/usr/bin/env python3
"""Scan posts/ directory and generate index.json for the blog."""
import json
import re
import subprocess
from pathlib import Path

POSTS_DIR = Path("posts")
INDEX_FILE = POSTS_DIR / "index.json"


def run_git(args: list[str]) -> str | None:
    """Run a git command and return stripped stdout, or None on failure."""
    try:
        result = subprocess.run(
            ["git"] + args,
            capture_output=True,
            text=True,
            check=True,
            cwd=POSTS_DIR.parent,
        )
        return result.stdout.strip() or None
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def git_dates(md_path: Path) -> tuple[str | None, str | None]:
    """Return (first_commit_date, last_commit_date) for a file using git log.

    Dates are returned as ISO-8601 strings (YYYY-MM-DD).
    """
    rel_path = str(md_path.relative_to(POSTS_DIR.parent))

    # First commit date: earliest commit that touched this file
    # Use --follow and take the last line since git log returns newest first.
    first = run_git(
        ["log", "--follow", "--format=%cs", "--", rel_path]
    )
    if first:
        first = first.splitlines()[-1].strip() or None

    # Last commit date: most recent commit that touched this file
    last = run_git(["log", "-1", "--format=%cs", "--", rel_path])

    return first, last


def extract_frontmatter(md_path: Path) -> dict:
    """Extract title and dates from markdown file.

    Priority:
    1. YAML frontmatter (date / updated / title)
    2. First H1 as title
    3. Git history for dates
    """
    text = md_path.read_text(encoding="utf-8")

    # Parse YAML frontmatter if present
    frontmatter: dict[str, str] = {}
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            fm_text = parts[1].strip()
            for line in fm_text.splitlines():
                if ":" in line:
                    key, value = line.split(":", 1)
                    frontmatter[key.strip()] = value.strip().strip('"').strip("'")

    # Title: frontmatter first, then first H1
    title = frontmatter.get("title", "").strip()
    if not title:
        for line in text.splitlines():
            line = line.strip()
            if line.startswith("# "):
                title = line[2:].strip()
                break
    if not title:
        title = md_path.stem

    # Dates: frontmatter first, then git history
    date = frontmatter.get("date", "").strip() or None
    updated = frontmatter.get("updated", "").strip() or None

    git_first, git_last = git_dates(md_path)
    if not date:
        date = git_first
    if not updated:
        updated = git_last or date

    return {
        "title": title,
        "date": date,
        "updated": updated,
    }


def estimate_read_time(md_path: Path) -> dict:
    """Estimate reading time and word count from markdown content.
    
    Rules match scripts/blog.js:
    - Chinese characters count as 1 unit each
    - English words count as 0.5 units each
    - ~300 units per minute for technical articles
    - Minimum 1 minute
    """
    text = md_path.read_text(encoding="utf-8")
    chinese = len(re.findall(r"[\u4e00-\u9fa5]", text))
    words = len(text.split())
    units = chinese + words * 0.5
    minutes = max(1, round(units / 300))
    # Approximate word count for display: Chinese chars + English words
    word_count = chinese + words
    return {"wordCount": word_count, "readTime": minutes}


def read_meta(dir_path: Path) -> dict:
    """Read _meta.json from a directory, return defaults if missing."""
    meta_file = dir_path / "_meta.json"
    if meta_file.exists():
        with open(meta_file, "r", encoding="utf-8") as f:
            return json.load(f)
    # default: use directory name with first letter capitalized
    return {"label": dir_path.name.capitalize(), "order": 999}


def scan_articles(dir_path: Path) -> list:
    """Scan a directory for all .md files, return sorted article list."""
    articles = []
    for md_file in dir_path.glob("*.md"):
        # Extract order number from filename like 01.md → 1, crtp_01.md → 1
        match = re.search(r"(\d+)", md_file.stem)
        order = int(match.group(1)) if match else 999
        frontmatter = extract_frontmatter(md_file)
        meta = estimate_read_time(md_file)
        article = {
            "title": frontmatter["title"],
            "path": str(md_file.relative_to(POSTS_DIR)).replace("\\", "/"),
            "order": order,
            "wordCount": meta["wordCount"],
            "readTime": meta["readTime"],
        }
        if frontmatter.get("date"):
            article["date"] = frontmatter["date"]
        if frontmatter.get("updated"):
            article["updated"] = frontmatter["updated"]
        articles.append(article)
    # Sort by numeric order so 99 follows 20 and precedes 100;
    # tie-break by path to keep prefixed topics grouped stably.
    articles.sort(key=lambda a: (a["order"], a["path"]))
    return articles


def scan_category(dir_path: Path) -> dict:
    """Scan a category directory (may contain articles and sub-categories)."""
    meta = read_meta(dir_path)
    articles = scan_articles(dir_path)
    subs = []

    # Scan sub-directories (excluding hidden dirs)
    for sub_dir in sorted(dir_path.iterdir()):
        if sub_dir.is_dir() and not sub_dir.name.startswith("."):
            sub_meta = read_meta(sub_dir)
            sub_articles = scan_articles(sub_dir)
            if sub_articles:
                subs.append({
                    "id": sub_dir.name,
                    "label": sub_meta.get("label", sub_dir.name.capitalize()),
                    "order": sub_meta.get("order", 999),
                    "type": sub_meta.get("type", "list"),
                    "articles": sub_articles
                })

    return {
        "id": dir_path.name,
        "label": meta.get("label", dir_path.name.capitalize()),
        "order": meta.get("order", 999),
        "type": meta.get("type", "list"),
        "articles": articles,
        "subs": subs
    }


def main():
    categories = []
    for cat_dir in sorted(POSTS_DIR.iterdir()):
        if cat_dir.is_dir() and not cat_dir.name.startswith("."):
            cat = scan_category(cat_dir)
            categories.append(cat)

    # Sort categories by order
    categories.sort(key=lambda x: x["order"])

    # Sort subs by order within each category
    for cat in categories:
        cat["subs"].sort(key=lambda x: x["order"])

    index = {"categories": categories}

    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"Generated {INDEX_FILE} with {len(categories)} categories")
    for cat in categories:
        total = len(cat["articles"]) + sum(len(s["articles"]) for s in cat["subs"])
        print(f"  - {cat['label']}: {len(cat['articles'])} articles, {len(cat['subs'])} subs (total {total})")


if __name__ == "__main__":
    main()
