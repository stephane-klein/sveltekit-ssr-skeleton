# `#lib/shared/`

Pure / isomorphic modules usable from **both** server and client code, imported
via `#lib/shared/...`.

A module belongs here only if it is pure: no `node:` imports, no database
access, no `process.env`, no browser-only globals at module scope. This is what
makes it safe to import from a client component as well as from server code.

Layout rules (see AGENTS.md):

- server-only code → `src/lib/server/` (`#lib/server/...`)
- pure / isomorphic code → `src/lib/shared/` (`#lib/shared/...`)
- client-only Svelte components → `src/lib/client/` (`#lib/client/...`)
- `src/lib/backend/` is forbidden

The directory currently holds `locale-labels.js`, the language autonyms used by
`src/routes/+layout.svelte` and `src/routes/(private)/my/preference/+page.svelte`.

A pure module that only the server imports belongs in `src/lib/server/`, not
here: a placement in `shared/` announces that browser code may import it.
