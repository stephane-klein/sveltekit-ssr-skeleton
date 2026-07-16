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
- OIDC client: [Arctic](https://arcticjs.dev/)
- CSS: [UnoCSS](https://unocss.dev/) (Tailwind preset)
- i18n: [Paraglide JS](https://inlang.com/paraglide-js) (cookie-based, no URL prefix)
- Lint / Format: ESLint + Prettier (eslint-plugin-svelte, prettier-plugin-svelte)
- Tooling: [mise](https://mise.jdx.dev/)
- Containers: Podman Compose
- Secret detection: [gitleaks](https://github.com/gitleaks/gitleaks)

## Included Features

- **Authentication** — sessions, API tokens, password reset, magic link login (following [Lucia](https://lucia-auth.com/sessions/overview) security recommendations)
- **OIDC** — external provider authentication via Arctic
- **API documentation** — interactive reference at `/api/reference` powered by [Scalar](https://scalar.com/)
- **OpenAPI spec** — auto-generated and served at `/api/v1/openapi.json`
- **Metrics** — Prometheus endpoint at `/-/metrics` via [`prom-client`](https://github.com/siimon/prom-client)
- **Email testing** — [Mailpit](https://github.com/axllent/mailpit) dev SMTP server with web UI
- **Helm chart** — Kubernetes deployment with Prometheus auto-scraping (`prometheus.io/*` pod annotations) and Grafana dashboard (ConfigMap sidecar pattern)

## Roadmap:

- [x] Implement `/version.json` ([see](https://github.com/stephane-klein/toggl-pg-mirror/commit/5e496a884c9165f1dc0ec515afba79c6e38b35cd))
- [x] Implement a HelmChart package ([see](https://github.com/stephane-klein/toggl-pg-mirror/tree/main/helm/toggl-pg-mirror))
- [x] Implement authentication system based on [Lucia's recommendations](https://lucia-auth.com/)
  - [x] Login with email/password
  - [x] CLI `add-user` for creating users
  - [x] Session management (cookie-based, rolling expiration)
  - [x] Password reset flow (token-based)
  - [x] API tokens for programmatic access
  - [x] OpenID Connect 1.0 ([Authelia](https://www.authelia.com/overview/authorization/openid-connect-1.0/))
- [x] Add Prometheus metrics export endpoint with `prom-client` (`/-/metrics`)
- [x] Password reset flow (email via nodemailer)
- [x] Magic link login (passwordless email sign-in)
- [x] Container option to optionally load seed SQL data

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

Install [mise](https://mise.jdx.dev/getting-started.html) — it will handle installing Node.js and pnpm for you.

## Getting Started

```bash
$ mise install      # install Node.js and pnpm via mise
$ pnpm install
$ mise run up       # start PostgreSQL container
$ reload            # load environment variables
$ mise run migrate  # run database migrations
$ mise run seed     # populate with demo data
$ mise run dev                # start SvelteKit dev server on http://localhost:5173
$ mise run preview-prod-build # build and run production server on http://localhost:3000
```

Open http://localhost:5173 in your browser.

### Accessing test emails

Mailpit is available at http://localhost:8025 — it captures all emails sent by
the application (via SMTP on `localhost:1025`).

### Sending a test email

```bash
$ mise run send-test-mail
```

This sends an email to the address configured in `TEST_EMAIL_TO`
(`john.doe@example.com` by default). Open http://localhost:8025 to view it.

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
```

### Creating a user via REST API

Set the `MY_APP_ADMIN_TOKEN` environment variable, then use the admin API:

```bash
$ curl -s -X POST -H "Authorization: Bearer ${MY_APP_ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"email":"api-user@example.com","display_name":"API User","password":"password"}' \
    http://localhost:5173/api/v1/admin/users | jq
```

### Session flow

Users authenticate via the web UI at `/login`. Sessions are stored in PostgreSQL with
rolling expiration (30 days, refreshed when more than 50% elapsed).

### API tokens

Generate tokens from the web UI at `/my/tokens` or via CLI:

```bash
$ pnpm create-api-token --email=user@example.com --name="CI/CD deploy"
```

Tokens are SHA-256 hashed before storage — the raw value is shown only once
at creation.

```bash
$ curl -H "Authorization: Bearer <token>" https://your-app.example.com/api/v1/contacts
```

### Password reset

Users can reset their password via `/reset-password`. A time-limited token
(30 minutes) is generated and stored in the database. The token is presented via
query parameter to `/change-password`.

### OpenID Connect

Authentication via an external OIDC provider (like [Authelia](https://www.authelia.com/))
using the [Arctic](https://arcticjs.dev/) library.

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

## Build and push container image

```bash
$ mise run build-image
$ mise run login-ghcr
$ mise run push-image
```

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
