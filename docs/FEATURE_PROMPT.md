# Feature Build Prompt

Give the agent everything below (repo checked out, Bun installed), then fill in the
**Feature request** section at the end. One feature per run — split big requests into
several prompts rather than one mega-prompt.

---

You are building a new feature for **heavy-duty**, a self-hosted, single-user training
log (TanStack Start + React 19, Vite, Tailwind v4, SQLite via `node:sqlite`, zod, Bun).
Before writing any code, read `README.md` in full and skim the files in the reference
map below. This repo is the standard for how features here are designed — match its
patterns exactly; do not introduce new conventions.

## Non-negotiables

- Single lifter: no accounts, no auth, no multi-user anything, no telemetry.
- All state lives in one SQLite database. Weights are **stored in kg**; the kg/lb
  toggle only converts display and input. Keep values in their stored form.
- Schema changes are migrations: append to `MIGRATIONS` in `src/server/db.ts`, tracked
  by `PRAGMA user_version`. Never edit a shipped migration; never break or lose data
  already in an existing database. Seeding stays idempotent.
- No new dependencies unless the feature is genuinely impossible without one — say so
  explicitly if you think it is needed, and wait for approval.
- No settings, options, or flexibility nobody asked for. Build the smallest version of
  the feature that fully does the job; name anything you deliberately left out.
- The app must stay usable on a phone in the gym: responsive layout, inputs with real
  labels (the e2e suite locates by role and label).

## Reference map — copy these patterns

| Concern | Where | What to imitate |
| --- | --- | --- |
| Server functions | `src/server/api.ts` | `createServerFn({ method }).validator(zodSchema).handler(...)`; thin handlers that call the repo |
| Input validation | `src/server/schemas.ts` | one zod schema per operation, reused by both API and tests |
| Persistence / SQL | `src/server/repo.ts` | all SQL lives here; api.ts never touches the DB directly |
| Migrations & seeding | `src/server/db.ts`, `src/server/seed-data.ts` | append-only `MIGRATIONS`, idempotent inserts, auto-run at startup |
| Pure logic | `src/lib/` (dates, units, progression, labels) | anything testable without a DB belongs here as a pure function |
| UI | `src/components/`, `src/routes/` | file-based routes; reuse `src/components/ui/*` (button, card, dialog, field…) before writing new markup |
| Unit tests | `tests/unit/*.test.ts` | Vitest, pure functions and schemas only |
| Integration tests | `tests/integration/repo.test.ts` | temp dir via `mkdtempSync`, set `DATABASE_PATH` **before** dynamically importing db/repo, wipe rows in `beforeEach`, close in `afterAll` |
| E2E tests | `e2e/heavy-duty.spec.ts`, `e2e/helpers.ts` | role/label locators; `data-*` attributes as test hooks for state (see `data-save-state`); put reusable steps in `helpers.ts` |
| Determinism | `tests/setup.ts`, `playwright.config.ts` | everything runs in UTC and en-GB; derive dates in UTC, never local time |

## Process — follow this order

1. **Restate** the feature in 2–3 sentences, then list every file you will touch or
   create and why (including tests). If the request is ambiguous in a way that changes
   what you would build, ask one question; otherwise proceed with the smallest
   reasonable interpretation and state it.
2. **Tests first** for the new logic: failing unit tests for pure functions, failing
   integration tests for repo/DB behavior. Mirror the existing test files' structure.
3. **Implement** in dependency order: `schemas.ts` → `repo.ts` → `api.ts` → `src/lib` →
   components/routes. Keep handlers thin; keep SQL out of handlers.
4. **E2E**: add a spec (or extend the existing one) covering the user-visible flow,
   including at least one edge case worth catching (empty state, boundary value, or
   error path — whatever is most likely to break).
5. **Gates**: `bun run test:all` must pass (typecheck + lint + unit + integration + e2e).
6. **Manual verification**, both ways:
   - `bun run dev`, then click through the happy path and one edge case in the browser.
   - `docker compose up -d --build`, confirm the same flow works in the container, and
     if you touched the schema: confirm an **existing** database (old volume) still
     starts and its data survives, plus a fresh volume seeds correctly.
7. **Docs**: update `README.md` (Features list, Project structure, Configuration table
   if a new env var exists). Update `.env.example` only if a new variable is added.
8. **Report**: what changed file-by-file, which tests prove it, what you deliberately
   did not build, and anything the user must know (data migration caveats, manual
   steps).

## Definition of done — tick every box before calling it finished

- [ ] Plan presented: files touched, migration yes/no, new env var yes/no
- [ ] Unit tests added for any new pure logic (`tests/unit/`) and passing
- [ ] Integration tests added for any repo/DB change (`tests/integration/`) and passing
- [ ] E2E test covers the user-visible flow plus one edge case
- [ ] `bun run typecheck`, `bun run lint`, `bun run test:all` all pass locally
- [ ] Manual pass on `bun run dev`: happy path + one edge case
- [ ] Docker pass: `docker compose up -d --build`; existing-data upgrade verified if schema changed
- [ ] README (and `.env.example` / CI workflow, only if applicable) updated
- [ ] No new dependencies without explicit approval; no unused code left behind
- [ ] Final report delivered per step 8

## Feature request

[PASTE THE FEATURE REQUEST HERE — what it is, who uses it, and the acceptance criteria]
