---
name: sync-codebase-map
description: Update .claude/codebase-map.md to reflect changes introduced on the current feature branch.
---

# sync-codebase-map

Keep `.claude/codebase-map.md` accurate after a feature branch lands. Run this at the end of each feature branch before merging to `dev`.

## Steps

1. **Discover changed files**
   Run `git diff dev...HEAD --name-only` to list every file changed on this branch relative to `dev`.
   If the branch is already on `dev`, run `git diff main...HEAD --name-only` instead.

2. **Read changed files**
   Read each changed source file in full.

3. **Map changed files to sections**
   Use this table to decide which sections of `.claude/codebase-map.md` need updating:

   | Changed file pattern | Sections to update |
   |---|---|
   | `src/engine/state.js` | State shape, Constants overview, Key formulas |
   | `src/engine/tick.js` | Tick logic (per-tick and daily) |
   | `src/engine/milestones.js` | Milestone tracks table |
   | `src/engine/missions.js` | File inventory — missions row |
   | `src/engine/save.js` | File inventory — save row |
   | `src/tabs/*.js` | Tabs table — row for that tab's exports and handlers |
   | `src/ui/render.js` | File inventory — render row; Data flow diagram if render chain changed |
   | `src/ui/histograms.js` | File inventory — histograms row |
   | `src/ui/style.css` | Invariants — only if color coding or scoping rules changed |
   | `server/**` | Backend table |
   | `index.html` | Entry & boot table |
   | `src/main.js` | Entry & boot table; State shape migrations if new migrate block added |
   | `CLAUDE.md` | Pending features — strike through completed items, add newly listed ones |

4. **Edit only affected sections**
   Use the Edit tool to update each stale section. Do not rewrite unrelated sections.
   - For state shape: update the tree to reflect new fields, removed fields, or renamed fields.
   - For constants: add new keys, remove deleted ones, update descriptions if semantics changed.
   - For formulas: update the formula block if the math changed.
   - For tick logic: update the numbered sequence if new functions were added or order changed.
   - For milestone tracks: update rows, thresholds, or effects that changed.
   - For pending features: move completed items to strikethrough or remove them; add new TODO stubs.
   - For file inventory / tabs table: update the "Key exports" or "Role" column for each changed file.

5. **Update invariants if needed**
   If the branch introduced a new hard rule (a new state constraint, a new color, a new persist-after-write site), add it to the Invariants section.

6. **Report**
   List which sections were updated and why (one line each). If no changes were needed, say so explicitly.

## What NOT to change

- Do not touch sections whose source files were not modified on this branch.
- Do not reformat or reorder unchanged rows.
- Do not alter `null` constant entries — those are intentionally untuned.
