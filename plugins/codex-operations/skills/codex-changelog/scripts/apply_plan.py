#!/usr/bin/env python3
"""Plan an `apply` run from saved decision rows, and compute how far the read marker may move.

Subcommands:
  plan    Number the rows, apply the scope selection, and group the in-scope
          rows still open: one group per owner plugin for rows that fit this
          session, and a `file` list for rows too large or with the replace
          lens. In-scope rows already in a final state list as `done`.
  marker  The release the read marker may move to: the newest release in range
          below the first release that still has a row in no final state.
          With --write, sets the ledger's marker line to it. A range that
          starts after the marker without DIR/after.txt naming that marker
          (written by a default-range fetch) prints `gap:` and moves nothing.

Input: DIR/rows.json and DIR/releases.json, where DIR is a directory written by
`codex_releases.py fetch --out` and rows.json is the list `diff` saved there:
  [{"surface": "<repository-relative path>", "lens": "correct|replace|adopt",
    "items": ["<version>-<NNN>", ...], "sentence": "<required sentence>",
    "size": "fits|large", "state": "pending|applied|declined|deferred|filed",
    "record": "<PR, issue, or reopen condition>"}]
`size` defaults to fits and `state` to pending. A final state (applied,
declined, deferred, filed) needs a record. `applied` means merged. No field may
hold a control, format (bidi or zero-width), or separator character; `surface`
and `record` may not hold `|` or a backtick.

Root: --root, default git toplevel or working directory. The ledger must sit
inside it with no symlink or `..` on the way.
Owner: the nearest directory at or above the surface, inside the root, holding
a plugin manifest; `.` when none.

Selection (--select, comma-separated): `all`, a lens (`correct`, `replace`,
`adopt`), a row number `N`, or a range `N-M`.

Output is one `key: value` line per fact. Exit 0 on success, 2 for an unknown
flag, 3 for invalid rows, selection, or input.
Python 3.9 or newer; standard library only.
"""

from __future__ import annotations

import argparse
import datetime
import json
import re
import sys
import unicodedata
from pathlib import Path, PurePosixPath

# The sibling imports below would otherwise leave __pycache__ in the skill directory.
sys.dont_write_bytecode = True

from codex_releases import (  # noqa: E402
    DEFAULT_LEDGER,
    MARKER_RE,
    UsageError,
    Version,
    parse_version,
    read_marker,
    saved_after,
    repo_root,
    show,
    stable_releases,
)
from discover_surfaces import PLUGIN_MANIFESTS  # noqa: E402

LENSES = ("correct", "replace", "adopt")
SIZES = ("fits", "large")
FINAL_STATES = ("applied", "declined", "deferred", "filed")
STATES = ("pending", *FINAL_STATES)
ITEM_RE = re.compile(r"^(\d+\.\d+\.\d+)-\d{3}$")
TOKEN_RE = re.compile(r"^(\d+)(?:-(\d+))?$")
# Control (Cc), format (Cf: bidi overrides, zero-width), and line and paragraph
# separators could forge an output line or make reviewed text differ from its bytes.
UNSAFE_CATEGORIES = {"Cc", "Cf", "Zl", "Zp"}


def unsafe(value: str) -> bool:
    return any(unicodedata.category(char) in UNSAFE_CATEGORIES for char in value)


def load(directory: Path) -> tuple[list[dict], dict]:
    for name in ("rows.json", "releases.json"):
        if not (directory / name).is_file():
            raise UsageError(f"no {name} under --from {directory}")
    rows = json.loads((directory / "rows.json").read_text(encoding="utf-8"))
    listed = json.loads((directory / "releases.json").read_text(encoding="utf-8"))
    if not isinstance(listed, list) or not all(isinstance(entry, dict) for entry in listed):
        raise UsageError("releases.json must be a list of objects")
    published = stable_releases(listed)
    if not published:
        raise UsageError("releases.json lists no stable release")
    if not isinstance(rows, list) or not rows:
        raise UsageError("rows.json must be a non-empty list")
    return [check_row(number, row, published) for number, row in enumerate(rows, start=1)], published


def check_row(number: int, row: object, published: dict) -> dict:
    def fail(reason: str) -> UsageError:
        return UsageError(f"row {number}: {reason}")

    def text(key: str, default: str = "") -> str:
        value = row.get(key, default)  # type: ignore[union-attr]
        if not isinstance(value, str):
            raise fail(f"{key} must be a string")
        return value.strip()

    if not isinstance(row, dict):
        raise fail("not an object")
    surface = text("surface")
    path = PurePosixPath(surface)
    if not surface or path.is_absolute() or ".." in path.parts or "\\" in surface:
        raise fail(f"surface must be a repository-relative path: {surface!r}")
    lens, size, state = row.get("lens"), row.get("size", "fits"), row.get("state", "pending")
    if lens not in LENSES:
        raise fail(f"lens must be one of {', '.join(LENSES)}")
    if size not in SIZES:
        raise fail(f"size must be one of {', '.join(SIZES)}")
    if state not in STATES:
        raise fail(f"state must be one of {', '.join(STATES)}")
    sentence = text("sentence")
    if not sentence:
        raise fail("a row without its required sentence is not a decision")
    record = text("record")
    # Output lines and ledger table rows are built from these fields, so a field
    # must not be able to start a new line or a new table cell.
    for name, value in (("surface", surface), ("sentence", sentence), ("record", record)):
        if unsafe(value) or (name != "sentence" and ("|" in value or "`" in value)):
            raise fail(f"{name} holds a control character, an invisible format character, `|`, or a backtick")
    if state in FINAL_STATES and not record:
        raise fail(f"state {state} needs a record (PR, issue, or reopen condition)")
    items = row.get("items")
    if not isinstance(items, list) or not items:
        raise fail("items must be a non-empty list")
    versions = []
    for item in items:
        match = ITEM_RE.match(str(item))
        if not match:
            raise fail(f"not an item id (<version>-<NNN>): {item}")
        version = parse_version(match.group(1))
        if version not in published:
            raise fail(f"item {item} is outside the releases in range")
        versions.append(version)
    return {"number": number, "surface": surface, "lens": lens, "size": size, "state": state,
            "record": record, "sentence": sentence, "items": [str(i) for i in items], "first": min(versions)}


def owner(surface: str, root: Path) -> str:
    """The nearest plugin root at or above the surface, or `.` for the repository."""
    parts = PurePosixPath(surface).parts
    for depth in range(len(parts), 0, -1):
        candidate = root.joinpath(*parts[:depth])
        # A manifest directory such as `.codex-plugin/` belongs to the plugin above it.
        if parts[depth - 1].startswith("."):
            continue
        if any((candidate / manifest).is_file() for manifest in PLUGIN_MANIFESTS):
            return "/".join(parts[:depth])
    return "."


def select(spec: str, rows: list[dict]) -> set[int]:
    chosen: set[int] = set()
    tokens = [token.strip() for token in spec.split(",")]
    if not any(tokens):
        raise UsageError("--select is empty")
    for token in tokens:
        if token == "all":
            chosen.update(row["number"] for row in rows)
        elif token in LENSES:
            chosen.update(row["number"] for row in rows if row["lens"] == token)
        elif TOKEN_RE.match(token):
            low, high = TOKEN_RE.match(token).groups()  # type: ignore[union-attr]
            low_n, high_n = int(low), int(high or low)
            if not 1 <= low_n <= high_n <= len(rows):
                raise UsageError(f"--select row {token} is outside 1..{len(rows)}")
            chosen.update(range(low_n, high_n + 1))
        else:
            raise UsageError(f"--select token not understood: {token!r}")
    return chosen


def numbers(rows: list[dict]) -> str:
    return ",".join(str(row["number"]) for row in rows) or "none"


def plan(rows: list[dict], published: dict, spec: str, root: Path) -> None:
    chosen = select(spec, rows)
    releases = sorted(published)
    print(f"range: {show(releases[0])}..{show(releases[-1])}")
    groups: dict[str, list[dict]] = {}
    to_file, out, done = [], [], []
    for row in rows:
        row["owner"] = owner(row["surface"], root)
        scope = "in" if row["number"] in chosen else "out"
        print(f"row {row['number']}: {scope} {row['lens']} {row['size']} {row['state']} "
              f"owner={row['owner']} surface={row['surface']} items={','.join(row['items'])} "
              f"sentence={row['sentence']}")
        if scope == "out":
            out.append(row)
        elif row["state"] in FINAL_STATES:
            done.append(row)
        elif row["lens"] == "replace" or row["size"] == "large":
            to_file.append(row)
        else:
            groups.setdefault(row["owner"], []).append(row)
    for name in sorted(groups):
        print(f"group: {name} rows {numbers(groups[name])}")
    print(f"file: rows {numbers(to_file)}")
    print(f"done: rows {numbers(done)}")
    print(f"out-of-scope: rows {numbers(out)}")


def marker(rows: list[dict], published: dict, after: Version | None, ledger: Path, write: bool) -> None:
    current = read_marker(ledger)
    print(f"last-read: {show(current) if current else 'none'}")
    for row in rows:
        if row["state"] in FINAL_STATES:
            print(f"ledger-row: | {', '.join(row['items'])} | `{row['surface']}` | {row['lens']} | "
                  f"{row['state']} | {row['record']} |")
    # releases.json lists every stable release between its ends, so the range
    # leaves no unread release only when it reaches back to the marker: it
    # starts at or below it, or it is the default range fetched after it.
    if current is not None and min(published) > current and after != current:
        print(f"gap: the range starts at {show(min(published))}, and releases after {show(current)} "
              "may be unread; diff the default range instead")
        print("marker: unchanged")
        return
    open_rows = [row for row in rows if row["state"] not in FINAL_STATES]
    releases = sorted(published)
    if open_rows:
        holder = min(open_rows, key=lambda row: (row["first"], row["number"]))
        print(f"open: rows {numbers(open_rows)}")
        print(f"held-by: row {holder['number']} ({holder['state']}) at {show(holder['first'])}")
        below = [version for version in releases if version < holder["first"]]
        target = below[-1] if below else None
    else:
        target = releases[-1]
    if target is None or (current is not None and target <= current):
        print("marker: unchanged")
        return
    line = (f"**Last read Codex release:** `{show(target)}` (published {published[target]}), "
            f"read on {datetime.date.today().isoformat()}.")
    print(f"marker: {show(target)}")
    if write:
        write_marker(ledger, line)
        print(f"written: {ledger}")


def check_ledger(ledger: Path, root: Path) -> None:
    """The ledger must be a regular file, or absent, inside root with no symlink on the way."""
    try:
        relative = ledger.absolute().relative_to(root.absolute())
    except ValueError:
        raise UsageError(f"ledger is outside the repository root {root}: {ledger}") from None
    current = root.absolute()
    for part in relative.parts:
        current = current / part
        if part == ".." or current.is_symlink():
            raise UsageError(f"ledger path passes through a symlink or `..`: {ledger}")
    if ledger.exists() and not ledger.is_file():
        raise UsageError(f"ledger is not a regular file: {ledger}")


def write_marker(ledger: Path, line: str) -> None:
    """Replaces the marker line, or appends one, keeping every other line and the line endings."""
    if ledger.is_file():
        with ledger.open(encoding="utf-8", newline="") as handle:
            text = handle.read()
    else:
        text = "# Codex CLI upstream ledger\n"
    eol = "\r\n" if "\r\n" in text else "\n"
    lines = text.splitlines()
    for index, existing in enumerate(lines):
        if MARKER_RE.search(existing):
            lines[index] = line
            break
    else:
        lines += ["", line]
    ledger.parent.mkdir(parents=True, exist_ok=True)
    with ledger.open("w", encoding="utf-8", newline="") as handle:
        handle.write(eol.join(lines) + eol)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=("plan", "marker"))
    parser.add_argument("--from", dest="source_dir", type=Path, required=True,
                        help="directory holding rows.json and releases.json")
    parser.add_argument("--select", help="plan only: which rows are in scope")
    parser.add_argument("--root", type=Path, help="repository root: owner lookup, and the ledger must sit inside it")
    parser.add_argument("--ledger", type=Path, help="marker only: ledger holding the read marker")
    parser.add_argument("--write", action="store_true", help="marker only: write the new marker line")
    args = parser.parse_args(argv)
    try:
        if args.command == "plan" and not args.select:
            raise UsageError("plan needs --select")
        if args.command == "plan" and (args.ledger or args.write):
            raise UsageError("--ledger and --write apply to marker only")
        if args.command == "marker" and args.select:
            raise UsageError("--select applies to plan only")
        rows, published = load(args.source_dir)
        root = args.root or repo_root()
        if args.command == "plan":
            plan(rows, published, args.select, root)
        else:
            ledger = args.ledger or root / DEFAULT_LEDGER
            check_ledger(ledger, root)
            marker(rows, published, saved_after(args.source_dir), ledger, args.write)
    except (UsageError, OSError, UnicodeDecodeError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
