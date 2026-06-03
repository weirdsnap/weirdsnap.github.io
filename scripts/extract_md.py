#!/usr/bin/env python3
"""Extract Markdown content from exported HTML blog files."""
import os
from pathlib import Path
from bs4 import BeautifulSoup
from markdownify import markdownify as md


def extract(input_path: Path, output_path: Path):
    with open(input_path, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")

    preview = soup.find("div", class_="mume markdown-preview")
    if not preview:
        print(f"[!] No content found in {input_path}")
        return False

    # Convert to Markdown
    markdown = md(
        str(preview),
        heading_style="ATX",
        bullets="-",
        strip=["script", "style"],
    )

    # Clean up excessive blank lines
    lines = markdown.splitlines()
    cleaned = []
    prev_blank = False
    for line in lines:
        is_blank = line.strip() == ""
        if is_blank and prev_blank:
            continue
        cleaned.append(line)
        prev_blank = is_blank

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(cleaned))

    print(f"[OK] {input_path.name} -> {output_path}")
    return True


def main():
    blogs_dir = Path("htmls/blogs")
    posts_dir = Path("posts")
    posts_dir.mkdir(exist_ok=True)

    for html_file in sorted(blogs_dir.glob("*.html")):
        # Map 001.html -> 001.md
        md_file = posts_dir / html_file.with_suffix(".md").name
        extract(html_file, md_file)


if __name__ == "__main__":
    main()
