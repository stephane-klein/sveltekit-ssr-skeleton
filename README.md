# SvelteKit SSR Stéphane Klein skeleton

> The 2023 version of my SvelteKit SSR skeleton is archived in the [skeleton-2023](https://github.com/stephane-klein/sveltekit-ssr-skeleton/tree/skeleton-2023) branch.

In July 2026, I decided to "reboot" my SvelteKit SSR skeleton, which serves as the foundation for my web application projects.

This new skeleton is built on top of [nodejs-pg-playground](https://github.com/stephane-klein/nodejs-pg-playground).

## Tech Stack

- Runtime: Node.js 24 (ESM)
- Package manager: pnpm
- Database: PostgreSQL 18
- SQL client: [postgres](https://github.com/porsager/postgres)
- Migrations: [postgres-shift](https://github.com/porsager/postgres-shift)
- Containers: Podman Compose
- Tooling: mise

## Roadmap:

- [ ] Gitleaks integration ([see](https://github.com/stephane-klein/sklein-devbox-chezmoi/tree/main/dot_config/opencode/skill/sklein-add-gitleaks))
- [ ] Implement `/version.json` ([see](https://github.com/stephane-klein/toggl-pg-mirror/commit/5e496a884c9165f1dc0ec515afba79c6e38b35cd))
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
$ mise install  # install Node.js and pnpm via mise
$ pnpm install
$ mise run up   # start PostgreSQL container
$ reload        # load environment variables
$ mise migrate  # run database migrations
$ mise seed     # populate with demo data
$ ./src/hello_world.js  # sample application
contacts: Result(3) [
  {
    id: '1',
    firstname: 'Alice',
    lastname: 'Martin',
    created_at: 2026-05-24T14:08:06.606Z
  },
  {
    id: '2',
    firstname: 'Bob',
    lastname: 'Durand',
    created_at: 2026-05-24T14:08:06.606Z
  },
  {
    id: '3',
    firstname: 'Charlie',
    lastname: 'Petit',
    created_at: 2026-05-24T14:08:06.606Z
  }
]
$ mise teardown # stop the database and delete all data

## Deployment Playground

The [`deployment-playground/`](./deployment-playground/) directory contains a local playground for testing the application in a production-like environment.
```


