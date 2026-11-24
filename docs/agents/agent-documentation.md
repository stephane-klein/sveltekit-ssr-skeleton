# Agent Documentation Layers

## Purpose

This document defines where agent knowledge lives in this repository, how each
layer is written, and how the layers reference each other. It is the reference;
the `agent-config-change` skill holds the procedure, the move/remove steps and the
review checklist. It is the operational companion of
[ADR 003](../decisions/2026-11_003-agent-documentation-layers.md).

## The three layers

| Layer     | Path                                 | Content                                                                          | Loaded by                            |
| :-------- | :----------------------------------- | :------------------------------------------------------------------------------- | :----------------------------------- |
| Norm      | `AGENTS.md`                          | rules that apply to every task, approved exceptions, definition of done, routing | every session                        |
| Procedure | `.agents/skills/<skill-id>/SKILL.md` | a short sequence of steps with a trigger                                         | the model, on demand, or `@skill-id` |
| Reference | `docs/agents/<topic>.md`             | architecture, invariants, gotchas, examples                                      | `read`, on demand                    |
| Rationale | `docs/decisions/`                    | context, options, consequences                                                   | never at runtime                     |

The norm is always visible. The procedure is loaded when the task matches. The
reference is opened when the procedure or the task needs the details. The
rationale is read by humans and by agents that need to understand a choice.

## Where does this content go?

| Question                                                          | Destination                                      |
| :---------------------------------------------------------------- | :----------------------------------------------- |
| Does the rule apply to every task?                                | `AGENTS.md`                                      |
| Is it a historical rationale, an option, a consequence?           | `docs/decisions/`                                |
| Is it a short sequence of steps with a trigger?                   | `.agents/skills/<skill-id>/SKILL.md`             |
| Is it an agent execution profile (tools, model, permissions)?     | `.opencode/agents/<name>.md` (ADR 003 exception) |
| Is it an explanation of a subsystem, with invariants and gotchas? | `docs/agents/<topic>.md`                         |
| Is it a checklist the agent must run?                             | a skill, or `AGENTS.md` if it is always-on       |
| Is it a command to run?                                           | a skill, or `AGENTS.md` if it is always-on       |

When two answers seem possible, choose the layer that matches the **loading
moment**, not the topic.

## One fact, one home

A fact lives in exactly one layer. Every other mention is a link.

- Do not copy a procedure into `AGENTS.md` and into a skill.
- Do not copy a reference section into a skill.
- Do not copy a rule into `docs/agents/`.
- When a document needs a fact from another layer, link to it with the exact path
  or ID.

Links are navigation. They are not a way to have two sources of truth.

## `AGENTS.md` rules

- Keep it within the size budget enforced by `scripts/check-agent-docs.js`. It
  is loaded in every session, including sessions unrelated to the topic.
- It contains always-on rules, approved exceptions, the definition of done, and
  routing.
- It may mention a skill by ID in two cases:
  - the skill is hidden (`disable-model-invocation: true`), so the model cannot
    see it in the skill list;
  - the skill must be loaded at a precise moment, and the description alone is
    not enough.
- A mention uses the exact ID and a one-line purpose: ``For multi-file JavaScript refactors, load the `node-refactor` skill.``
- Do not list every visible skill. Its description is already advertised at each
  step; repeating it turns `AGENTS.md` into a second catalog.
- Do not put a procedure or a reference in `AGENTS.md`. Link to the skill or the
  document.
- Keep the `Supplementary Documentation` section up to date; it is the routing
  table.

## Skill rules

- One procedure per skill. If a skill needs two unrelated procedures, split it.
- The `description` says when to use the skill, in the user's or the agent's
  terms. It is the trigger.
- The body contains steps, a checklist, and a verification. Keep the body within
  the size budget; the details belong to `docs/agents/`.
- The skill stays actionable on its own for the common case. It may say: ``Read `docs/agents/node-paradigms.md` for the exceptions and examples.``
- Use the portable frontmatter subset:

  ```yaml
  ---
  name: skill-id
  description: What the skill does and when to use it
  disable-model-invocation: true # optional; hide from automatic invocation
  ---
  ```

- Avoid tool-specific syntax in the body: no `` !`command` `` blocks, no
  `${CLAUDE_PROJECT_DIR}`. OpenCode passes them through literally.
- Location: `.agents/skills/<skill-id>/SKILL.md`. No new skill in
  `.opencode/skills/`, and no copy or symlink in `.claude/skills/`.

## `docs/agents/` rules

- It contains reference material: architecture, data flow, invariants, gotchas,
  examples, and the commands that are useful to understand the subsystem.
- It is not a procedure and not a set of always-on rules.
- It must stand alone: a reader who does not use OpenCode must be able to
  understand it.
- It may name a skill as an adapter: ``In OpenCode, the procedure is the `node-refactor` skill. With another tool, follow the checklist in section X.``
- Add it to [`docs/agents/README.md`](./README.md).
- When the subsystem changes, update the document. It is an operational snapshot,
  not a historical record.

## `docs/decisions/` rules

- It records the context, the options, the decision, and the consequences.
- It is not loaded at runtime. It explains why, not how.
- Add it to [`docs/decisions/README.md`](../decisions/README.md).
- The reference is the live rule. Change it when the rules change; write a new
  decision only when the decision itself changes.

## Cross-link rules

- The direction is `AGENTS.md` → skill → `docs/agents/`.
- A reference document may point back to a skill as an adapter, but the content
  must not depend on it.
- Use exact IDs and paths in backticks.
- One hop: do not require three documents to reach a rule.
- When a file is renamed, update the pointers in the same change.

## Auto-invocation policy

- Visible by default. The description is the trigger.
- `disable-model-invocation: true` hides a skill from automatic invocation.
  OpenCode and Claude Code both honour it.
- Hide a skill only when at least one of these holds:
  - it can perform a destructive or irreversible action;
  - it is expensive to load and needed only occasionally; split the reference
    into `docs/agents/` before hiding it;
  - it belongs to a phase the user starts explicitly (implementation, release,
    incident response);
  - its description would match many unrelated tasks, and no precise wording
    fixes it.
- Specificity alone is not a reason to hide. A big skill is a design smell:
  split it before hiding it.
- A hidden skill must be named in `AGENTS.md` or in an agent prompt, with the
  exact ID. Otherwise the model cannot know it exists.
- A hidden skill that is never named is dead weight.
- A hidden skill keeps its `description`: it serves humans and `@skill-id`
  invocation.

## Size budgets

`scripts/check-agent-docs.js` enforces the size budgets. When a budget is
exceeded, move content to the next layer: a rule to `AGENTS.md`, a procedure to a
skill, a reference to `docs/agents/`.

## User configuration boundary

The repository does not depend on `~/.config/opencode/`. Do not point to a
user-level path from `AGENTS.md` or `docs/agents/`. If a global rule is needed in
the repository, copy it into `docs/agents/` and record the reason in the change
report.

## Subagents

Agent prompts live in `.opencode/agents/<name>.md`. This is an OpenCode-specific
exception, recorded in ADR 003: there is no harness-neutral convention for agent
prompts, unlike skills. Do not copy or symlink them into `.claude/agents/`.
Revisit if a neutral convention appears.

## Worked examples

### `new-decision` — a visible skill

- `AGENTS.md` lists it in `Supplementary Documentation`.
- `.agents/skills/new-decision/SKILL.md` contains the procedure.
- `docs/decisions/` contains the result and the rationale.

The skill is visible, so the description triggers it. `AGENTS.md` does not repeat
the procedure; it only names the skill.

### A hidden refactor skill

This example is illustrative; the skill is not created yet.

- `AGENTS.md` already carries the trigger: ``Before writing or refactoring
JavaScript, read `docs/agents/node-paradigms.md`.`` It stays in place until a
  multi-file refactor ignores it.
- If that happens, `.agents/skills/node-refactor/SKILL.md` is created with
  `disable-model-invocation: true`, named with its exact ID in `AGENTS.md`; it
  reads `docs/agents/node-paradigms.md`, applies the review questions, and runs
  `pnpm check:agents`, `pnpm check` and `pnpm test`.
- `docs/agents/node-paradigms.md` contains the examples, the exceptions, and the
  review questions. The rules themselves stay in `AGENTS.md`. It may say:
  ``In OpenCode, the procedure is the `node-refactor` skill.``

The content lives in the reference document. The skill would carry the
procedure. `AGENTS.md` carries the trigger. None of them duplicates another.
