#!/usr/bin/env python3
"""Scan posts/ directory and generate index.json for the blog."""
import json
import re
from pathlib import Path

POSTS_DIR = Path("posts")
INDEX_FILE = POSTS_DIR / "index.json"


def extract_title(md_path: Path) -> str:
    """Extract title from first H1 in markdown file."""
    with open(md_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("# "):
                return line[2:].strip()
    # fallback: use filename without extension
    return md_path.stem


def estimate_read_time(md_path: Path) -> dict:
    """Estimate reading time and word count from markdown content.
    
    Rules match scripts/blog.js:
    - Chinese characters count as 1 unit each
    - English words count as 0.5 units each
    - ~400 units per minute
    - Minimum 1 minute
    """
    text = md_path.read_text(encoding="utf-8")
    chinese = len(re.findall(r"[\u4e00-\u9fa5]", text))
    words = len(text.split())
    units = chinese + words * 0.5
    minutes = max(1, round(units / 400))
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
        meta = estimate_read_time(md_file)
        articles.append({
            "title": extract_title(md_file),
            "path": str(md_file.relative_to(POSTS_DIR)).replace("\\", "/"),
            "order": order,
            "wordCount": meta["wordCount"],
            "readTime": meta["readTime"]
        })
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
