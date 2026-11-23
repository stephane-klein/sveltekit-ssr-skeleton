---
status: accepted
date: 2026-11-23
decision-makers: Stéphane Klein
ai-assistants: DeepSeek V4.1 Flash (OpenCode Go)
---

# ADR 002 — One stored SQL function (CTE + JSON) per page render

## Context and Problem Statement

A page render often needs several values derived from the same tables: a paginated
list, its total, presence flags for neighbouring periods, a lookup such as the
nearest non-empty day. Orchestrating those values from JavaScript costs one
PostgreSQL round-trip per value. A round-trip is more than network latency: the
driver serializes the parameters, the server parses and plans the statement,
executes it and serializes the result, then the client parses it back into objects.
The JavaScript orchestration also forces intermediate values to cross that boundary
and re-applies the same filters in separate statements.

On a remote deployment, network latency dominates. Locally, the repeated
parse/plan/execute cycles and result parsing still add up. The contacts page is the
first case in this skeleton: `src/routes/(private)/contacts/+page.server.js` ran two
queries in parallel, the page of contacts and the `count(*)`.

## Decision Drivers

- Reduce the number of round-trips per page render (target: one). The rule applies
  to every page, not just the first one.
- Let the planner see the whole page in one statement: one parse and one plan
  instead of N, with intermediate datasets computed once and reused across CTEs.
- Keep intermediate values inside the database: only the final JSON payload crosses
  the process boundary.
- Keep page data correct and stable: identical ordering, pagination and totals as
  before.
- Follow the project's existing stored-function pattern (`sqls/functions.sql`,
  loaded on every `pnpm migrate`).
- Keep the dynamic query parameters (pagination, filters, sort) expressible in one
  static statement.

## Considered Options

- **A. One stored SQL function per page render** — one function returning one JSONB
  payload, defined in `sqls/functions.sql`, with CTEs for the page, the total and
  the lookups.
- **B. One big inline CTE query built in JavaScript**, without a function.
- **C. Hybrid two-query approach** — keep the paginated page query dynamic in
  JavaScript and merge only the metadata into one CTE query.
- **D. Status quo** — the N-queries orchestration from JavaScript.

## Decision Outcome

Chosen option: **A. One stored SQL function per page render**.

Every page that needs several values derived from the database is served by a
single stored SQL function returning one JSONB document, built with CTEs for the
page, the total and the lookups. The JavaScript `load` decodes the JSON and applies
the presentation logic: page arithmetic, hrefs, formatting. A page render therefore
costs **one round-trip** regardless of how many values it needs.

### Conventions

- Functions live in `sqls/functions.sql`, reloaded in full at each `pnpm migrate`.
  Use `CREATE OR REPLACE`; use `DROP FUNCTION IF EXISTS` only when the signature
  changes.
- Prefer `LANGUAGE sql STABLE PARALLEL SAFE` for declarative bodies. Reserve
  `LANGUAGE plpgsql` for control flow.
- Prefix function parameters with `_` (`_limit`, `_offset`, `_from`, `_to`).
- Call the function with named-argument notation: `SELECT f(_limit => $1::int)`.
  All arguments must use the named form, because PostgreSQL rejects a positional
  argument that follows a named one.
- A tagged template cannot express `_limit => $1`, so these calls use
  `sql.unsafe(sql, params)`.
- `sql.unsafe()` sends an unnamed statement, which PostgreSQL always custom-plans.
  A function whose body branches on a parameter value, or that relies on an
  index-only count or an early-exit `LIMIT`, depends on that plan-time visibility.
  A tagged template is prepared under a name by default, and PostgreSQL may switch
  to a generic plan after a few executions.
- Cast `bigint` columns to text (`id::text`) when the payload feeds a JavaScript
  string. JSON numbers lose precision above 2^53.
- Give the function's `ORDER BY` and filters an index that serves them.
- The same rule applies to request middleware: when the session or API token
  check needs the user row, join it into the same statement instead of running a
  second `SELECT` on `users`.
- Migrations must not call functions defined here. The documented exception is a
  bootstrap copy needed for a column `DEFAULT` (`generate_nanoid` in
  `00008_contacts_nanoid.sql`); `sqls/functions.sql` then replaces it.

### First application: the contacts list

Before: two queries in parallel, one `LIMIT/OFFSET` page and one `count(*)`.
After: `get_contacts_page_data(_limit, _offset)` returns one document:

```json
{
  "contacts": [
    {
      "nanoid": "abc123def4",
      "firstname": "Ada",
      "lastname": "Lovelace",
      "created_at": "2026-11-23T15:45:00Z"
    }
  ],
  "total": 42
}
```

The route passes `PAGE_SIZE` and the computed offset, then keeps the `totalPages`
arithmetic. The `page` CTE walks the primary key index for `ORDER BY id
LIMIT/OFFSET`, so no new index is needed. The JSON aggregate carries an explicit
`ORDER BY id`: the array order is part of the contract instead of a planner detail,
and the sort covers at most `_limit` rows. `created_at` is emitted as a UTC ISO 8601
string through `to_char`, so the browser's `new Date()` parses it without depending
on the server's `DateStyle`.

### Consequences

- Good, because a page render costs one round-trip instead of two or more.
- Good, because one statement replaces several parse/plan/execute cycles and
  result-set parsings with one parse, one plan and one JSON payload to decode.
- Good, because intermediate values (here the total) stay in the database.
- Good, because the functions live in `sqls/functions.sql` and reload idempotently:
  a body edit takes effect on the next `pnpm migrate` without a new migration.
- Good, because the SQL is testable in isolation
  (`SELECT get_contacts_page_data(25, 0);`) and documents the page contract.
- Neutral, because `created_at` arrives as an ISO string instead of a `Date`; the
  component already calls `new Date(contact.created_at)`.
- Bad, because `sql.unsafe()` gives up the tagged template: placeholders and the
  parameter array must stay in sync by hand.
- Bad, because the JSON contract is not type-checked; the `COMMENT ON FUNCTION` and
  this ADR carry it.

## Pros and Cons of the Options

### A. One stored SQL function per page render

- Good, because it achieves the single round-trip goal with a testable contract.
- Good, because stored functions are already a project pattern (`generate_nanoid`).
- Bad, because of the implicit JSON contract and the manual placeholder/parameter
  pairing in `sql.unsafe()`.

### B. One big inline CTE query in JavaScript

- Good, because no function is needed.
- Bad, because the giant query would live in the route layer, harder to test in
  isolation than a function.
- Bad, because the full SQL text crosses the network and is parsed on every call,
  whereas a stored function call transmits only a short reference and its body is
  parsed once at creation.

### C. Hybrid two-query approach

- Good, because the dynamic page query stays index-optimal.
- Bad, because it keeps two round-trips and still orchestrates from JavaScript.

### D. Status quo

- Good, because already implemented and correct.
- Bad, because it issues two round-trips for the contacts page, and more on a page
  that needs presence flags or lookups.

## More Information

- `sqls/functions.sql` — the function definitions, loaded at the end of every
  migration run.
- `src/routes/(private)/contacts/+page.server.js` — the first application.
- [`docs/agents/sql-functions.md`](../agents/sql-functions.md) — loading,
  idempotence and the page-render call pattern.
- Source doctrine:
  [toggl-pg-mirror commit 929f7cb](https://github.com/stephane-klein/toggl-pg-mirror/commit/929f7cb2b20c7e590d215c24e56a1153c7a5f1f4).
