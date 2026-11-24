---
status: accepted
date: 2026-11-24
decision-makers: Stéphane Klein
ai-assistants: DeepSeek V4.1 Flash (OpenCode Go)
---

# ADR 004 — Application architecture: URL and database schema rather than technical layers

## Which applications this architecture addresses

The architecture described in this ADR is suited only to data-management web
applications,
[CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) in the
broad sense. In simple terms, these applications do three things:

- read information from a relational database and display it in an HTML page;
- receive data through an HTTP POST request and write it to the relational
  database;
- let the user navigate from one page to another through URLs.

This architecture is not suited to applications such as a spreadsheet, a text
processor, Blender, a web browser, a database engine or a compiler.

## Context and Problem Statement

This ADR does not mark a change of direction in this project. The architecture
described here was already implicitly in mind when the project started. This ADR
is its formalization.

This skeleton,
[`sveltekit-ssr-skeleton`](https://github.com/stephane-klein/sveltekit-ssr-skeleton/),
is the starting point for the data-management web applications of
[Stéphane Klein](https://sklein.xyz). Over thirty years of practice, and
consciously since 2017, the same observation has repeated. It seems to me that
layered architectures (Clean Architecture — [Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html),
hexagonal architecture — [Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/),
Domain-Driven Design — [Eric Evans](https://domainlanguage.com/ddd/)) raise the
cost of entering a project. A newcomer must read a controller, a service, a
repository, a
[DTO](https://martinfowler.com/eaaCatalog/dataTransferObject.html) and a mapper
before understanding one page. When the original
team leaves, these abstractions remain, often misunderstood and not always used.
They often carry technical debt, and newcomers often struggle to maintain and use
them. The team often ends up rewriting the project from scratch.

These architectures rely on concepts you need to master —
[use cases](https://martinfowler.com/bliki/UseCase.html),
[ports and adapters](https://alistair.cockburn.us/hexagonal-architecture/),
[entities](https://domainlanguage.com/ddd/reference/),
[aggregates](https://martinfowler.com/bliki/DDD_Aggregate.html) — and that sit
between the page and the data.

Between 2015 and 2020, I took a step back. I then realized that the architectures
I called "naive" in my first PHP projects, between 1998 and 2004, were in fact
easy to understand and, as a result, I could easily contribute to them. Why were
those projects simpler? I think it is because the CRUD projects of the time had
one indirection: the file called by the URL contained the query. The simplicity
did not come from the PHP language, but from the small number of steps between
the URL and the data.

In 2023, I became aware of this architecture, discussed it with people around me,
and started following it.

In my view, this architecture requires less cognitive load to work on the project.

This architecture held up in 2023, and it seems to me that it still does in 2026,
even in the era of AI coding agents. I observe in my practice that what is simple
for a human to understand is often also simple for an LLM. For the same task, in
my practice, a simple architecture with few indirections consumes fewer tokens.
The exchanges with the agent are often faster. It also reduces the need for a
powerful LLM: my experience shows that a fast, inexpensive model such as
DeepSeek V4.1 Flash contributes to projects that follow this architecture without
difficulty.

This ADR and the
[`docs/agents/application-architecture.md`](../agents/application-architecture.md)
document aim to help contributors, human or AI agents, understand the project's
architecture rules and produce code that follows them. The goal is to preserve
overall coherence.

## Decision Drivers

Here are the criteria that guided me toward this architecture:

- A newcomer, human or agent, can read the application from its two boundaries:
  the URL and the database schema.
- The path between the URL and the data stays short: few indirections and few
  concepts to master.
- The database schema carries the constraints; it is the contract.
- No compromise on page render speed: the end user must feel the application is
  fast and responsive.

## Considered Options

- **A. ORM with the NestJS/AngularJS model** — modules, controllers, services,
  dependency injection, repository, ORM. The application is organized by
  technical layers, not by domain.
- **B. Hexagonal architecture** — ports and adapters, use cases, dependency
  inversion. The domain core depends on neither the framework nor the ORM; the
  ORM is an adapter at the boundary.
- **C. Domain-Driven Design** — entities, aggregates, repositories, domain
  services. The domain model lives in code, and the ORM handles persistence.
- **D. SPA and REST API** — the frontend is a separate application, the API
  exposes generic resources, and the SPA assembles the page in the browser. The
  server sends no HTML, only JSON.
- **E. One page per URL, raw SQL, no intermediate layers** — the URL and the
  database schema as landmarks: the tree follows the URL, the page owns its
  components and helpers, the reads are one stored function per page render, the
  writes that need a multi-step operation or a shared statement are stored
  functions, and the schema carries the constraints.

I also considered [htmx](https://htmx.org/). I have a soft spot for this
technology: it exchanges HTML fragments rather than JSON, and it ticks many
boxes. But I prefer SvelteKit SSR + hydration, which is more flexible and, in my
view, offers a better Developer Experience. If I had to build an application of
this kind in Go or Rust, I think I would choose htmx.

## Decision Outcome

Chosen option: **E**. One page per URL, raw SQL, no intermediate layers.

The URL, the routing files on the filesystem, and the database schema serve as
entry points for understanding the code. If a developer knows how to read and
write data in SQL, that is enough.

### Use the same names from the web interface to the database schema

The architecture avoids adding abstractions at the file or function level
wherever possible. It therefore does not invent an intermediate vocabulary: the
names from the web interface and the business domain are enough to name routes,
tables and functions. The URL uses the page name from the web interface. The table
uses the business entity name. A function that modifies data uses the name of the
action from the web interface.

A name that promises something the code does not do is a defect, even when the
code works. A function name must express what the code does. A long identifier is
preferable to a vague name.

### SSR and hydration

Pages are server-rendered ([SSR](https://svelte.dev/docs/kit/glossary#SSR)) and
[hydrated](https://svelte.dev/docs/kit/glossary#Hydration) on the client. The
server sends the page's HTML and its payload; Svelte takes over in the browser for
interactivity. The page is not a SPA that calls a generic API to assemble itself.

### One page, one specific payload

The frontend is not a generic API client. The application does not build a
general-purpose API to power its own pages. Each page receives the data it needs
from the server in one payload shaped for that page; it does not assemble the
page from several generic resources. The server owns the data and the business
rules; the frontend owns the presentation.

Because the read is one query or one stored function, PostgreSQL plans the whole
page in one go. An ORM, by contrast, generates SQL in the developer's place and
often hides the planner's optimizations and PostgreSQL-specific features. A
generic API client, for its part, often forces developers to multiply calls and
recompose the data in several steps. My experience shows that the per-page payload
reduces the amount of code for the same feature. The response is optimised for
speed: one round-trip to the database, one payload.

This is the read-side counterpart of the write path below. It is also the reason
[ADR 002](./2026-11_002-single-sql-function-per-page-render.md) asks for one
stored function per page render.

A public API may exist for external clients and for GitOps. The application's own
pages do not consume it: the page payload and the public API have different
reasons to change. In this skeleton, the `/api/v1/contacts` endpoints are an
example: they show the shape of a public API, and the contacts page does not
call them. The page reads its data through `get_contacts_page_data`. Max
Chernyak calls this approach
[Server Informed UI](https://max.engineer/server-informed-ui).

### Rules for writing to the database

SQL write queries are implemented in the route handler (`+page.server.js`) when
they are limited to one statement and short enough to read in place. They become
stored functions when they remove work from the handler code (`+page.server.js`)
and thereby reduce its computing load:

- a multi-step write operation: several statements that must commit together, or
  a branch that signals a business error;
- a shared statement: several uses, or another SQL function;
- a measured cost: the statement is large or hot enough that parsing and
  transferring it on every call shows up in a measurement.

The JSON payload for a page render is built on the read path;
[ADR 002](./2026-11_002-single-sql-function-per-page-render.md) and the
[One page, one specific payload](#one-page-one-specific-payload) section cover
it.

A single statement that touches several tables is still one statement when it
uses CTEs, for example: data-modifying
[CTEs](https://www.postgresql.org/docs/current/queries-with.html) run in the
statement's transaction, so the write is atomic.
Counting tables is the wrong proxy: a statement that touches three tables can
still commit as one unit. The right test is the number of statements and the
number of call sites: a route handler, a script, a worker, or another SQL
function.

By default, write SQL statements with tagged templates (`` sql`...` ``). With this
syntax, postgres.js uses PostgreSQL's prepared statement feature: statements are
parsed and planned once, then the plan is reused on later calls. This makes the
implementation faster when the same query runs often, because that cost is not
paid again on every call. For example:

```js
const contacts = await sql`
  SELECT id, firstname, lastname
  FROM contacts
  WHERE lastname = ${lastname}
`;
```

An operation that needs a feature PostgreSQL does not provide, or that is too
difficult to implement there (send an email, call an HTTP API), may stay in
JavaScript.

When the order or the content of the statements depends on a decision computed in
JavaScript, the write may stay in the handler, inside a transaction
(`sql.begin()`).

### The database schema

The SQL schema of the database must be implemented with the greatest care: it is
the contract. Constraints, generated columns and automatic modifications
(cascade, trigger) are declared in the schema, and the database applies them
itself at write time. Documentation lives in `COMMENT ON`, with the object.
Longer documentation may live as comments in the SQL files and migrations.

### Colocation

A component, a helper or a remote function used by one page lives in that page's
`_components/` directory. It moves to `src/lib/` only when a second page needs
it, and first to the nearest common ancestor. An indirection is justified only
once two pages need it.

Here is an example:

```text
src/
├── routes/(private)/
│   ├── timeline/
│   │   ├── +page.server.js
│   │   ├── +page.svelte
│   │   └── _components/
│   │       ├── TimelineEventsTable.svelte
│   │       └── timelineEvents.remote.js
│   └── time-entries/
│       ├── +page.server.js
│       ├── +page.svelte
│       ├── _components/
│       │   ├── TimeEntriesTable.svelte
│       │   └── timeEntries.remote.js
│       ├── day/
│       │   └── [date]/
│       │       ├── +page.server.js
│       │       └── +page.svelte
│       ├── week/
│       │   └── [year]/[week]/
│       │       ├── +page.server.js
│       │       └── +page.svelte
│       ├── month/
│       │   └── [month]/
│       │       ├── +page.server.js
│       │       └── +page.svelte
│       └── range/
│           ├── +page.server.js
│           └── +page.svelte
└── lib/
    └── components/
        ├── GoTo.svelte
        ├── ModeSelector.svelte
        └── nav/
```

`timeline` has one page: its `_components/` stays next to it. The five views of
`time-entries` share theirs at the nearest common ancestor. The navigation
shared by `time-entries` and `charts` lives in `src/lib/components/`.

The rule also covers SQL. A statement used by one route stays in the route; a
statement shared by several routes, or too large to read in place, moves to
`sqls/functions.sql`.

### Accepted abstractions

The refusal of abstraction targets generic frameworks, such as
[NestJS](https://nestjs.com/), and abstractions created specifically for the
application. A library, a tool or a service with one precise purpose, its own
repository and careful documentation is accepted, such as
[Temporal](https://github.com/temporalio/temporal) or
[Melange](https://melange.sh/). Such tools do not reorganize the page flow; they
bring a useful building block to the application's business features.

### Strengths and weaknesses of the chosen solution

The chosen solution is
**E. One page per URL, raw SQL, no intermediate layers**. I review it against the
four criteria from the "Decision Drivers" section. I add one weakness about
adoption, which does not depend on any of them.

**Reading the application from the URL and the schema**

- Strength: the route tree mirrors the URL, and each page owns its components and
  helpers. The consolidated schema in `sqls/schema.sql` describes the tables, the
  constraints and the comments. A newcomer starts from either frontier and finds
  the code.

**Few indirections between the page handler and the database**

- Strength: no service, no repository, no DTO, no ORM. The handler runs its SQL
  directly when one statement is enough. It calls a stored function when the
  operation needs several steps or builds a page payload. A render crosses one
  boundary: JavaScript, then SQL.

**Making the schema the contract**

- Strength: constraints, generated columns, cascades and triggers are declared in
  the schema. The database refuses invalid data whatever code writes.

**Not compromising page render speed**

- Strength: the server sends HTML already filled with data, with one round-trip to
  the database. No query waterfall, no API calls to assemble in the browser.

**Getting the architecture accepted**

- Weakness: this architecture is not popular. It does not rely on the frameworks
  and tools expected on the market, and many developers will judge it naive. It
  therefore takes time to convince, and technical arguments are not always enough.

## Pros and Cons of the Other Options

This is not a ranking. It is what I take from each option, with what convinces me
and what bothers me.

### A. ORM with the NestJS/AngularJS model

**Strengths**

- The model is familiar to many developers.
- The framework supplies a structure and a vocabulary.

**Weaknesses**

- The cognitive load needed to understand a project is high: one page crosses
  module, controller, service, repository, DTO and mapper.
- Passing through these layers adds conversions and queries, and makes execution
  slower than direct SQL.
- The ORM hides the SQL that actually runs.
- Organizing by technical type scatters one feature across several directories.

### B. Hexagonal architecture

**Strengths**

- The domain core depends on neither the framework nor the ORM, and it can be
  tested alone.
- Ports and adapters make the boundaries explicit and replaceable.

**Weaknesses**

- Ports and adapters add indirection, and therefore cognitive load: one page
  crosses more files.
- The ORM is still an adapter: when used, the SQL stays hidden.
- In my experience, a layered application is slower at runtime than a direct SQL
  implementation: passing through several layers adds conversions and extra
  queries.

### C. Domain-Driven Design

**Strengths**

- The domain model is explicit, and the ubiquitous language lives in the code.
- Complex rules are isolated in entities and aggregates.

**Weaknesses**

- Entities, aggregates, repositories and domain services add indirection.
- Passing through these layers adds mapping and queries, and makes execution
  slower than direct SQL.
- The ORM hides the SQL, and the mapping between the domain and the tables adds a
  layer.

### D. SPA and REST API

**Strengths**

- It is a popular architecture.
- The frontend and the backend are separate and can be deployed independently.
- The API can serve a mobile application or external clients.

**Weaknesses**

- The page is assembled in the browser from several calls, so there are more
  round-trips.
- PostgreSQL cannot plan the whole page in one query, and the frontend does the
  transformations.
- The first render is slower, which, in my experience, makes the page feel slow.
- Two contracts must be maintained, the API's and the frontend's, and their
  versions must stay compatible.

## More Information

Here are the architecture concepts that inspired me and that I reused in the
chosen architecture:

- **Thick Database, SmartDB, thin/thin/fat** — in the PL/SQL/Oracle community,
  the browser code and the backend code stay light, and the database carries most
  of the logic. Steven Feuerstein documented the concept in [The SmartDB Resource
  Center](http://stevenfeuersteinonplsql.blogspot.com/2018/05/the-smartdb-resource-center.html);
  Peter Koletzke illustrates it in [Using a PL/SQL Table API to Implement Thick
  Database Principles](https://www.youtube.com/watch?v=uOrmKq2qvHc).
- **SQL-as-code** — Dimitri Fontaine,
  [The Art of PostgreSQL](https://theartofpostgresql.com/).
- **Vertical Slice Architecture** — Jimmy Bogard,
  [Vertical Slice Architecture](https://www.jimmybogard.com/vertical-slice-architecture/).
- **Screaming Architecture** — Robert C. Martin,
  [Screaming Architecture](https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html).
- **Server Informed UI** — Max Chernyak,
  [Don't Build A General Purpose API To Power Your Own Front End](https://max.engineer/server-informed-ui).
- **Majestic Monolith** — DHH,
  [The Majestic Monolith](https://signalvnoise.com/svn3/the-majestic-monolith/).
- **MonolithFirst** — Martin Fowler,
  [MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html).
- **Radical Simplicity** — Stephan Schmidt,
  [Radical Simplicity in Technology](https://www.radicalsimpli.city/).

The rejected approaches, for reference:

- Clean Architecture — [Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- Hexagonal Architecture — [Alistair Cockburn](https://alistair.cockburn.us/hexagonal-architecture/)
- Domain-Driven Design — [Eric Evans](https://domainlanguage.com/ddd/)
- Repository — [Martin Fowler](https://martinfowler.com/eaaCatalog/repository.html)
- Data Transfer Object — [Martin Fowler](https://martinfowler.com/eaaCatalog/dataTransferObject.html)
- Dependency Injection — [Martin Fowler](https://martinfowler.com/articles/injection.html)

Internal references:

- [`AGENTS.md`](../../AGENTS.md) — Application Architecture.
- [`docs/agents/application-architecture.md`](../agents/application-architecture.md) — the live reference.
- [`docs/agents/sql-functions.md`](../agents/sql-functions.md) — the read pattern.
- [ADR 002](./2026-11_002-single-sql-function-per-page-render.md) — one stored
  function per page render.
