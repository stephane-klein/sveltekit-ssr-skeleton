import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));

const cache = {};

function load(name) {
    if (!cache[name]) {
        const file = readFileSync(join(__dirname, `${name}.yaml`), "utf8");
        cache[name] = yaml.load(file);
    }
    return cache[name];
}

export function renderEmail(name, { link, locale }) {
    const templates = load(name);
    const t = templates[locale] || templates.en;
    return {
        subject: t.subject,
        text: t.text.replaceAll("{{ link }}", link),
    };
}
