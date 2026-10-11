#!/usr/bin/env python3
"""Report where a repository stands against Codex CLI releases, and fetch their notes.

Subcommands:
  status  Read marker, installed vs latest release, default range, replay cap.
  fetch   The status lines, then the curated release-note items of every
          release in range, each led by a stable id (<version>-<ordinal>).
          With --out DIR, also writes DIR/releases.json, DIR/notes/<v>.md
          (raw bodies) and DIR/items/<v>.md, which --from DIR reads offline.
          A default range also writes DIR/after.txt, the marker it started after.

Releases come from GitHub (`gh release list|view -R openai/codex`), stable
`rust-v<X.Y.Z>` tags only, or from a directory written by an earlier
`fetch --out`. The installed version comes from `codex --version`.

Read marker: the first line of the ledger matching
  **Last read Codex release:** `X.Y.Z`
Ledger path: --ledger, else <git toplevel or working directory>/docs/upstream/codex-cli.md.

Output is one `key: value` line per fact. Exit 0 whenever status is emitted,
including a failed release fetch; 2 for an unknown flag; 3 for an invalid value
or unreadable input.
Python 3.9 or newer; standard library only.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPO = "openai/codex"
TAG_RE = re.compile(r"^rust-v(\d+)\.(\d+)\.(\d+)$")
VERSION_RE = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)$")
MARKER_RE = re.compile(r"Last read Codex release:\*\*\s*`(\d+\.\d+\.\d+)`")
BULLET_RE = re.compile(r"^\s*[-*]\s+(.*\S)")
SECTION_RE = re.compile(r"^#{1,6}\s+(.*\S)")
# The raw pull-request list starts at `## Changelog` / `Full Changelog:` from
# 0.77.0 on, and under a "merged PRs" heading in older releases.
END_RE = re.compile(
    r"^(#{1,6}\s+(changelog\b|full list of merged prs|(all\s+)?merged prs|prs merged)|full changelog:)",
    re.IGNORECASE,
)
DEFAULT_LEDGER = Path("docs") / "upstream" / "codex-cli.md"
DEFAULT_CAP_RELEASES = 50
DEFAULT_CAP_ITEMS = 400
LIST_LIMIT = 200

Version = tuple[int, int, int]


class UsageError(Exception):
    pass


def parse_version(text: str) -> Version:
    match = VERSION_RE.match(text.strip())
    if not match:
        raise UsageError(f"not a version (X.Y.Z, optional v prefix): {text}")
    return tuple(int(part) for part in match.groups())  # type: ignore[return-value]


def show(version: Version) -> str:
    return ".".join(str(part) for part in version)


def parse_range(text: str) -> tuple[Version, Version]:
    first, sep, last = text.partition("..")
    low = parse_version(first)
    high = parse_version(last) if sep else low
    if low > high:
        raise UsageError(f"--range runs low to high: {text}")
    return low, high


def parse_items(body: str) -> list[tuple[str, str]]:
    """Curated (section, text) bullets that precede the raw PR changelog."""
    items: list[tuple[str, str]] = []
    section = ""
    for line in body.replace("\r\n", "\n").split("\n"):
        if END_RE.match(line.strip()):
            break
        heading = SECTION_RE.match(line)
        if heading:
            section = heading.group(1)
            if "breaking" in section.lower():
                # Older releases state a breaking change as a heading, not a bullet.
                items.append(("Breaking", section.replace("*", "").strip()))
            continue
        bullet = BULLET_RE.match(line)
        if bullet:
            items.append((section, bullet.group(1)))
    return items


def run(command: list[str]) -> str | None:
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=False)
    except OSError:
        return None
    return result.stdout if result.returncode == 0 else None


class GitHubSource:
    """Adapter over the gh CLI. Every failure surfaces as a reason string."""

    def releases(self) -> list[dict]:
        out = run(
            ["gh", "release", "list", "-R", REPO, "--exclude-pre-releases",
             "--exclude-drafts", "--limit", str(LIST_LIMIT), "--json", "tagName,publishedAt"]
        )
        if out is None:
            raise RuntimeError("`gh release list -R openai/codex` failed; check gh is installed and authenticated")
        return json.loads(out)

    def body(self, version: Version) -> str:
        out = run(["gh", "release", "view", f"rust-v{show(version)}", "-R", REPO, "--json", "body"])
        if out is None:
            raise RuntimeError(f"`gh release view rust-v{show(version)}` failed")
        return json.loads(out).get("body") or ""


class DirectorySource:
    """Reads the layout `fetch --out` writes."""

    def __init__(self, root: Path) -> None:
        self.root = root

    def releases(self) -> list[dict]:
        return json.loads((self.root / "releases.json").read_text(encoding="utf-8"))

    def body(self, version: Version) -> str:
        path = self.root / "notes" / f"{show(version)}.md"
        if not path.is_file():
            raise RuntimeError(f"no saved notes for {show(version)} under {self.root / 'notes'}")
        return path.read_text(encoding="utf-8")


def stable_releases(rows: list[dict]) -> dict[Version, str]:
    found: dict[Version, str] = {}
    for row in rows:
        match = TAG_RE.match(str(row.get("tagName", "")))
        if match:
            found[tuple(int(p) for p in match.groups())] = str(row.get("publishedAt", ""))[:10]  # type: ignore[index]
    return found


def repo_root() -> Path:
    out = run(["git", "rev-parse", "--show-toplevel"])
    return Path(out.strip()) if out and out.strip() else Path.cwd()


def installed_version() -> Version | None:
    out = run(["codex", "--version"])
    match = re.search(r"(\d+)\.(\d+)\.(\d+)", out or "")
    return tuple(int(p) for p in match.groups()) if match else None  # type: ignore[return-value]


def read_marker(ledger: Path) -> Version | None:
    if not ledger.is_file():
        return None
    match = MARKER_RE.search(ledger.read_text(encoding="utf-8"))
    return parse_version(match.group(1)) if match else None


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=("status", "fetch"))
    parser.add_argument("--ledger", type=Path, help="ledger holding the read marker")
    parser.add_argument("--range", dest="range_text", help="A..B (inclusive) or X; ignores the marker")
    parser.add_argument("--from", dest="source_dir", type=Path, help="read releases saved by `fetch --out`")
    parser.add_argument("--out", type=Path, help="fetch only: directory to write releases, notes and items")
    parser.add_argument("--cap-releases", type=int, default=DEFAULT_CAP_RELEASES)
    parser.add_argument("--cap-items", type=int, default=DEFAULT_CAP_ITEMS)
    return parser


def main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        if args.cap_releases < 0 or args.cap_items < 0:
            raise UsageError("caps must be zero or greater")
        if args.out and args.command != "fetch":
            raise UsageError("--out applies to fetch only")
        # A fresh directory only: an existing one may hold planted symlinks or
        # edited item files that the agent would then read.
        if args.out and args.out.exists() and (not args.out.is_dir() or any(args.out.iterdir())):
            raise UsageError(f"--out must be a new or empty directory: {args.out}")
        bounds = parse_range(args.range_text) if args.range_text else None
        if args.source_dir and not (args.source_dir / "releases.json").is_file():
            raise UsageError(f"no releases.json under --from {args.source_dir}")
        ledger = args.ledger or repo_root() / DEFAULT_LEDGER
        if ledger.exists() and not ledger.is_file():
            raise UsageError(f"ledger is not a file: {ledger}")
        marker = read_marker(ledger)
    except (UsageError, OSError, UnicodeDecodeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 3
    return report(args, bounds, ledger, marker)


def report(args: argparse.Namespace, bounds: tuple[Version, Version] | None,
           ledger: Path, marker: Version | None) -> int:
    emit = lambda key, value: print(f"{key}: {value}")  # noqa: E731
    emit("last-read", show(marker) if marker else "none")
    emit("ledger", f"{ledger} ({'present' if ledger.is_file() else 'absent'})")
    installed = installed_version()
    emit("installed", show(installed) if installed else "unknown")

    source = DirectorySource(args.source_dir) if args.source_dir else GitHubSource()
    try:
        rows = source.releases()
        published = stable_releases(rows)
    except (RuntimeError, OSError, ValueError) as error:
        emit("latest", "unknown")
        emit("range", f"not computed ({error})")
        return 0
    if not published:
        emit("latest", "unknown")
        emit("range", "not computed (no stable rust-v<X.Y.Z> release in the list)")
        return 0
    latest = max(published)
    emit("latest", f"{show(latest)} (published {published[latest]})")

    # A full list page may stop short of the releases the range needs.
    start = bounds[0] if bounds else marker
    if len(rows) >= LIST_LIMIT and start is not None and start < min(published):
        emit("range", f"not computed (the range starts before {show(min(published))}, the oldest of the "
             f"newest {LIST_LIMIT} releases listed)")
        return 0

    if bounds:
        in_range = sorted(v for v in published if bounds[0] <= v <= bounds[1])
    else:
        in_range = sorted(v for v in published if marker is None or v > marker)
    if not in_range:
        if bounds:
            emit("range", f"not computed (no stable release between {show(bounds[0])} and {show(bounds[1])})")
        else:
            emit("range", "up to date")
        return 0
    if not bounds and marker is None:
        emit("recommend", f"no read marker. Check the repository against the current Codex docs, then add the "
             f"marker line to {ledger} at {show(latest)} and diff only from there")
        return 0

    first, last = in_range[0], in_range[-1]
    if len(in_range) > args.cap_releases:
        emit("range", f"{show(first)}..{show(last)} ({len(in_range)} releases, items not counted)")
        exceeded(emit, args, ledger, last)
        return 0

    try:
        with ThreadPoolExecutor(max_workers=8) as pool:
            bodies = dict(zip(in_range, pool.map(source.body, in_range)))
    except (RuntimeError, OSError, ValueError) as error:
        emit("range", f"{show(first)}..{show(last)} ({len(in_range)} releases, items not counted: {error})")
        return 0
    items = {v: parse_items(bodies[v]) for v in in_range}
    total = sum(len(rows) for rows in items.values())
    emit("range", f"{show(first)}..{show(last)} ({len(in_range)} releases, {total} items)")
    emit("releases", " ".join(show(v) for v in in_range))
    if total > args.cap_items:
        exceeded(emit, args, ledger, last)
        return 0
    emit("cap", f"within budget ({args.cap_releases} releases / {args.cap_items} items)")
    if installed and installed < last:
        emit("warn", f"installed {show(installed)} is older than {show(last)}, the newest release in the range; "
             "update Codex before acting on items that need it")

    if args.command == "fetch":
        write_or_print(args.out, in_range, published, bodies, items)
        if args.out and not bounds and marker and (not args.source_dir or saved_after(args.source_dir) == marker):
            # The default range runs from the release right after the marker, so
            # `apply_plan.py marker` can tell it leaves no release unread.
            (args.out / "after.txt").write_text(show(marker) + "\n", encoding="utf-8")
    return 0


def saved_after(directory: Path) -> Version | None:
    path = directory / "after.txt"
    return parse_version(path.read_text(encoding="utf-8")) if path.is_file() else None


def exceeded(emit, args: argparse.Namespace, ledger: Path, last: Version) -> None:
    emit("cap", f"exceeded ({args.cap_releases} releases / {args.cap_items} items)")
    emit("recommend", "the current Codex docs carry the cumulative state, so check the repository against them "
         f"instead of replaying items, then set the marker in {ledger} to {show(last)}; "
         "or pass a narrower --range or higher caps to replay anyway")


def item_lines(version: Version, rows: list[tuple[str, str]]) -> list[str]:
    return [f"{show(version)}-{index:03d} [{section or 'Notes'}] {text}"
            for index, (section, text) in enumerate(rows, start=1)]


def write_or_print(out: Path | None, in_range: list[Version], published: dict[Version, str],
                   bodies: dict[Version, str], items: dict[Version, list[tuple[str, str]]]) -> None:
    if out is None:
        for version in in_range:
            print(f"\n## {show(version)} ({published[version]})")
            print("\n".join(item_lines(version, items[version])) or "(no curated items)")
        return
    (out / "notes").mkdir(parents=True, exist_ok=True)
    (out / "items").mkdir(parents=True, exist_ok=True)
    rows = [{"tagName": f"rust-v{show(v)}", "publishedAt": published[v]} for v in in_range]
    (out / "releases.json").write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
    for version in in_range:
        (out / "notes" / f"{show(version)}.md").write_text(bodies[version], encoding="utf-8")
        lines = item_lines(version, items[version])
        (out / "items" / f"{show(version)}.md").write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    print(f"written: {out}")


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
