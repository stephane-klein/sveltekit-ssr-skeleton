---
status: accepted
date: 2026-11-24
decision-makers: Stéphane Klein
ai-assistants: DeepSeek V4.1 Flash (OpenCode Go)
---

# ADR 003 — Three layers for agent instructions

## Context and Problem Statement

AI coding agents working in this repository need three kinds of knowledge:

- rules that apply to every task (language policy, package manager, database
  doctrine, authentication guards);
- procedures for a specific task (create an ADR, run a refactor, review a change);
- reference material about how a subsystem works (i18n, stored SQL functions,
  metrics).

Today these three kinds compete for the same places. `AGENTS.md` is loaded in
every session, so it tends to absorb procedures and reference until it becomes a
long document that agents skim. `docs/agents/` holds the reference, but nothing
triggers a read when a task needs it. Skills are advertised and loadable on
demand, but they are specific to the harness that discovers them.

The cost is measurable. The "Node.js Paradigms" section has been in `AGENTS.md`
since the initial commit `ea091be` (2026-07-04). It asks for `.map()` and
`.filter()` over imperative loops, and no mutations. Yet
`src/routes/(api)/api/v1/admin/users/sync/+server.js`, added in `90042ba`
(2026-08-20), is a 335-line handler that validates input, hashes secrets, writes
in a transaction and counts results with nine `for` loops, mutable counters and
`.push()` accumulators. The rule was present; it was not applied. A general
preference is not a reliable trigger.

The case is an illustration, not the whole argument. The repository has no
defined place for each kind of knowledge, so every agent improvises.

## Decision Drivers

- Reliability: an agent finds the rule or the procedure when the task matches.
- Low context cost: a session loads only what it needs.
- Portability: reference material stays readable by humans and by tools other
  than OpenCode.
- Single source per fact: no duplication across layers.
- Human readability and review: the documents live in the repository and follow
  the normal review process.
- Maintainability: few conventions, stable paths, no adapters.

## Considered Options

- **A. Everything in `AGENTS.md`** — one file, always loaded.
- **B. Everything in skills** — every rule and reference becomes a skill.
- **C. Everything in `docs/agents/`** — one reference directory, read on demand.
- **D. Three layers with cross-links** — always-on rules in `AGENTS.md`,
  procedures in skills, reference in `docs/agents/`, rationale in
  `docs/decisions/`.

## Decision Outcome

Chosen option: **D. Three layers with cross-links**.

The live rules are in
[`docs/agents/agent-documentation.md`](../agents/agent-documentation.md). This
record keeps the context, the decision and the consequences; it does not
duplicate the rules.

### Layers

- `AGENTS.md` — always-on rules, approved exceptions, definition of done,
  routing.
- `.agents/skills/<skill-id>/SKILL.md` — short procedures with a trigger.
- `docs/agents/<topic>.md` — reference: architecture, invariants, gotchas,
  examples.
- `docs/decisions/` — rationale and rejected options; not loaded at runtime.

### Cross-links

A fact lives in one layer. Other mentions are links, not copies. The direction
is `AGENTS.md` → skill → `docs/agents/`; a reference may name a skill as an
adapter, but it must stand alone.

### Skills location

Skills live in `.agents/skills/<skill-id>/SKILL.md`, the harness-neutral Agent
Skills location. OpenCode reads it as a project compatibility source; Codex,
Gemini CLI, Cursor, Kiro and other compatible tools read it too. No skill goes
into `.opencode/skills/`. Duplicating a skill across `.agents/skills`,
`.claude/skills` and `.opencode/skills` creates precedence conflicts that differ
by tool: OpenCode ranks `.opencode/skills` above `.agents/skills`, and
`.agents/skills` above `.claude/skills`.

Claude Code does not read `.agents/skills/` as of 2026-11-24. Native support is
tracked in
[anthropics/claude-code#31005](https://github.com/anthropics/claude-code/issues/31005).
We do not add `.claude/skills` symlinks. The workaround creates a second layout,
depends on symlink support in git and on the developer's platform, and duplicates
the maintenance that the standard is meant to remove. Claude Code reads the
project `AGENTS.md` since v2.1.277, so the always-on rules apply; a skill file can
be opened manually. Revisit this decision when #31005 ships: the migration is
then a no-op, because the files already live in `.agents/skills/`.

### Agent prompts

Agent prompts live in `.opencode/agents/<name>.md`. This is an OpenCode-specific
exception: there is no harness-neutral convention for agent prompts, unlike
skills. Do not copy or symlink them into `.claude/agents/`. Revisit if a neutral
convention appears.

### Auto-invocation

A visible skill is the default; its description is the trigger. A skill is hidden
with `disable-model-invocation: true` only when it is destructive, expensive and
rare, phase-specific, or its description would match unrelated tasks. A hidden
skill is named with its exact ID in `AGENTS.md` or an agent prompt. The reference
holds the criteria and the trigger rule.

### Consequences

- Good, because each kind of knowledge has one home, and the always-on rules stay
  visible.
- Good, because the reference remains portable and readable without OpenCode.
- Good, because a hidden skill still has a deterministic trigger.
- Good, because the day Claude Code supports `.agents/skills/`, no migration is
  needed.
- Bad, because three places must be maintained, and discipline is required to
  avoid duplication and circular links.
- Bad, because Claude Code does not discover skills until #31005 is fixed.
- Bad, because agent prompts are OpenCode-specific: a refactor subagent, if one
  is ever created, would not be available to Claude Code users.
- Neutral, because skills are optional: the rules and the reference remain useful
  without them.
- Neutral, because `AGENTS.md` grows by a few routing lines, not by whole
  procedures.

## Pros and Cons of the Options

### A. Everything in AGENTS.md

- Good, because one file is always loaded and impossible to miss.
- Bad, because every session pays the context cost of every procedure and every
  reference.
- Bad, because long prose dilutes the rules that matter, as the `sync` handler
  shows.
- Bad, because there is no trigger, no permission control, and no way to load a
  long procedure on demand.

### B. Everything in skills

- Good, because skills are advertised, loadable on demand, and permissioned.
- Good, because `disable-model-invocation` provides an explicit trigger.
- Bad, because skills are specific to the harness that discovers them, and the
  repository would depend on OpenCode.
- Bad, because reference material is framed as instructions, which is the wrong
  frame for architecture notes and gotchas.
- Bad, because every skill description costs a line in every step.

### C. Everything in docs/agents/

- Good, because it is portable, human-readable, and costs nothing until read.
- Bad, because nothing triggers a read: the agent must know the path and decide
  to open it.
- Bad, because there is no permission control and no explicit invocation.

### D. Three layers with cross-links

- Good, because each kind of knowledge lives where it is loaded at the right
  moment.
- Good, because the reference is portable and the procedures are loadable.
- Good, because a hidden skill can be triggered by an exact instruction.
- Bad, because three places and a set of link conventions must be maintained.

## More Information

- [`docs/agents/agent-documentation.md`](../agents/agent-documentation.md) —
  operational guide for the three layers.
- [`AGENTS.md`](../../AGENTS.md) — always-on rules and routing.
- [`.agents/skills/new-decision/`](../../.agents/skills/new-decision/) — the first
  skill in the neutral location.
- [OpenCode skills documentation](https://opencode.ai/docs/skills).
- [OpenCode agents documentation](https://opencode.ai/docs/agents).
- [Claude Code skills documentation](https://code.claude.com/docs/en/skills).
- [anthropics/claude-code#31005](https://github.com/anthropics/claude-code/issues/31005)
  — native `.agents/skills/` support in Claude Code.
- [openchamber-context](https://github.com/MltStephane/openchamber-context) — an
  OpenChamber extension used in this project to observe the context cost of the
  harness configuration. It breaks down skills, MCP instructions, instruction
  files, tools and messages.
