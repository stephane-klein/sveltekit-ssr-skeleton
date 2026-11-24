---
name: agent-config-change
description: Use when adding, moving or removing an AGENTS.md rule, a skill, a subagent or a docs/agents reference in this project.
disable-model-invocation: true
---

# Agent configuration change

Read `docs/agents/agent-documentation.md` first. It defines the layers, the
invariants, the size budgets and the approved exceptions. This skill is the
procedure and its verification; it does not restate them.

0. Stop and ask when the content fits two layers, when it duplicates a
   user-level rule, or when it needs a layer that does not exist. A second home
   is worse than a missing document.
1. Classify the content with the table in the reference.
2. Write it in one layer. Replace every other mention with a link.
3. When moving or removing, find every reference first:
   `rg -n '<old-id>|<old-path>' AGENTS.md docs .agents`.
   Update each hit, then delete the old file and its README entry.
4. For a skill:
   - one procedure per skill, body within the budget;
   - the `description` states the trigger and stays within the budget;
   - `disable-model-invocation: true` only for a destructive, expensive/rare or
     phase-specific procedure;
   - a hidden skill is named with its exact ID in `AGENTS.md` or an agent prompt;
   - no copy in `.claude/skills/` or `.opencode/skills/`.
5. For a reference document: add or move its entry in `docs/agents/README.md`,
   make it stand alone, and mention a skill only as an adapter.
6. For a decision record: use the `new-decision` skill, update
   `docs/decisions/README.md`, and link the live rule instead of copying it.
7. Keep `AGENTS.md` within its budget. Update its routing in the same change,
   remove dead references, and apply its `Documentation Maintenance` rule.
8. For an agent prompt: create `.opencode/agents/<name>.md`. This is the
   OpenCode-specific exception recorded in ADR 003. Do not copy or symlink it in
   `.claude/agents/`.
9. Verify: `pnpm check:agents`, then
   `pnpm exec prettier --check <changed files>`; run `pnpm test` if code changed.
10. Run the review checklist below.
11. Report in four lines: layer, files, links added or removed, intentional
    exception.

## Review checklist

- [ ] The content is in the right layer.
- [ ] The fact appears once; the other mentions are links.
- [ ] `AGENTS.md` is still within its budget.
- [ ] A hidden skill has an exact trigger in `AGENTS.md` or an agent prompt.
- [ ] The skill is actionable on its own.
- [ ] The reference document stands alone.
- [ ] IDs and paths are exact.
- [ ] The content is in English.
- [ ] The new file is listed in its `README.md`.
