# Stored Functions Implementation Notes

## Architecture Overview

- **File**: `sqls/functions.sql` — stored functions, written by hand
- **Loaded by**: `src/migrate.js`, after the `postgres-shift` migrations
- **Reloaded**: on **every** `pnpm migrate` (not versioned as a migration)

`sqls/migrations/` is versioned and each migration runs exactly once (tracked by
`postgres-shift`). Stored functions are kept out of that history: `functions.sql`
is the current source of truth and is re-executed in full on every migrate, so
editing a function and re-running `pnpm migrate` is enough to apply the change.

```
src/migrate.js
    shift({ sql, path: MIGRATIONS_PATH, ... })   # once per migration
    logger.info("Loading SQL functions")
    sql.begin(async (tx) => tx.file(FUNCTIONS_PATH))   # every run
    logger.info("SQL functions loaded")
```

This is why `sqls/functions.sql` ships in the production image (`Containerfile`
copies `sqls/`) and why `entrypoint.sh` runs `src/migrate.js` before `serve`.

## Idempotence

Because the file is reloaded on every run, it MUST be idempotent. Prefer
`CREATE OR REPLACE FUNCTION`. Use `DROP FUNCTION IF EXISTS` only when the
signature changes (argument types or return type).

A function referenced by a column `DEFAULT` cannot be dropped while the default
depends on it: PostgreSQL raises `cannot drop function ... because default value
... depends on it`. `CREATE OR REPLACE` updates the body without breaking the
dependency.

When a migration needs a function in a column `DEFAULT` before this file is
loaded, the migration creates the function first. `sqls/functions.sql` then
replaces it with `CREATE OR REPLACE`. The migration copy is a historical
bootstrap, not the source of truth.

A migration that drops or renames a table used by a function here must ship the
matching update of `sqls/functions.sql`, otherwise the next `pnpm migrate` fails
loudly at the `CREATE FUNCTION` step.

## Silencing idempotent NOTICEs

An idempotent `DROP FUNCTION IF EXISTS x` emits a
`NOTICE: function x() does not exist, skipping` when `x` is not yet present
(first load). Those NOTICEs are harmless but noisy.

`src/lib/server/pg.js` installs a pino `onnotice` hook that logs every PostgreSQL
notice at `debug` level. To keep that channel meaningful, silence the _expected_
NOTICEs at the source, scoped to the loading transaction only:

```sql
SET LOCAL client_min_messages = warning;

DROP FUNCTION IF EXISTS my_function();

SET LOCAL client_min_messages = notice;

CREATE FUNCTION my_function() RETURNS bigint
LANGUAGE sql
AS $$
    SELECT count(*) FROM contacts;
$$;
```

`SET LOCAL` applies to the current transaction only — the one opened by
`sql.begin` in `src/migrate.js` — so the value is automatically restored
afterwards. The `CREATE FUNCTION` statements still emit their own NOTICEs.
`CREATE OR REPLACE FUNCTION` does not emit this NOTICE, so the wrapper is only
needed around `DROP` statements.

Do not silence NOTICEs globally: silence the ones you expect, keep the rest.

## Adding a function

1. Uncomment/copy the template at the top of `sqls/functions.sql`.
2. Use `CREATE OR REPLACE FUNCTION`. Keep `DROP FUNCTION IF EXISTS` for
   signature changes only.
3. Wrap the `DROP`s in `SET LOCAL client_min_messages = warning` /
   `... = notice` when they would emit NOTICEs.
4. Prefer `LANGUAGE sql` over `LANGUAGE plpgsql` when the body is declarative
   (see `AGENTS.md` → Database).
5. If the function serves a page render, follow "One stored function per page
   render" below: one JSONB document, named arguments, and an index that serves
   the function's order and filters.
6. When a route calls the function directly, add the repository-relative path
   of every calling file immediately above the definition, as the last comment
   lines:

   ```sql
   -- Used by route: src/routes/(private)/contacts/+page.server.js
   -- Used by route: src/routes/(private)/contacts/[nanoid]/edit/+page.server.js
   CREATE OR REPLACE FUNCTION get_contacts_page_data(
   ```

   List every route file that calls the function: an incomplete list is a
   defect. Write each file as it sits on disk, route group and dynamic segments
   included. Do not add the comment to an internal function: a trigger
   function, a helper called by another function, and a function that no route
   renders. The route comment says who calls the function;
   `COMMENT ON FUNCTION` says what it promises.

7. Add a `COMMENT ON FUNCTION ...` describing the function.
8. Run `pnpm migrate` twice to confirm it is idempotent and silent.

The SQL layout in [`node-paradigms.md`](node-paradigms.md#sql-layout) applies to
the functions in this file too.

## Trigger functions

Prefix a trigger function with `trigger_`, then name the table, the timing and
the event, then the action: `trigger_users_before_update_set_updated_at()`. The
function lives here; the trigger that calls it is created by a migration. The
function name carries the timing and the event, so `COMMENT ON FUNCTION` is not
needed; `COMMENT ON TRIGGER` explains why the trigger exists.

## When a write becomes a function

Rule and rationale:
[ADR 004](../decisions/2026-11_004-application-architecture.md) → "The write path".

A write stays in the route handler when it is one statement with one caller. It
moves here when it removes work from the caller:

- a protocol: several statements that must commit together, or a branch that
  signals a business error;
- a document: several queries assembled into the JSON a page render needs;
- a shared statement: several callers, or another SQL function;
- a measured cost: the statement is large or hot enough that parsing and
  transferring it on every call shows up in a measurement.

A single statement that touches several tables is still one statement:
data-modifying CTEs run in the statement's transaction, so the write is atomic.
Counting tables is the wrong proxy. The test is the number of statements and the
number of callers.

An inline statement has no named arguments, so send it with a tagged template.
postgres.js prepares it, which caches the parse and the plan. Reserve
`sql.unsafe` for the named-argument call of a stored function.

When the order or the content of the statements depends on a decision computed
in JavaScript, the write may stay in the handler inside `sql.begin()`, with the
decision extracted into a pure function (`planUserSync` in
`src/lib/server/user-sync.js` is the model). The plan is applied with one
set-based statement per write category, sent as an ordered `tx.batch`. A plan
built in JavaScript does not by itself justify a stored function: the four
criteria above decide that.

## One stored function per page render

Rule and rationale:
[ADR 002](../decisions/2026-11_002-single-sql-function-per-page-render.md).

A `load` function that needs several values from the database calls **one** stored
function returning one JSONB document. The JavaScript layer decodes the payload and
does the presentation work only: page arithmetic, hrefs, formatting.

```js
const [row] = await sql.unsafe(
  `SELECT get_contacts_page_data(
        _limit => $1::int,
        _offset => $2::int
    ) AS data`,
  [PAGE_SIZE, offset],
);

const total = Number(row.data.total);
const contacts = row.data.contacts;
```

`sql.unsafe()` is required because a tagged template cannot write `_limit => $1`.
All arguments must use the named form: PostgreSQL rejects a positional argument
that follows a named one.

`sql.unsafe()` also sends an unnamed statement, which PostgreSQL always plans on
demand with the real parameter values. This matters for a function that branches on
a parameter (for example direction-guarded `UNION ALL` branches) or that depends on
an index-only count and an early-exit `LIMIT`. A tagged template is prepared under
a name by default, and PostgreSQL may switch to a generic plan after a few
executions.

Keep the JSON contract small and document it with `COMMENT ON FUNCTION`. Cast
`bigint` columns to text (`id::text`) when the JavaScript layer treats them as
strings: JSON numbers lose precision above 2^53. `timestamptz` values arrive as
strings in the server's `DateStyle` output; when a browser will call `new Date()`
on them, emit an ISO 8601 UTC string with `to_char(created_at AT TIME ZONE 'UTC',
'YYYY-MM-DD"T"HH24:MI:SS"Z"')`.

Give the function's `ORDER BY` and filters an index that serves them. For the
contacts list, `ORDER BY id LIMIT/OFFSET` walks the primary key index, so no
additional index is needed. A paginated view with a filtered or time-ordered
predicate usually needs a dedicated index.

## Relationship with schema.sql

`sqls/schema.sql` is the hand-written consolidated schema (tables, indexes,
constraints). It is a reference document, **not** executed by `pnpm migrate`.
`sqls/functions.sql` is the executable source of truth for stored functions.
