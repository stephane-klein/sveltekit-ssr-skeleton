# Application Architecture

## Which applications this document covers

The architecture described in this document is suited only to data-management
web applications, CRUD in the broad sense. In simple terms, they read rows from
a relational database and display them in HTML pages, write HTTP POST data back
to the database, and let the user navigate from one page to another through
URLs.

It is not suited to applications such as a spreadsheet, a text processor,
Blender, a web browser, a database engine or a compiler.

## The one rule

**The label must be true.** The URL names a page, the route directory mirrors the
URL, the table names the data, the function names the operation. When a label and
the behaviour diverge, that is a defect even when the code works. SvelteKit was
chosen for this: its file-based routing maps `src/routes/` to the URLs, so the
route tree is the URL map.

The rule applies at four scales, and each one has the same test:

| Scale     | Label                        | Test                                                          |
| :-------- | :--------------------------- | :------------------------------------------------------------ |
| URL       | The page the user asks for   | Does the route directory match the URL?                       |
| Route     | The file that serves the URL | Is the handler short enough to read in one pass?              |
| Data      | The table and its columns    | Does the name describe the stored fact?                       |
| Operation | The SQL function             | Does the name and signature predict the tables it may modify? |

A label that promises less than it does, or more than it does, is a defect. The
worst labels are the vague ones (`process`, `handle`, `manage`, `check`): they
cannot be contradicted because they promise nothing.

## Rendering

Pages are server-rendered ([SSR](https://svelte.dev/docs/kit/glossary#SSR)) and
hydrated on the client
([hydration](https://svelte.dev/docs/kit/glossary#Hydration)). The server sends the
HTML and the page payload; Svelte hydrates the page. The page is not a client-side
SPA that calls a generic API to assemble itself.

A page load runs on the server (`+page.server.js`), calls its stored function,
and returns the data the page needs. The browser receives HTML and hydrates it;
it does not fetch the page data through the public API.

## What this is not

The architecture is defined as much by what it refuses as by what it keeps. The
rejected patterns are not a matter of taste: they solve coordination and testing
problems this project does not have, and each one adds an indirection that the
reader pays on every page.

- **Clean Architecture** — use cases, entities, interface adapters, frameworks
  and drivers. Dependencies point inward, and a page is spread across four
  layers.
- **Hexagonal Architecture / Ports and Adapters** — a port and an adapter for
  each boundary. The database becomes an implementation detail behind a
  repository, and the SQL leaves the page.
- **Tactical Domain-Driven Design** — entities, value objects, aggregates,
  repositories, domain services, domain events. The model lives in classes, and
  the database becomes a persistence detail.
- **Layered architecture** — controller, service, repository, DTO, mapper.
- **Dependency injection** — a container wires objects that a direct import
  could name.
- **Database mock** — a test double that verifies the mock, not the SQL.

The signal is an interface with a single implementation. It exists to be mocked,
not to be substituted. In a project this size, the second implementation never
arrives, and the indirection stays.

The counterpoint is honest: these patterns buy coordination on a large team and
fast unit tests for rules that are pure functions. This project is a small
monolith with few rules. When a second implementation actually appears, the
interface can be introduced then. YAGNI applies to architecture too.

## Accepted abstractions

The refusal above targets generic architectures and local indirections, not
every dependency. A library, a tool or a service with one precise purpose is
acceptable when it lives in its own repository and someone else takes care of
it.

The criteria:

- one precise functional objective, not a whole application architecture;
- its own repository, its own maintainers, its own release cycle;
- careful documentation and real traction: evidence that someone maintains it,
  not proof that it fits;
- a small boundary: the page flow stays URL → route → SQL function → database
  schema, and the library is called at the edge;
- the library does not hide the artifact that runs. Melange is acceptable
  because it compiles to SQL functions in the schema; an ORM is not because it
  generates SQL you do not read;
- the capability is not the project's differentiator, or it is too complex to
  maintain alone.

Examples: [Temporal](https://github.com/temporalio/temporal) for durable
workflows, [Melange](https://melange.sh/) for Zanzibar-style authorization
compiled into SQL functions. Both solve one problem and leave the application
structure alone.

The counter-example is a generic framework such as [NestJS](https://nestjs.com/):
it brings modules, dependency injection and an architecture with it. The test is
who calls whom. A library is called by your code; a framework calls your code and
imposes a structure. A second test is the boundary: does it solve one problem at
the edge, or does it reorganize the pages and the writes?

Traction is a heuristic, not a guarantee. A popular library can still be a bad
fit. The decision remains per project, and the boundary must stay small enough
to remove the library later.

The operational criterion for a dependency is in [Dependencies](#dependencies).

## Reading the application

Always in this order:

1. The URL or the navigation link.
2. The route file (`src/routes/.../+page.server.js` or `+server.js`), which stays
   short.
3. The stored function it calls, if any, in `sqls/functions.sql`.
4. The schema: `\d+ table` for the columns, constraints, indexes and comments.
5. `\df+` for the function list and its contract.

Page reads follow the one-function-per-page-render rule in `AGENTS.md` → Database
and [ADR 002](../decisions/2026-11_002-single-sql-function-per-page-render.md).

Pages do not call the public API to assemble their data. A page load calls its
stored function directly; the public API serves external clients and GitOps. The
`/api/v1/contacts` endpoints are an example of that public API.

## Colocation

A component, a helper or a remote function used by one page lives next to that
page, in its `_components/` directory. The leading underscore keeps SvelteKit
from treating the directory as a route.

```text
src/routes/(private)/timeline/
├── +page.server.js
├── +page.svelte
└── _components/
    ├── TimelineEventsTable.svelte
    └── timelineEvents.remote.js
```

The test is the number of callers:

- one page: `_components/` next to the page;
- two pages under the same parent: the parent's `_components/`;
- several route groups, or both server and client: `src/lib/client/`,
  `src/lib/shared/` or `src/lib/server/`.

`src/lib/` is for code shared by several pages. A module with one caller does not
belong there: the reader would jump to a directory that suggests a shared
component, and the only caller would be hidden.

The trade-off is accepted: a page may keep a small helper that looks like another
page's helper until a second caller appears. Duplication is cheaper than a
premature abstraction. When the second caller appears, move the module up to the
nearest common ancestor.

The rule covers SQL too. A statement used by one route stays in the route; a
statement shared by several routes, or too large to read in place, moves to
`sqls/functions.sql`, the common ancestor for SQL. That file is reloaded on every
`pnpm migrate`.

## Entry points

A page is not the only entry point. A CLI script or a worker lives in `src/`, a
migration in `sqls/migrations/`. They call the same stored functions when they
need data; they do not get their own layer, and they do not keep their own copy
of the SQL.

## Reading the table dependency graph

Two tools reconstruct the dependency graph:

- `grep` on the table and column names, in `src/` and `sqls/`;
- `\d table` and `pg_trigger` for the edges the schema declares.

A declared edge is part of the model. A foreign key with `ON DELETE CASCADE` is
declared in the child table: `\d sessions` shows it. A trigger is declared on the
table: `\d table` shows it, and `pg_trigger` lists every trigger of a schema in
one query. Both are acceptable, because the model carries them and a reader can
find them.

What breaks the graph is an edge that the two tools cannot see:

- a table or column name built from data (`knex(tableName)`, `orderBy(sortColumn)`);
- a dynamic dispatch that chooses a query by a string;
- a trigger created outside the migrations;
- a stored function that writes without being called explicitly.

A query builder that only assembles filter clauses does not break the graph, as
long as the table and column identifiers stay literal in the source. A fixed
whitelist of identifiers is fine. The library is not chosen yet: the candidates
are [Knex](https://github.com/knex/knex) in string mode (`.toString()` or
`.toSQL()` for `{ sql, bindings }`, passed to
[postgres.js](https://github.com/porsager/postgres)) and
[sql-bricks](https://github.com/datavjs/sql-bricks) with
[sql-bricks-postgres](https://github.com/Suor/sql-bricks-postgres).

## Writing to the database

The route tells the story of the request. A write stays in the handler when it is
one statement, short enough to read in place. It becomes a stored function when it
removes work from the handler code (`+page.server.js`) and thereby reduces its
computing load:

- a multi-step write operation: several statements that must commit together, or
  a branch that signals a business error;
- a shared statement: several callers, or another SQL function;
- a measured cost: the statement is large or hot enough that parsing and
  transferring it on every call shows up in a measurement.

The JSON document for a page render belongs to the read path; ADR 002 and the
Rendering section cover it.

A single statement that touches several tables is still one statement:
data-modifying CTEs run in the statement's transaction, so the write is atomic.
Counting tables is the wrong proxy: a statement that touches three tables can
still commit as one unit. The test is the number of statements and the number of
callers.

Send a statement that has no named arguments with a tagged template, so
postgres.js prepares it. Reserve `sql.unsafe` for the named-argument call of a
stored function.

When the write is a function, name it with the vocabulary of the route:
`mark_invoice_paid` for `/invoices/:id/pay`. Signal a business error with a
stable `SQLSTATE` or a typed return. Never make JavaScript parse a message text.

When the operation needs an effect the database cannot perform — send an email,
call an HTTP API — it may stay in JavaScript. Keep the table and column names
literal in the handler, and place the external effect after the commit, so a
retry does not send the email twice.

When the order or the content of the statements depends on a decision computed
in JavaScript, the write may stay in the handler inside `sql.begin()`, with the
decision extracted into a pure function (`planUserSync` is the model). The plan
is applied with one set-based statement per write category, sent as an ordered
`tx.batch`. A plan built in JavaScript does not by itself justify a stored
function: the criteria above decide that.

A single-table `INSERT`, `UPDATE` or `DELETE` is one statement, so it stays in the
handler. An `ON DELETE CASCADE` does not make it a multi-step write operation: the
cascade is declared in the schema and `\d` shows it.

Revoking `INSERT`, `UPDATE` and `DELETE` from the application role is an option,
not a rule. It turns the convention into an enforcement, at the cost of a role
split (owner and application). Decide per project from team size and turnover.
This skeleton does not do it. A project that applies it moves the inline writes
into stored functions first.

## The database schema is the truth

The data model is not a diagram next to the code; it is the database schema:
tables, columns, types, constraints and comments. It does not lie when every
state it allows is a state the business allows. The test: can you produce a
false row with a legal `INSERT`?

- Declarative constraints: `CHECK`, `UNIQUE`, foreign keys, domains.
- Overlapping intervals: an exclusion constraint on range types. One active row
  per holder: a partial unique index.
- Generated columns rather than triggers when they express the same thing.
- A trigger is acceptable when the schema declares it, `\d` shows it, and
  `COMMENT ON TRIGGER` says why it exists. Keep it short.
- A state machine can be data: a `transitions` table and a composite foreign key.
  An illegal transition is then refused by the database.
- Documentation lives in `COMMENT ON TABLE`, `COMMENT ON COLUMN`,
  `COMMENT ON FUNCTION` and `COMMENT ON TRIGGER`. It travels with the object and
  cannot drift from it.
- A constraint is expensive to remove. Put structure in constraints (uniqueness,
  references, overlaps, positivity) and contracts that the business may redefine
  in functions.

## Naming

A name must let you predict what the function touches. The test: from the name and
the signature, can you write the list of tables it may modify?
`mark_invoice_paid` passes. `validate_invoice` does not.

The URL segment and the table share the same root: `/invoices` reads `invoices`,
`/contacts` reads `contacts`. When they diverge, the mapping lives in
`COMMENT ON TABLE`, not in a separate file.

Three lies:

- the name is too small for what the body does: `get_user()` creates the user,
  logs and sends a mail;
- the name is too large: `send_invoice()` only queues the message;
- the name says nothing: `process`, `handle`, `manage`, `check`.

The vague names are the most dangerous because nothing can contradict them.

## Testing

Test the stored functions and the page paths that matter. Coverage is a decision
per project; a small project can keep it light. Do not mock the database: run
against a real one, in a transaction that is rolled back.

A rule that is a pure function on its inputs — many branches, several callers,
frequent change — can live in a plain JavaScript file with a table of cases. The
existing models are `planApiTokenChange()` in
`src/lib/server/api-token-sync.js` and `planUserSync()` in
`src/lib/server/user-sync.js`.

## Dependencies

Do not add a SaaS for a feature that fits in the application. The criterion is not
the line count; it is the operational failure you cannot debug alone.

- Inside: database, object storage, backups, search.
- Outside: payment, mail deliverability, identity providers, compliance.

## State and open points

- The query builder for complex UI filters is not chosen. The candidates are
  [Knex](https://github.com/knex/knex) in string mode and
  [sql-bricks](https://github.com/datavjs/sql-bricks) with
  [sql-bricks-postgres](https://github.com/Suor/sql-bricks-postgres). No
  dependency is added before the choice.
- Privilege revocation is not applied. It is a per-project option, not a defect.
- Test coverage is light. It is a per-project decision, not a defect.

## Sources

The names this architecture borrows, and their sources, are in
[ADR 004](../decisions/2026-11_004-application-architecture.md).
