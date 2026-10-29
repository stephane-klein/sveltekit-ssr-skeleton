# SvelteKit SSR Stéphane Klein skeleton

> The 2023 version of my SvelteKit SSR skeleton is archived in the [skeleton-2023](https://github.com/stephane-klein/sveltekit-ssr-skeleton/tree/skeleton-2023) branch.

In July 2026, I decided to "reboot" my SvelteKit SSR skeleton, which serves as the foundation for my web application projects.

This new skeleton is built on top of [nodejs-pg-playground](https://github.com/stephane-klein/nodejs-pg-playground).

## Tech Stack

- Runtime: Node.js 24 (ESM)
- Package manager: pnpm
- Framework: SvelteKit 2 (SSR)
- Bundler: Vite
- Adapter: @sveltejs/adapter-node
- Database: PostgreSQL 18
- SQL client: [postgres](https://github.com/porsager/postgres)
- Migrations: [postgres-shift](https://github.com/porsager/postgres-shift)
- OIDC client: native OAuth 2.0 (fetch + node:crypto, PKCE S256)
- Mail: [nodemailer](https://nodemailer.com/) over SMTP
- CSS: [UnoCSS](https://unocss.dev/) (Tailwind preset)
- i18n: [Paraglide JS](https://paraglidejs.com/) (cookie-based, no URL prefix)
- Lint / Format: ESLint + Prettier (eslint-plugin-svelte, prettier-plugin-svelte)
- Tooling: [Mise](https://mise.jdx.dev/), [Pitchfork](https://pitchfork.jdx.dev/)
- Dev mail: [Mailpit](https://github.com/axllent/mailpit) (SMTP + web UI)
- Containers: Podman Compose
- Secret detection: [gitleaks](https://github.com/gitleaks/gitleaks)

## Included Features

- **Authentication** — sessions, API tokens, password reset, magic link login (following [Lucia](https://lucia-auth.com/sessions/overview) security recommendations), with login rate limiting to slow down brute-force attacks
- **OIDC** — external provider authentication (authorization code flow with PKCE)
- **API documentation** — interactive reference at `/api/reference` powered by [Scalar](https://scalar.com/)
- **OpenAPI spec** — auto-generated and served at `/api/v1/openapi.json`
- **Idempotent user provisioning (GitOps)** — admin API `PUT /api/v1/admin/users` and `PUT /api/v1/admin/users/sync` to create/update/delete users from a declared desired state, safe to re-apply in CI/CD or a reconciliation loop
- **Metrics** — Prometheus endpoint at `/-/metrics` via [`@prometheus-io/client`](https://github.com/prometheus/client_js)
- **SSR/CSR tech info popup** — performance popup (bottom-right, `tech info` button) showing total time, server processing, PostgreSQL queries, network roundtrip, hydration/rendering, and version info (build timestamp, GitHub commit link) for both SSR (first full page load) and CSR (client navigation). Uses `Server-Timing` header + Performance API — no extra requests.
- **Helm chart** — Kubernetes deployment with Prometheus auto-scraping (`prometheus.io/*` pod annotations) and Grafana dashboard (ConfigMap sidecar pattern)

## AI-Assisted Development

This project was developed using:

- [OpenCode](https://opencode.ai) CLI — coding assistant workflow (not vibe coding)
- Models: DeepSeek V4 Flash (OpenCode Go)

## Principles

- Monorepository and monolithic application pattern ([notes](https://notes.sklein.xyz/2025-05-06_2224/zen/))
- Raw SQL — no ORM
- UI development follows the conventions in [sklein-utilitarian-ui-skill](https://github.com/stephane-klein/sklein-utilitarian-ui-skill)
- Trying to embrace [Radical Simplicity](https://www.radicalsimpli.city/): reducing accidental complexity, applying LEAN techniques
- Vigilance against [cargo cult](https://en.wikipedia.org/wiki/Cargo_cult)
- Following [YAGNI](https://en.wikipedia.org/wiki/You_aren%27t_gonna_need_it)

## Prerequisite

Install [mise](https://mise.jdx.dev/getting-started.html) — it will handle installing Node.js, pnpm and Pitchfork for you.

## Getting Started

The dev-stack services run under [Pitchfork](https://pitchfork.jdx.dev/): one
command starts PostgreSQL, Mailpit, the migrations, the seed and the dev server,
in dependency order and in the background. Safe to rerun.

```bash
$ mise install                # install Node.js, pnpm and Pitchfork via mise
$ pnpm install
$ pitchfork start webapp      # start postgres and mailpit,
                              # run migrate and seed,
                              # then the dev server
$ pitchfork logs webapp --tail
```

Open http://localhost:5173 in your browser.

Default user (see [`./sqls/seeds/00002_users.sql`](./sqls/seeds/00002_users.sql)):

- email: `alice@example.com`
- password: `password123`

### Testing the built version of the webapp locally

```sh
$ pitchfork start preview
```

Open http://localhost:4173 in your browser.

Default user (see [`./sqls/seeds/00002_users.sql`](./sqls/seeds/00002_users.sql)):

- email: alice@example.com
- password: password123

### Pitchfork basics

```bash
$ pitchfork list                    # what is running, what is available
$ pitchfork status webapp           # pid, port, proxy URL
$ pitchfork start --force webapp    # restart after a config change
$ pitchfork stop --local            # stop this project's daemons (PostgreSQL volume preserved)
```

To exercise the OIDC login flow, start the Authelia test stack first, then
restart the webapp so it picks up the `AUTHELIA_*` variables:

```bash
$ pitchfork start authelia            # optional OIDC provider (authelia-test-env/)
$ pitchfork start --force webapp      # start, or restart if already running
$ reload                              # load AUTHELIA_* into the current shell
```

The webapp daemon picks up `AUTHELIA_*` automatically (pitchfork runs it through
`mise x`); `reload` is only needed for your current shell.

### Other commands

```bash
$ mise run sync-users         # create users (see ./api-payloads-examples/users-sync.json)
$ mise run preview-prod-build # build and run production server on http://localhost:3000
```

### Stopping and cleaning up

```bash
$ pitchfork stop --local      # stop the daemons (PostgreSQL volume preserved)
$ mise run teardown           # stop the daemons, remove containers and volumes (destructive, deletes PostgreSQL data)
```

### Accessing test emails

Mailpit captures all emails sent by the application (SMTP on `127.0.0.1:1025`).
The `mailpit` daemon is published by the Pitchfork proxy: run
`pitchfork proxy status` to get its URL, `https://mailpit.<project>.<proxy-tld>`.

### Sending a test email

```bash
$ mise run send-test-mail
```

This sends an email to the address configured in `TEST_EMAIL_TO`
(`john.doe@example.com` by default). Open the Mailpit web UI (see above) to view it.

## Authentication

### Creating a user

```bash
$ pnpm add-user \
  --email=john.doe@example.com \
  --password=yourpassword \
  --display-name="John Doe" \
  --oidc-issuer=https://127.0.0.1:9091 \
  --oidc-subject=johndoe

# Read password from stdin
$ echo "yourpassword" | pnpm add-user --email=user@example.com --password-stdin

# Password and OIDC are both optional: users without either credential sign in
# via the magic link or set a password through the reset flow
$ pnpm add-user --email=jean@example.com --display-name="Jean Dupond"
```

### Creating a user via REST API

Set the `MY_APP_ADMIN_TOKEN` environment variable, then use the admin API:

```bash
$ curl -s -X POST -H "Authorization: Bearer ${MY_APP_ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"email":"api-user@example.com","display_name":"API User","password":"password"}' \
    http://localhost:5173/api/v1/admin/users | jq
```

### Provisioning users idempotently (DevOps / GitOps)

The admin API exposes two idempotent operations that let a DevOps / GitOps
workflow reconcile the set of users with a declared desired state:

- `PUT /api/v1/admin/users` — upsert a single user by `email` (create if absent,
  fully replace otherwise, `200` either way).
- `PUT /api/v1/admin/users/sync` — create/update/delete several users in one
  atomic transaction. Body: `{ "upsert": [...], "delete": [{ "email" }] }`.
  Deleting a non-existent email is a no-op. Response: `{ created, updated,
deleted, users }`.

The workflow is declarative: a configuration file (your GitOps source of truth)
declares the desired users, and a runner applies it to the instance. Because the
operations are idempotent, re-applying the same payload leaves the final state
stable and returns no error — so it is safe to run repeatedly, in any order, and
from a CI/CD pipeline or a reconciliation loop, not just interactively.

A ready-to-use example payload lives in
[`api-payloads-examples/users-sync.json`](./api-payloads-examples/users-sync.json).
Run it with the `sync-users` mise task (dev server on http://localhost:5173 and
`MY_APP_ADMIN_TOKEN` set):

```bash
$ mise run sync-users
```

or call the API directly:

```bash
$ curl -fsS -X PUT -H "Authorization: Bearer ${MY_APP_ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    --data @api-payloads-examples/users-sync.json \
    http://localhost:5173/api/v1/admin/users/sync | jq
```

The first apply reports `created: 2`; editing `display_name` in the file and
re-applying reports `updated: 2`; moving an existing email into `delete` reports
`deleted: 1`. Re-applying the same payload is idempotent — the resulting state
is stable.

Single-user upsert, e.g. create or update `john.doe@example.com`:

```bash
$ curl -s -X PUT -H "Authorization: Bearer ${MY_APP_ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"email":"john.doe@example.com","display_name":"John Doe","password":"password123"}' \
    http://localhost:5173/api/v1/admin/users | jq
```

### Session flow

Users authenticate via the web UI at `/login`. Sessions are stored in PostgreSQL with
rolling expiration (30 days, refreshed when more than 50% elapsed).

### Login rate limiting

Sign-in attempts (password and magic link) are recorded in the `login_attempts` table.
Repeated failures are throttled per client IP and per email: once the threshold is
reached within a sliding window, further attempts on the `/login` page are rejected
with a `429` until the window slides. A successful password sign-in clears the recorded
attempts for that IP and email.

Two environment variables tune the behavior:

- `LOGIN_MAX_ATTEMPTS` — failed attempts allowed before throttling (default `5`)
- `LOGIN_WINDOW_MS` — sliding window in milliseconds (default `900000`, i.e. 15 minutes)

When the application runs behind a reverse proxy (Caddy, an ingress, …), adapter-node
must be told which header carries the real client IP, otherwise every request appears
to come from the proxy and a single IP throttle would lock out all users. Set
`ADDRESS_HEADER=x-forwarded-for` (the proxy must append `X-Forwarded-For`; Caddy and
common ingresses do this by default). This is already configured in
`deployment-playground/compose.yml` and the Helm chart.

### API tokens

Generate tokens from the web UI at `/my/tokens` or via CLI:

```bash
$ pnpm create-api-token --email=user@example.com --name="CI/CD deploy" --expires-in-days=90
```

Pass `--expires-in-days` (or fill the expiration field in the UI) to make a
token expire; omit it for a token that never expires. Tokens are SHA-256
hashed before storage — the raw value is shown only once at creation. Expired
tokens are rejected during authentication but remain listed and revocable.

```bash
$ curl -H "Authorization: Bearer <token>" https://your-app.example.com/api/v1/contacts
```

### Password reset

Users can reset their password via `/reset-password`. A time-limited token
(30 minutes) is generated and stored in the database. The token is presented via
query parameter to `/change-password`.

### OpenID Connect

Authentication via an external OIDC provider (like [Authelia](https://www.authelia.com/))
implemented with native `fetch` and `node:crypto` (authorization code flow with
PKCE S256).

Create a user linked to an OIDC identity:

```bash
$ pnpm add-user \
    --email=user@example.com \
    --display-name="User" \
    --oidc-issuer=https://your-authelia.example.com \
    --oidc-subject=username
```

On the login page, click **Sign in with Authelia** to authenticate
via the external OIDC provider. A local test environment is available
in [`authelia-test-env/`](./authelia-test-env/).

### API documentation

An interactive API reference is available at [`/api/reference`](/api/reference),
powered by [Scalar](https://scalar.com/). It reads the OpenAPI 3.0 spec served
at `/api/v1/openapi.json`.

```bash
$ curl http://localhost:5173/api/v1/openapi.json
```

## REST API

### Authentication

API endpoints accept both session cookies and `Authorization: Bearer <token>` headers.

### Endpoints

| Méthode  | Route                   | Description                             |
| :------- | :---------------------- | :-------------------------------------- |
| `GET`    | `/api/v1/contacts/`     | List contacts                           |
| `POST`   | `/api/v1/contacts/`     | Create a contact (`firstname` required) |
| `GET`    | `/api/v1/contacts/:id/` | Get a contact                           |
| `PATCH`  | `/api/v1/contacts/:id/` | Update a contact (partial)              |
| `DELETE` | `/api/v1/contacts/:id/` | Delete a contact                        |

```bash
$ curl -H "Authorization: Bearer <token>" http://localhost:5173/api/v1/contacts/
$ curl -X POST -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{"firstname":"Alice","lastname":"Martin"}' \
    http://localhost:5173/api/v1/contacts/
```

## Deployment Playground

The [`deployment-playground/`](./deployment-playground/) directory contains a local playground for testing the application in a production-like environment.

## Local monitoring stack (VictoriaMetrics + Grafana)

[`victoriametrics-grafana-test-dev/`](./victoriametrics-grafana-test-dev/)
contains a Podman Compose stack to test the metrics locally: VictoriaMetrics
scrapes `/-/metrics` and Grafana shows the result through provisioned dashboards
(the same ones the Helm chart ships).

```bash
$ pitchfork start grafana     # VictoriaMetrics + Grafana
```

Go to grafana: <http://localhost:3001> — `admin` / `admin123`

Everything else (scrape jobs, dashboards, teardown) is in
[`./victoriametrics-grafana-test-dev/README.md`](./victoriametrics-grafana-test-dev/).

## Build and push container image

```bash
$ mise run build-image
$ mise run login-ghcr
$ mise run push-image
```

Alternatively, build and push via a GitHub Action workflow (manual trigger) instead of a local Podman build:

```bash
$ mise run ci-build-push-image            # on the current branch
$ mise run ci-build-push-image main       # on a specific ref
```

This runs the `build-push-image.yml` workflow through `gh workflow run`. The workflow
requires a `GHCR_PAT` secret (a PAT with `write:packages`) and a `GHCR_USERNAME`
variable to be set in the repository settings.

## Publish Helm chart

Helm chart source code is in: [`./helm/`](./helm/)

```bash
$ mise run login-ghcr-helm    # one-time: authenticate Helm with GHCR
$ mise run publish-chart      # package and push to oci://ghcr.io/stephane-klein/charts
```

The chart is published at `oci://ghcr.io/stephane-klein/charts/my-app`.

## Contribution

### Secret detection with gitleaks

[Gitleaks](https://github.com/gitleaks/gitleaks) scans for secrets before they
reach the remote repository.

- **`git commit`** — the `git-hooks/pre-commit` hook checks staged files.

Configuration is in `.gitleaks.toml`.

**One-time setup after clone:**

```bash
$ mise install
$ mise run setup-git-hooks
```

**Manual scan** (outside of hooks):

```bash
$ mise run gitleaks-scan        # full project scan
$ mise run gitleaks-check-push  # pre-push scan
```
