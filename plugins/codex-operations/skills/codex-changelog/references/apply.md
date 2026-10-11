# Apply: rows file, scope gate, hand-off, ledger, and marker

`apply` acts on the decision rows `diff` saved. `scripts/apply_plan.py` does
the parts that have one right answer: row checks, row numbering, the scope
selection, grouping rows by owner, and how far the marker may move. The
judgment (which rows fit a session, what each edit is) stays with the user and
the agent. `apply_plan.py --help` lists every flag and output line.

## Rows file

`diff` writes its rows to `rows.json` in its `--out` directory, beside the
`releases.json` that `fetch --out` wrote. One object per row:

| Field | Value |
| --- | --- |
| `surface` | Repository-relative path of the owner surface |
| `lens` | `correct`, `replace`, or `adopt` (notes and skips are not rows) |
| `items` | Item ids, `<version>-<NNN>`, all inside the fetched range |
| `sentence` | The required sentence from [classification-rubric.md](classification-rubric.md) |
| `size` | `fits` (default) or `large` |
| `state` | `pending` (default), `applied`, `declined`, `deferred`, or `filed` |
| `record` | The PR or issue, or for `declined` and `deferred` the reopen condition |

The script refuses a row without its sentence, an item id outside the range,
a path that leaves the repository, and a final state with no record.

## Reusing a saved working set

Reuse `rows.json` only when `diff` wrote it in this session for the same range
and the repository has not changed since (`git status` and `HEAD` match what
`diff` saw). Otherwise run `diff` again. Before acting on a reused row, check
that its owner path exists and still states what the sentence says; re-derive
a row that fails.

## Scope gate

1. Run `apply_plan.py plan --from <dir> --select all` and show its numbered
   rows with each row's sentence.
2. Ask which rows are in scope: `all`, a lens, row numbers, or ranges, for
   example `correct,4,6-7`.
3. Propose a size per in-scope row. A row **fits** when its edits stay in one
   owner and one session can make and verify them. It is **large** when it
   redesigns a component, spans several owners, or cannot be finished and
   verified here. Show the sort and let the user move a row across; write the
   result into `size`.
4. Run `plan` again with the user's selection. Its `group:` lines are the
   branches to make, its `file:` line the issues to draft, `done:` the rows
   already final, and `out-of-scope:` the rest.

A row left out of scope stays `pending` and holds the marker, unless the user
declines it; then set `declined` with the reopen condition the user gives.

## Hand-off

- **Each `group:` line** is one branch and one pull request in that owner (a
  plugin root, or `.` for the rest of the repository). Before editing, read
  the repository's `AGENTS.md` chain and conventions for branches, commits,
  versions, changelogs, and pull requests, and follow them. Make the edits, run
  the repository's own validation, and commit only the paths the rows name.
  Push and open the pull request with the user's own `git` and `gh`; those are
  network writes, so they run under the user's Codex approval settings. When
  `gh` is missing or unauthenticated, or the user declines, stop at the local
  branch and report it. Set a row `applied`, with the PR URL, only after its
  pull request merges; until then it stays `pending`.
- **The `file:` line** covers large rows and every `replace` row. A `replace`
  row is never edited here: whether to retire a component is a separate
  decision. Draft one issue per row with its owner surface, lens, sentence,
  item ids, and range; list the batch; and create the issues with `gh issue
  create` only after the user confirms that batch. Set each created row
  `filed` with the issue URL. A row the user does not confirm is reported and
  stays `pending`.
- **Docs-lag pairs** are reported, never turned into rows or issues by `apply`.

## Ledger and marker

The ledger (default `docs/upstream/codex-cli.md`) holds the marker line and a
`## Decisions` table, one row per final decision:

```markdown
| Items | Owner surface | Lens | Outcome | Record |
| --- | --- | --- | --- | --- |
```

`apply_plan.py marker --from <dir>` prints a `ledger-row:` line for every row
in a final state; add the ones not yet in the table. It then prints how far
the marker may move: to the newest release in range when every row is final,
otherwise to the release just below the earliest release any open row cites
(`held-by:`), or `unchanged` when that is not past the current marker. With
`--write` it sets the marker line and leaves the rest of the ledger as it was.
Never edit the marker by hand past what the script prints.

The ledger update is its own branch and pull request, made last, that names
the pull requests and issues the run produced. When every row is still open
the marker does not move, and the ledger change is only the new Decisions rows,
if any.

A later `diff` reads the Decisions table: an item id recorded there is a note
"recorded in the ledger" unless the row's reopen condition is met.
