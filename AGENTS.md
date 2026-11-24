# Agent Instructions

## Project Context

Skeleton gathering standard components configuration for SvelteKit web application projects.

## Language Policy

- **All project content must be in English**: source code, comments, commit messages, and documentation.
- **Human conversations in OpenCode remain in French**.

## Package Manager Policy

- Always use `pnpm` for installing, adding, and removing packages.
- Never use `npm` or `yarn`.

## Code Quality

This project uses **ESLint** with `eslint-plugin-svelte` for linting and
**Prettier** with `prettier-plugin-svelte` for formatting:

- `pnpm lint` — check for code issues
- `pnpm format` — auto-format code
- `pnpm check:agents` — check the agent documentation invariants
- `pnpm check` — run all checks (agent docs, format, lint)

Configuration: `eslint.config.js`, `prettier.config.js`

## Database

This project uses **PostgreSQL** as its database, accessed directly with raw SQL — **no ORM**.

SQL queries are executed using the [`postgres`](https://github.com/porsager/postgres) library (package name: `postgres`).

Migrations are managed by [`postgres-shift`](https://github.com/porsager/postgres-shift) and located in `sqls/migrations/`.

The complete schema (consolidated) is written by hand in `sqls/schema.sql`.

Stored functions live in `sqls/functions.sql`, which is **reloaded in full on every
`pnpm migrate`** (outside the versioned migration history). Keep it idempotent:
prefer `CREATE OR REPLACE FUNCTION`; use `DROP FUNCTION IF EXISTS` only when the
signature changes, because a function referenced by a column `DEFAULT` cannot be
dropped while the default depends on it. See
[`docs/agents/sql-functions.md`](docs/agents/sql-functions.md).

When adding stored functions, prefer pure `LANGUAGE sql` over `LANGUAGE plpgsql`
whenever the body is declarative (a plain sequence of DML/SELECT statements, no
control flow). Reserve `LANGUAGE plpgsql` for functions that genuinely need
procedural features: `IF`, loops, `RAISE EXCEPTION`, dynamic SQL (`EXECUTE`), or
`SELECT ... INTO` variables.

Every page render that needs several values from the database must be served by a
single stored SQL function returning one JSONB document built with CTEs — one
round-trip per render. See
[`docs/decisions/2026-11_002-single-sql-function-per-page-render.md`](docs/decisions/2026-11_002-single-sql-function-per-page-render.md).

Call a stored function with PostgreSQL's named-argument notation:

```sql
SELECT get_contacts_page_data(
    _limit => $1::int,
    _offset => $2::int
)
```

All arguments must use the named form — PostgreSQL rejects a positional argument
that follows a named one. A tagged template cannot express this notation, so these
calls use `sql.unsafe(sql, params)`. `sql.unsafe()` sends an unnamed statement,
which PostgreSQL always custom-plans; a function whose body branches on a
parameter value, or that relies on an index-only count or an early-exit `LIMIT`,
needs that plan-time visibility.

### Database cursors

`pg.js` records query durations through the `postgres:query` diagnostics
channel, so every query is measured: tagged templates, `unsafe()`, `file()`,
`forEach()`, `cursor(rows, fn)` and the async iterator form
(``for await (const rows of sql`...`.cursor())``).

For batched processing, return `sql.CLOSE` from the `cursor(rows, fn)` callback
to stop early.

## Example / Scaffolding Files

The following files are examples meant to be replaced with your actual project code:

- `sqls/migrations/00001_initial.sql` — example migration (creates a sample `contacts` table)
- `sqls/seeds/00001_contacts.sql` — example seed data
- `sqls/seeds/00002_users.sql` — demo account (`alice@example.com` / `password123`)
- `sqls/schema.sql` — example consolidated schema

These files are marked with comments (`-- Example`) at the top. Replace or remove them as needed.

> **Remove this entire section once the example files have been replaced or deleted.**

## SvelteKit

This project uses **SvelteKit 2** with `@sveltejs/adapter-node` for SSR.

### Standalone endpoints and authentication

Endpoints under `(api)/` — and any other `+server.js` route outside the
`(private)` group — are **not** covered by the `(private)/+layout.server.js`
guard. Every handler that requires an authenticated user must call
`requireUser(event)` from `#lib/server/require-user.js` before doing any work:

```js
const authError = requireUser(event);
if (authError) return authError;
```

`requireUser` returns either a `401` `application/problem+json` response (built
by `#lib/server/problem.js`) or `null`. Do not hand-roll the `event.locals.user`
check inline.

### Library code layout

Library code is split by where it is allowed to run:

- `src/lib/server/` — **server-only** code (DB access via `postgres`, auth,
  mailer, `node:` APIs, `process.env`, secrets, ...), imported via
  `#lib/server/...`. SvelteKit enforces this at build time: its
  `vite-plugin-sveltekit-guard` throws
  `Cannot import $lib/server/... into code that runs in the browser` if a client
  entrypoint (a Svelte component, a universal `load`, a client/universal hook)
  imports one. This is a security guarantee — never place server-only code
  anywhere else.
- `src/lib/shared/` — **pure / isomorphic** modules (no Node, DB, or environment
  access) needed from BOTH the server and client Svelte components, imported via
  `#lib/shared/...`. If a module has to be importable by a client component, it
  must be pure (no `node:` imports, no DB, no `process.env`) and belong here.
- `src/lib/client/` — **client-only** Svelte components, imported via
  `#lib/client/...`.

`src/lib/backend/` is **forbidden**: it no longer exists, never create it and
never import from it. When adding a new module, decide its home up front:
server-only → `src/lib/server/`, isomorphic/pure → `src/lib/shared/`,
client-only component → `src/lib/client/`.

### Container build (multi-stage)

The `Containerfile` uses a two-stage build:

1. **Stage 1 (`build`)** — installs all deps, runs `pnpm build`
2. **Stage 2 (production)** — installs only prod deps, copies `build/`, `src/`, `sqls/`, and `entrypoint.sh`

The production image runs `node /app/build/index.js` via the `serve` command in `entrypoint.sh` (which also runs migrations before starting the server).

## Node.js Paradigms

These rules apply to every `.js` file and to the `<script>` blocks of `.svelte`
files, except where Svelte runes require an assignment.

Before writing or refactoring JavaScript, read `docs/agents/node-paradigms.md`.
It holds the before/after examples, the approved exceptions and the review
questions.

### Rules

1. **Compose instead of looping.** Use `.map()`, `.filter()`, `.reduce()` or
   `.flatMap()` when the loop builds a new value. Keep `for` only when the
   sequence is the point: a retry with early exit, SQL statements inside a
   transaction, a stream read.
2. **Do not mutate.** Do not push into an accumulator that `map()` or `flatMap()`
   can build. Do not reassign a row returned by the database. Do not increment a
   counter that `filter().length` can derive.
3. **Name what you bind.** Prefer `getMonths().map(...)` to
   `const months = getMonths(); months.map(...)`. A binding earns its place when
   its name carries meaning, not when it shortens a line.
4. **Name every callback argument.** Write `map((n) => add1(n))`, never
   `map(add1)`.
5. **Separate the decision from the effect.** When a function decides and writes
   in the same place, extract the decision into a pure function and test it.
   `planApiTokenChange()` in `src/lib/server/api-token-sync.js` is the model.
6. **Inline trivial logic.** Prefer an inline expression to a helper that wraps
   one call. Extract a function when it is reused, when it names a step, or when
   it makes the code testable.

Approved exceptions are listed in `docs/agents/node-paradigms.md`. Do not "fix"
them.

### Import naming

When a module exports a generic name (`runWithMetrics`, `summarize`) that only
makes sense in its domain, rename it at the import site:

`import { runWithMetrics as runWithPgMetrics } from "#lib/server/pg-metrics.js";`

### Definition of done

`pnpm check` and `pnpm test` pass. For a refactor, the diff changes no observable
behavior.

## OpenAPI Spec Sync

The OpenAPI specification is dynamically generated in
`src/routes/(api)/api/v1/openapi.json/+server.js`.

**Any change to request/response schemas in route handlers must be reflected
here too.** The Scalar API reference UI at `/api/reference` consumes this spec.

## i18n — Paraglide JS

This project uses **Paraglide JS** (`@inlang/paraglide-js`) for
internationalization.

- Translation files: `messages/en.json` and `messages/fr.json`
- Usage in Svelte components:
  ```svelte
  <script>
    import { m } from "#lib/paraglide/messages.js";
  </script>

  <h1>{m.welcome_title()}</h1>
  ```

**Whenever you create or modify a page/component with user-facing text:**

1.  Add all new keys to `messages/en.json` (English source) and `messages/fr.json`
    (French translation)
2.  Replace hardcoded strings with `{m.key_name()}` calls
3.  Run `pnpm build` to regenerate the compiled message functions in
    `src/lib/paraglide/`

Key naming convention: use prefix per page/section (e.g., `login_title`,
`login_email_label`, `dashboard_welcome`).

**Implementation details** (cookie management, AsyncLocalStorage nesting, httpOnly
pitfall, email templates, login flows): see `docs/agents/i18n.md`.

**Architecture decision**: see [`docs/decisions/2026-07_001-paraglide-i18n.md`](docs/decisions/2026-07_001-paraglide-i18n.md).

## Supplementary Documentation

Agent knowledge is split into three layers: `AGENTS.md` for always-on rules,
`.agents/skills/` for procedures, and `docs/agents/` for reference. Architecture
decisions live in `docs/decisions/`. See
[`docs/agents/agent-documentation.md`](docs/agents/agent-documentation.md).

- [`docs/agents/`](docs/agents/) — operational snapshots of subsystems (loaded on demand by the agent)
- [`docs/decisions/`](docs/decisions/) — architecture decision records
- [`.agents/skills/new-decision/`](.agents/skills/new-decision/) — skill for creating new decision records
- To change the agent configuration, load the `agent-config-change` skill.

## Documentation Maintenance

Remove from this file any section or reference that becomes obsolete after file deletions or structural changes. Keep AGENTS.md up to date.
