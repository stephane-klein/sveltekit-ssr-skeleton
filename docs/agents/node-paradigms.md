# Node.js paradigms in practice

The rules live in [`AGENTS.md`](../../AGENTS.md#nodejs-paradigms). This document
shows how to apply them in this repository, lists the approved exceptions, and
gives the review questions. It does not restate the rules.

## Scope

The rules cover `.js` files, the scripts under `src/` and `scripts/`, the tests
under `test/`, and the `<script>` blocks of `.svelte` components.

In a Svelte component, rune declarations keep the documented Svelte form:
`let { data } = $props();`, `let count = $state(0);`. The computation around
them is not exempt.

## Building a value

A loop whose only job is to produce an array is a `map`.

Before:

```js
const emails = [];
for (const user of users) {
  emails.push(user.email);
}
```

After:

```js
const emails = users.map((user) => user.email);
```

When one item produces several values, `flatMap` replaces the inner push.

Before:

```js
const names = [];
for (const item of items) {
  for (const token of item.tokens) {
    names.push(token.name);
  }
}
```

After:

```js
const names = items.flatMap((item) => item.tokens.map((token) => token.name));
```

## Deriving a count

A counter that only counts matching items is a filter.

Before:

```js
let created = 0;
let updated = 0;
for (const plan of plans) {
  if (plan.action === "created") created += 1;
  if (plan.action === "updated") updated += 1;
}
```

After:

```js
const created = plans.filter((plan) => plan.action === "created").length;
const updated = plans.filter((plan) => plan.action === "updated").length;
```

The same rule covers a summary object. Build the counts from the plan arrays
instead of incrementing one field at a time.

## Binding a name

A binding earns its place when the name carries meaning.

Before:

```js
const months = getMonths();
return months.map((month) => month.label);
```

After:

```js
return getMonths().map((month) => month.label);
```

Keep the binding when the value is used twice, when the name explains a step
that the expression does not, or when inlining would make the surrounding
expression hard to read.

A binding used once whose name only restates the call is inlined, including an
`await` expression inside a template interpolation.

Before:

```js
const tokenHash = await hashToken(raw);

const [user] = await sql`
  SELECT ...
  WHERE token_hash = ${tokenHash}
`;
```

After:

```js
const [user] = await sql`
  SELECT ...
  WHERE token_hash = ${await hashToken(raw)}
`;
```

JavaScript evaluates the interpolation before the tag function runs, so the
database still receives one statement.

## Inlining and extracting

A helper that wraps a single call hides the call.

Before:

```js
const buildId = () => generateId();
const id = buildId();
```

After:

```js
const id = generateId();
```

Extract a function when it is called from more than one place, when it names a
domain step (`planApiTokenChange`), or when a test needs the seam.

## Callback arguments

Name the argument, even when the function it calls is obvious.

Before:

```js
values.map(add1);
values.filter(Boolean);
```

After:

```js
values.map((value) => add1(value));
values.filter((value) => Boolean(value));
```

## Deciding and writing

A function that validates, hashes, writes and counts in one block cannot be
tested without a database, and its counters force mutable state.

`planApiTokenChange()` in `src/lib/server/api-token-sync.js` shows the shape:

- the plan function takes plain values and returns a decision;
- the caller applies the decision with SQL;
- the tests cover the plan, not the transaction.

For a new importer or a batch endpoint, follow the same split:

1. normalize the input and hash what must be hashed, before the transaction;
2. plan the changes from the rows already loaded;
3. apply the plan inside `sql.begin()` with one set-based statement per write
   category, sent as an ordered `tx.batch`;
4. derive the summary from the plan, not from counters.

`src/routes/(api)/api/v1/admin/users/sync/+server.js` is the case study.
`planUserSync()` decides every write, `applyUserSync()` sends the six write
categories as one `tx.batch`, and the order in the batch is the contract: user
rows exist before their tokens are written, and the deletes run last.

## SQL layout

Prettier formats the JavaScript around a tagged template, not the SQL inside it.
Write a multi-column list vertically, so the reader can compare it with the
table definition.

Before:

```js
await sql`
    INSERT INTO users (id, email, display_name, password_hash)
    SELECT x."userId", x.email, x."displayName", x."passwordHash"
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
         AS x("userId" text, email text, "displayName" text, "passwordHash" text)
`;
```

After:

```js
await sql`
    INSERT INTO users (
        id,
        email,
        display_name,
        password_hash
    )
    SELECT
        x."userId",
        x.email,
        x."displayName",
        x."passwordHash"
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
         AS x(
             "userId" text,
             email text,
             "displayName" text,
             "passwordHash" text
         )
`;
```

The rule covers the target column list, the `SELECT` list, the `SET`
assignments, and the `jsonb_to_recordset` column definitions. A list with one
column stays on one line. `tx` tagged templates follow the same layout.

## Approved exceptions

| Construct             | Where                                              | Why                                                |
| :-------------------- | :------------------------------------------------- | :------------------------------------------------- |
| Retry with early exit | `src/lib/server/pg.js` (`waitForDb`)               | The sequence and the stop condition are the point. |
| Stream read           | `src/add-user.js` (`for await` on `process.stdin`) | The stream produces chunks.                        |
| Registry              | `src/lib/server/lifecycle.js` (`onShutdown`)       | The callback list is the state.                    |
| Module cache          | `src/lib/server/oidc.js` (`endpointsCache`)        | The cache is the design.                           |
| Rune declaration      | `.svelte` files                                    | The documented Svelte form uses `let`.             |
| URL builder           | `src/lib/server/oidc.js`                           | `URL` and `URLSearchParams` mutate by design.      |

Do not "fix" an exception. When a new case looks like one, add a row with the
file and the reason. `AGENTS.md` already points to this table.

## Review questions

- Does a loop build a new value? Then it is a `map`, `filter`, `reduce` or
  `flatMap`.
- Does a loop keep an accumulator, a counter or an `++`? Can `map`, `flatMap` or
  `filter().length` produce the same value?
- Does a binding only shorten the next line, or restate a single call? Inline it,
  including an `await` expression in a template interpolation.
- Is a callback passed as a bare identifier? Name its argument.
- Does a function decide and write? Extract the decision.
- Is a multi-column SQL list packed onto one line? Put each column on its own
  line.
- Does the construct appear in the exceptions table? Leave it alone.
- Did the behavior change? For a refactor, no.

## Definition of done

`pnpm check` and `pnpm test` pass. For a refactor, the diff changes no observable
behavior: same SQL, same status codes, same error messages.
