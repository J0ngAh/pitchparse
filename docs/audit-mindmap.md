# Code Audit Mindmap

Persistent memory for the code-auditing skill. Updated after each audit run.
Each run overwrites the metrics section but appends to insights.

## Last Run
- **Date**: 2026-03-13 (run 21)
- **Project**: fh-challenges (Pitch|Parse)

## Metrics Snapshot
> Overwritten each run with current state.

| Gate              | Status | Detail |
|-------------------|--------|--------|
| Type Check (web)  | PASS   | tsc --noEmit clean |
| Type Check (api)  | PASS   | mypy clean, 37 source files |
| Lint (web)        | PASS   | ESLint clean |
| Lint (api)        | PASS   | ruff check clean (37 files) |
| Format (web)      | PASS   | Biome — 88 files clean |
| Format (api)      | PASS   | 37 files formatted |
| Build (web)       | PASS   | Next.js Turbopack clean |
| Tests (pytest)    | PASS   | 166 passed |
| Tests (vitest)    | PASS   | 31 passed (3 suites) |
| Security (api)    | PASS   | pip-audit -r requirements.txt clean |
| Security (web)    | PASS   | npm audit clean |
| Project Rules     | WARN   | hardcoded-strings (16, legal pages), click-keyboard (2, false positives) |
| CI Replication    | PASS   | All CI steps pass |

**Violation Count**: 0 (after fixes)
**Total Hits**: 0

## Trends
> Append after each run: date, violation count, direction.

- 2026-03-11: 12 violations (first run, baseline)
- 2026-03-11 (run 2): 7 violations (down from 12, 42% improvement)
- 2026-03-11 (run 3): 0 violations (down from 7, all fixed)
- 2026-03-11 (run 4): 72 violations (up from 0, major regression after feature work)
- 2026-03-11 (run 5): 0 violations (down from 72, all fixed via parallel sub-agents)
- 2026-03-12 (run 6): 5 violations (up from 0, lint E501 x2 + format x3), fixed immediately
- 2026-03-12 (run 7): 1 violation (function length), fixed immediately — all infra gaps closed
- 2026-03-12 (run 8): 0 violations (stable from run 7, all gates pass)
- 2026-03-12 (run 9): 0 violations (stable, 2 consecutive clean runs)
- 2026-03-12 (run 10): 0 violations (stable after fix — test regression from data cleanup fixed, 3 consecutive clean runs)
- 2026-03-12 (run 11): 2 violations (up from 0 — parser.py crossed 500-line limit, _run_generation() exceeds 50-line limit)
- 2026-03-12 (run 12): 0 violations (fixed — report functions extracted to lib/reports.py, _generate_one() extracted from _run_generation())
- 2026-03-12 (run 13): 1→0 violations (analyzer.py 519→432 lines — report gen functions extracted to lib/reports.py)
- 2026-03-12 (run 14): 10→0 violations (new api/ backend had 9 oversized functions + 1 in app/ — all split into helpers, CI extended to cover api/)
- 2026-03-13 (run 15): 0→23 violations (up — mypy api/ fails: 3 supabase attr-defined errors, 19 anthropic **kwargs type errors, 1 raise-None error)
- 2026-03-13 (run 16): 23→267 violations (up — mypy exploded to 261 errors as more routers checked, 4 ESLint purity errors new, 1 format issue, 2 oversized functions, tests dropped to 0)
- 2026-03-13 (run 17): 267→17 violations (94% reduction — mypy 261→0 fixed, ESLint 4 errors→0, format fixed, 150 tests now passing; new: 8 TS literal type errors in test, 4 oversized Inngest functions)
- 2026-03-13 (run 18): 17→0 violations (all gates PASS — first fully clean audit since run 10)
- 2026-03-13 (run 19): 0 violations (stable — 2 consecutive clean runs, vitest gate now tracked)
- 2026-03-13 (run 20): 0→19→0 violations (RBAC feature regressed: 5 mypy errors in new team.py/admin.py, 14 test failures from missing `role` in mock fixtures — all fixed in-audit)
- 2026-03-13 (run 21): 0→4→0 violations (regressed: missing checkbox component broke tsc+build, mypy arg-type in dashboard.py, 1 Biome format issue — all fixed in-audit)

## Persistent Insights
> Append-only. Patterns, recurring issues, and observations that help future audits.
> Delete entries that are no longer relevant.

- Quality infrastructure now in place: ruff (lint+format), mypy (blocking in CI), CI workflow
- 2026-03-11 (run 5): Major refactor — app.py split into app.py (131 lines), lib/styles.py (28), lib/home.py (73), styles/theme.css. charts.py reduced 545→434. parser.py reduced 513→496. analyzer._ensure_frontmatter split into 3 helpers.
- 2026-03-11 (run 5): CI mypy step now blocking (removed || true), types-PyYAML added to requirements-dev.txt
- parser.py reduced from 510→453 lines by extracting _extract_html_meta + load_all_reports into new lib/reports.py (65 lines)
- 2026-03-12 (run 7): analyzer._extract_analysis_fields() split into _extract_score(), _extract_rating(), _extract_participants(). pip-audit + pre-commit hooks added. Security audit step added to CI.
- 2026-03-12 (run 8): Full-env pip-audit shows 31 system-package vulns; CI-scoped scan (pip-audit -r requirements.txt) passes clean. Recommend venv isolation to reduce noise.
- 2026-03-12 (run 14): New api/ backend added. CI extended to cover api/ (lint, format, type check, security).
- 2026-03-13 (run 15): mypy api/ reveals 23 errors: supabase SDK lacks proper type stubs, anthropic union types need narrowing.
- 2026-03-13 (run 16): mypy errors exploded 23→261 as supabase-py SDK returns untyped `APIResponse.data` (JSON union type). Every dict indexing on `.data` produces errors. Root cause is lack of type stubs for supabase-py, not actual bugs. Need typed helper wrappers or `cast()`. Legacy app/ tests (112) deleted without replacement — api/ has zero test coverage. ESLint react-hooks/purity rule now catches Math.random() in render. Project rules checker flagged violet/font imports as violations but these are intentional design system choices (false positives — should be added as known exceptions). tsc --noEmit missing from CI workflow.
- 2026-03-13 (run 17): Massive recovery — mypy fixed (261→0), 150 pytest tests added, ESLint errors cleared, format fixed, CI passes. Remaining: `tsc --noEmit` still not in CI (would catch 8 TS errors in constants.test.ts). Inngest functions are inherently step-based and tend to be long — may need known exception for orchestration functions. `#features` anchor href flagged as hardcoded hex is a false positive.
- 2026-03-13 (run 18): First fully clean audit (0 violations) since run 10. TSC errors resolved (8→0). CI gaps remain: pytest, npm audit, and vitest not in CI workflow. sidebar.tsx (723 lines) is shadcn/ui generated — acceptable exception. No web formatter (Prettier/Biome) configured.
- 2026-03-13 (run 19): CI now includes pytest, vitest, npm audit, and tsc --noEmit — all gaps from run 18 closed. Vitest gate added to audit tracking (31 tests, 3 suites). Still no web formatter (Prettier/Biome). Next.js warns about dual lockfiles (root + web/).
- 2026-03-13 (post-19 fixes): Biome formatter added for web/ (formatting-only, ESLint handles linting). Pre-commit hooks extended with biome-format, eslint, and tsc for web/ files. Next.js turbopack.root configured to suppress dual-lockfile warning. Inngest PydanticDeprecatedSince20 warning suppressed in pytest filterwarnings (upstream unfixed in v0.5.18, no GitHub issue exists, `class Config` still in comm_lib/models.py). CI format:check step added for web/.
- 2026-03-13 (run 20): RBAC feature (commit 74d9f7b) added `role` field to auth but didn't update test fixtures. Pattern: new fields in `get_current_user` return dict must also be added to `conftest.py:mock_user`. `MockSupabaseChain` enhanced with `_set_table_data()` for per-table mock data — needed for multi-query flows like signup (invitations check → org insert). `admin.py` used `count="exact"` string but postgrest SDK requires `CountMethod.exact` enum (`from postgrest import CountMethod`). `team.py` chained `.update().eq().select()` but `SyncFilterRequestBuilder` doesn't support `.select()` — split into separate update + select queries. mypy cache can mask/reveal errors — always clear `.mypy_cache` when debugging type check discrepancies.
- 2026-03-13 (run 21): Recurring pattern — new features adding shadcn components without running `npx shadcn add` first. `dashboard.py` RPC call returns untyped JSON union from supabase; `isinstance` guard needed before `**` unpacking. Test count grew 150→166 (+16 new tests). Hardcoded strings in legal pages (terms, privacy) are acceptable — not worth extracting to constants. Click-keyboard warnings on wrapper divs containing buttons are false positives.

## Known Exceptions
> Violations that have been reviewed and deemed acceptable.
> These should be skipped or downgraded in future audits.

- **Violet/purple colors**: Signal design system intentionally uses violet (#8B5CF6) as secondary color per CLAUDE.md — `no-purple-gradients` rule is a false positive
- **Font imports (Inter, Space Grotesk)**: These are the design system fonts defined in CLAUDE.md — `no-forbidden-fonts` rule is a false positive
- **sidebar.tsx (723 lines)**: shadcn/ui generated component — not hand-written code, file size rule does not apply
- **Inngest PydanticDeprecatedSince20 warning**: Upstream issue in inngest v0.5.18 (`comm_lib/models.py` line 38 uses `class Config:` instead of `ConfigDict`). No fix exists as of 2026-03-13, no GitHub issue filed. Suppressed via pytest `filterwarnings`. Re-check on inngest version upgrades.
