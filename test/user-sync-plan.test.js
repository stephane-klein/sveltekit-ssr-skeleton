import assert from "node:assert/strict";
import test from "node:test";

import { planUserSync, SyncError, validateTokenSync } from "../src/lib/server/user-sync.js";

const USER_ID = "user-1";

function item({ email = "user@example.com", tokens = { upsert: [], delete: [] } } = {}) {
    return {
        email,
        displayName: "User",
        password: null,
        oidcIssuer: null,
        oidcSubject: null,
        hasOidc: false,
        tokens,
    };
}

function prepared({ tokens = { upsert: [], delete: [] }, ...overrides } = {}) {
    return {
        passwordHash: null,
        ...item(),
        ...overrides,
        tokens,
    };
}

function fixture({ existing = null, items = [prepared()], deleteEmails = [] } = {}) {
    const existingUsers = new Map(existing ? [[existing.email, existing]] : []);
    const existingTokens = new Map((existing?.tokens ?? []).map((token) => [`${USER_ID}\u0000${token.name}`, token]));
    const userIdByEmail = new Map([[items[0].email, existing?.id ?? USER_ID]]);

    return planUserSync({ items, userIdByEmail, deleteEmails, existingUsers, existingTokens });
}

test("plans an insert for a new user", () => {
    const plan = fixture();

    assert.deepEqual(plan.userInserts, [
        {
            userId: USER_ID,
            email: "user@example.com",
            displayName: "User",
            passwordHash: null,
            oidcIssuer: null,
            oidcSubject: null,
        },
    ]);
    assert.equal(plan.userUpdates.length, 0);
    assert.equal(plan.userDeletes.length, 0);
    assert.equal(plan.summary.created, 1);
    assert.equal(plan.summary.updated, 0);
});

test("plans an update for an existing user and keeps the stored hash", () => {
    const existing = { id: USER_ID, email: "user@example.com", password_hash: "stored" };
    const plan = fixture({ existing });

    assert.equal(plan.userInserts.length, 0);
    assert.deepEqual(plan.userUpdates, [
        {
            email: "user@example.com",
            displayName: "User",
            passwordHash: "stored",
            oidcIssuer: null,
            oidcSubject: null,
        },
    ]);
    assert.equal(plan.summary.updated, 1);
});

test("uses the supplied password hash for an existing user", () => {
    const existing = { id: USER_ID, email: "user@example.com", password_hash: "stored" };
    const plan = fixture({
        existing,
        items: [prepared({ password: "new-password", passwordHash: "new-hash" })],
    });

    assert.equal(plan.userUpdates[0].passwordHash, "new-hash");
});

test("plans a generated token and surfaces it once as a raw token", () => {
    const plan = fixture({
        items: [
            prepared({
                tokens: {
                    upsert: [
                        {
                            name: "demo",
                            providedHash: null,
                            generatedRaw: "raw",
                            generatedHash: "h".repeat(64),
                            expiresAt: null,
                        },
                    ],
                    delete: [],
                },
            }),
        ],
    });

    assert.deepEqual(plan.tokenInserts, [
        { userId: USER_ID, name: "demo", tokenHash: "h".repeat(64), expiresAt: null },
    ]);
    assert.deepEqual(plan.rawTokens, [{ email: "user@example.com", name: "demo", token: "raw" }]);
    assert.equal(plan.summary.tokens.created, 1);
    assert.equal(plan.summary.tokens.updated, 0);
    assert.equal(plan.summary.tokens.unchanged, 0);
});

test("keeps clear passwords and raw tokens out of the user write rows", () => {
    const plan = fixture({
        items: [
            prepared({
                password: "clear-password",
                passwordHash: "hashed-password",
                tokens: {
                    upsert: [
                        {
                            name: "demo",
                            providedHash: null,
                            generatedRaw: "raw-token",
                            generatedHash: "h".repeat(64),
                            expiresAt: null,
                        },
                    ],
                    delete: [],
                },
            }),
        ],
    });

    assert.equal("password" in plan.userInserts[0], false);
    assert.equal("tokens" in plan.userInserts[0], false);
    assert.deepEqual(plan.rawTokens, [{ email: "user@example.com", name: "demo", token: "raw-token" }]);
});

test("plans no token change when the supplied value matches", () => {
    const hash = "h".repeat(64);
    const existing = {
        id: USER_ID,
        email: "user@example.com",
        password_hash: "stored",
        tokens: [{ id: "token-1", name: "demo", token_hash: hash, expires_at: null }],
    };
    const plan = fixture({
        existing,
        items: [
            prepared({
                tokens: {
                    upsert: [
                        {
                            name: "demo",
                            providedHash: hash,
                            generatedRaw: null,
                            generatedHash: null,
                            expiresAt: undefined,
                        },
                    ],
                    delete: [],
                },
            }),
        ],
    });

    assert.equal(plan.tokenInserts.length, 0);
    assert.equal(plan.tokenUpdates.length, 0);
    assert.deepEqual(plan.rawTokens, []);
    assert.equal(plan.summary.tokens.unchanged, 1);
});

test("plans a token update when the hash or the expiration changes", () => {
    const nextExpiresAt = new Date("2028-01-01T00:00:00Z");
    const existing = {
        id: USER_ID,
        email: "user@example.com",
        password_hash: "stored",
        tokens: [{ id: "token-1", name: "demo", token_hash: "h".repeat(64), expires_at: null }],
    };
    const plan = fixture({
        existing,
        items: [
            prepared({
                tokens: {
                    upsert: [
                        {
                            name: "demo",
                            providedHash: "i".repeat(64),
                            generatedRaw: null,
                            generatedHash: null,
                            expiresAt: nextExpiresAt,
                        },
                    ],
                    delete: [],
                },
            }),
        ],
    });

    assert.deepEqual(plan.tokenUpdates, [{ id: "token-1", tokenHash: "i".repeat(64), expiresAt: nextExpiresAt }]);
    assert.equal(plan.summary.tokens.updated, 1);
});

test("plans a delete only for tokens that exist", () => {
    const existing = {
        id: USER_ID,
        email: "user@example.com",
        password_hash: "stored",
        tokens: [{ id: "token-1", name: "demo", token_hash: "h".repeat(64), expires_at: null }],
    };
    const plan = fixture({
        existing,
        items: [prepared({ tokens: { upsert: [], delete: ["demo", "missing"] } })],
    });

    assert.deepEqual(plan.tokenDeletes, ["token-1"]);
    assert.equal(plan.summary.tokens.deleted, 1);
});

test("plans a user delete only for users that exist", () => {
    const existing = { id: USER_ID, email: "user@example.com", password_hash: "stored" };
    const plan = fixture({ existing, deleteEmails: ["user@example.com", "gone@example.com"] });

    assert.deepEqual(plan.userDeletes, ["user@example.com"]);
    assert.equal(plan.summary.deleted, 1);
});

test("rejects a token name present in both upsert and delete", () => {
    assert.throws(
        () =>
            validateTokenSync(
                { upsert: [{ name: " demo ", expires_at: undefined }], delete: ["demo"] },
                "user@example.com",
            ),
        (err) => err instanceof SyncError && err.status === 422 && /both upsert and delete/.test(err.detail),
    );
});
