import * as yaml from "js-yaml";

const templates = import.meta.glob("./*.yaml", {
    query: "?raw",
    import: "default",
    eager: true,
});

const cache = new Map();

function load(name) {
    const raw = templates[`./${name}.yaml`];
    if (!raw) throw new Error(`Template not found: ${name}`);

    return cache.get(name) ?? cache.set(name, yaml.load(raw)).get(name);
}

export function renderEmail(name, { link, locale }) {
    const tpl = load(name);
    const t = tpl[locale] || tpl.en;
    return {
        subject: t.subject,
        text: t.text.replaceAll("{{ link }}", link),
    };
}
