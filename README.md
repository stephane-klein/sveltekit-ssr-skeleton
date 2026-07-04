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
- Containers: Podman Compose
- Secret detection: [gitleaks](https://github.com/gitleaks/gitleaks)
- Tooling: mise

## Roadmap:

- [x] Implement `/version.json` ([see](https://github.com/stephane-klein/toggl-pg-mirror/commit/5e496a884c9165f1dc0ec515afba79c6e38b35cd))
- [ ] Implement a HelmChart package ([see](https://github.com/stephane-klein/toggl-pg-mirror/tree/main/helm/toggl-pg-mirror))
- [ ] Implement an authentication system based on the recommendations from https://lucia-auth.com/
  - [ ] Allow API endpoint access with API tokens
  - [ ] Allow web login with OpenID Connect 1.0 ([Authelia](https://www.authelia.com/overview/authorization/openid-connect-1.0/))
- [ ] Tailwind CSS integration

## AI-Assisted Development

This project was developed using:

- [OpenCode](https://opencode.ai) CLI — coding assistant workflow (not vibe coding)
- Models: DeepSeek V4 Flash (OpenCode Go)

## Principles

- Monorepository and monolithic application pattern ([notes](https://notes.sklein.xyz/2025-05-06_2224/zen/))
- Raw SQL — no ORM
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
$ mise run dev      # start SvelteKit dev server on http://localhost:5173
```

Open http://localhost:5173 in your browser.

## Deployment Playground

The [`deployment-playground/`](./deployment-playground/) directory contains a local playground for testing the application in a production-like environment.

## Contribution

### Secret detection with gitleaks

[Gitleaks](https://github.com/gitleaks/gitleaks) scans for secrets before they
reach the remote repository.

- **`git commit`** — the `git-hooks/pre-commit` hook checks staged files.

Configuration is in `.gitleaks.toml`.

**One-time setup after clone:**

```
mise install
mise run setup-git-hooks
```

**Manual scan** (outside of hooks):

```
mise run gitleaks-scan        # full project scan
mise run gitleaks-check-push  # pre-push scan
```


