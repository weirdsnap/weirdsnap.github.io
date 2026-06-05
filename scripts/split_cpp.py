#!/usr/bin/env python3
"""Split CPP chapter files into per-topic cards."""
import json
import re
from pathlib import Path

POSTS_DIR = Path("posts")
CPP_DIR = POSTS_DIR / "cpp"


def split_chapter(md_path: Path):
    """Split a single chapter file into topic cards."""
    # Read with error handling for non-UTF8 bytes
    try:
        content = md_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        content = md_path.read_text(encoding="utf-8", errors="replace")

    lines = content.splitlines()

    # Chapter number from filename e.g. ch01.md -> 01
    chapter_num = int(re.search(r"ch(\d+)", md_path.stem).group(1))

    # Chapter title from first H1
    chapter_title = lines[0].strip() if lines else md_path.stem
    chapter_title = chapter_title.lstrip("# ").strip()

    # Create output directory
    out_dir = CPP_DIR / f"ch{chapter_num:02d}"
    out_dir.mkdir(parents=True, exist_ok=True)

    # Write _meta.json for the sub-folder
    meta = {"label": chapter_title, "order": chapter_num}
    with open(out_dir / "_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    # Find all topic boundaries: ### number. title
    topic_boundaries = []
    for i, line in enumerate(lines):
        m = re.match(r"^###\s+(\d+)\.\s+(.+)$", line.strip())
        if m:
            topic_num = int(m.group(1))
            topic_title = m.group(2).strip()
            topic_boundaries.append((i, topic_num, topic_title))

    if not topic_boundaries:
        print(f"[!] No topics found in {md_path.name}")
        return 0

    # Extract each topic
    count = 0
    for idx, (start_line, topic_num, topic_title) in enumerate(topic_boundaries):
        # End boundary: next topic or end of file
        if idx + 1 < len(topic_boundaries):
            end_line = topic_boundaries[idx + 1][0]
        else:
            end_line = len(lines)

        # Extract topic lines
        topic_lines = lines[start_line:end_line]

        # Remove trailing --- separator lines and blank lines
        while topic_lines and topic_lines[-1].strip() in ("", "---"):
            topic_lines.pop()

        # Remove leading --- separator lines
        while topic_lines and topic_lines[0].strip() == "---":
            topic_lines.pop(0)

        # Build output content: title + body
        output_lines = [f"# {topic_title}"]
        output_lines.append("")

        # Skip the ### line itself, keep the rest
        body_lines = topic_lines[1:]

        # Remove leading blank lines
        while body_lines and body_lines[0].strip() == "":
            body_lines.pop(0)

        output_lines.extend(body_lines)

        out_file = out_dir / f"{topic_num:02d}.md"
        with open(out_file, "w", encoding="utf-8") as f:
            f.write("\n".join(output_lines))
        count += 1

    print(f"[OK] {md_path.name} -> {out_dir.name}/ ({count} topics)")
    return count


def main():
    total = 0
    for md_file in sorted(CPP_DIR.glob("ch*.md")):
        total += split_chapter(md_file)

    print(f"\nTotal: {total} topic cards generated")


if __name__ == "__main__":
    main()
