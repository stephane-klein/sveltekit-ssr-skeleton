# SvelteKit SSR Stéphane Klein skeleton

> The 2023 version of my SvelteKit SSR skeleton is archived in the [skeleton-2023](https://github.com/stephane-klein/sveltekit-ssr-skeleton/tree/skeleton-2023) branch.

In July 2026, I decided to "reboot" my SvelteKit SSR skeleton, which serves as the foundation for my web application projects.

This new skeleton is built on top of [nodejs-pg-playground](https://github.com/stephane-klein/nodejs-pg-playground).

Roadmap:

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
