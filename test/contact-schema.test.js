import assert from "node:assert/strict";
import test from "node:test";

import { safeParse } from "valibot";

import { contactCreateSchema, contactUpdateSchema } from "../src/lib/server/contact-schema.js";

test("create requires lastname", () => {
    const result = safeParse(contactCreateSchema, { firstname: "Alice" });

    assert.equal(result.success, false);
    assert.match(result.issues[0].message, /lastname/);
});

test("create rejects a blank lastname", () => {
    const result = safeParse(contactCreateSchema, { firstname: "Alice", lastname: "   " });

    assert.equal(result.success, false);
    assert.match(result.issues[0].message, /lastname/);
});

test("create accepts both names", () => {
    const result = safeParse(contactCreateSchema, { firstname: "Alice", lastname: "Martin" });

    assert.equal(result.success, true);
    assert.deepEqual(result.output, { firstname: "Alice", lastname: "Martin" });
});

test("update accepts a single field", () => {
    const result = safeParse(contactUpdateSchema, { firstname: "Alice" });

    assert.equal(result.success, true);
    assert.equal(result.output.firstname, "Alice");
    assert.equal(result.output.lastname, undefined);
});

test("update rejects an explicit null lastname", () => {
    const result = safeParse(contactUpdateSchema, { lastname: null });

    assert.equal(result.success, false);
    assert.match(result.issues[0].message, /lastname/);
});
