#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";

const root = fileURLToPath(new URL("..", import.meta.url));
const errors = [];
const fail = (message) => errors.push(message);
const read = (path) => readFileSync(join(root, path), "utf8");
const countLines = (text) => text.trimEnd().split("\n").length;

const BUDGETS = {
    agentsMaxLines: 250,
    skillBodyMaxLines: 100,
    descriptionMaxChars: 200,
};

const agents = read("AGENTS.md");

const checkSkills = () => {
    const skillsDir = join(root, ".agents/skills");
    if (!existsSync(skillsDir)) {
        fail(".agents/skills does not exist");
        return;
    }

    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;

        const skillPath = `.agents/skills/${entry.name}/SKILL.md`;
        if (!existsSync(join(root, skillPath))) {
            fail(`${skillPath} is missing`);
            continue;
        }

        const content = read(skillPath);
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
        if (!match) {
            fail(`${skillPath} has no frontmatter`);
            continue;
        }

        let data;
        try {
            data = yaml.load(match[1]) ?? {};
        } catch (error) {
            fail(`${skillPath} has invalid frontmatter: ${error.message}`);
            continue;
        }

        if (data.name !== entry.name) {
            fail(`${skillPath} name "${data.name}" does not match directory "${entry.name}"`);
        }

        if (!data.description) {
            fail(`${skillPath} has no description`);
        } else if (String(data.description).length > BUDGETS.descriptionMaxChars) {
            fail(
                `${skillPath} description is ${String(data.description).length} characters, limit is ${BUDGETS.descriptionMaxChars}`,
            );
        }

        const bodyLines = countLines(content.slice(match[0].length));
        if (bodyLines > BUDGETS.skillBodyMaxLines) {
            fail(`${skillPath} body is ${bodyLines} lines, limit is ${BUDGETS.skillBodyMaxLines}`);
        }

        if (data["disable-model-invocation"] === true && !agents.includes(entry.name)) {
            fail(`${skillPath} is hidden but not named in AGENTS.md`);
        }
    }
};

const checkReadmeIndex = (directory, readmePath) => {
    const readme = read(readmePath);
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "README.md") continue;
        if (!readme.includes(entry.name)) {
            fail(`${directory}/${entry.name} is not listed in ${readmePath}`);
        }
    }
};

const checkHarnessDirectories = () => {
    for (const directory of [".opencode/skills", ".claude/skills"]) {
        if (existsSync(join(root, directory))) {
            fail(`${directory} must not exist`);
        }
    }
};

const checkAgentsPaths = () => {
    const pathPrefixes = [
        "src/",
        "docs/",
        "sqls/",
        "test/",
        "scripts/",
        "messages/",
        ".agents/",
        ".opencode/",
        "build/",
        "dist/",
    ];
    const pathFiles = new Set([
        "AGENTS.md",
        "README.md",
        "package.json",
        "pnpm-lock.yaml",
        "eslint.config.js",
        "prettier.config.js",
        "vite.config.js",
        "uno.config.ts",
        "Containerfile",
        "entrypoint.sh",
    ]);
    const ignoredPaths = ["build/", "dist/", ".svelte-kit/", "node_modules/", "src/lib/paraglide/", "src/lib/backend/"];

    const looksLikePath = (span) => {
        if (span.includes(" ") || span.includes("...")) return false;
        if (/^(https?:|@|\/|~|#|\$)/.test(span)) return false;
        if (pathFiles.has(span)) return true;
        return pathPrefixes.some((prefix) => span.startsWith(prefix));
    };

    const spans = [...agents.matchAll(/`([^`\n]+)`/g)].map((match) => match[1]);
    for (const span of new Set(spans)) {
        if (!looksLikePath(span)) continue;
        if (ignoredPaths.some((ignored) => span === ignored || span.startsWith(ignored))) continue;
        if (!existsSync(join(root, span))) {
            fail(`AGENTS.md references a missing path: ${span}`);
        }
    }
};

checkSkills();

const agentsLines = countLines(agents);
if (agentsLines > BUDGETS.agentsMaxLines) {
    fail(`AGENTS.md is ${agentsLines} lines, limit is ${BUDGETS.agentsMaxLines}`);
}

checkReadmeIndex("docs/agents", "docs/agents/README.md");
checkReadmeIndex("docs/decisions", "docs/decisions/README.md");
checkHarnessDirectories();
checkAgentsPaths();

if (errors.length > 0) {
    console.error("Agent documentation checks failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
}

console.log("Agent documentation checks passed.");
