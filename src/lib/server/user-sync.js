// User sync batch planning. The route validates the batch, hashes passwords
// and token values outside the transaction, then asks this module what to
// write. planUserSync is pure: it reads existing rows and returns a decision.
// The route applies the decision with SQL and derives the summary from the
// plan, never from counters. planApiTokenChange() is the model this follows.
import { safeParse } from "valibot";
import { planApiTokenChange } from "./api-token-sync.js";
import { userSyncUpsertSchema } from "#lib/schemas/user.js";
import { normalizeUserFields } from "#lib/shared/user-fields.js";

export class SyncError extends Error {
    constructor(status, detail) {
        super(detail);
        this.status = status;
        this.detail = detail;
    }
}

export function validateTokenSync(tokens, email) {
    const seenUpsert = new Set();
    const seenDelete = new Set();

    const upsert = (tokens?.upsert ?? []).map((token) => {
        const name = token.name.trim();

        if (seenUpsert.has(name)) {
            throw new SyncError(422, `duplicate token name in upsert for ${email}: ${name}`);
        }
        seenUpsert.add(name);

        const expiresAt =
            token.expires_at === undefined ? undefined : token.expires_at === null ? null : new Date(token.expires_at);

        if (expiresAt && expiresAt.getTime() <= Date.now()) {
            throw new SyncError(422, `expires_at must be in the future for ${email}: ${name}`);
        }

        return {
            name,
            token: token.token ?? null,
            expiresAt,
        };
    });

    const deletes = (tokens?.delete ?? []).map((rawName) => {
        const name = rawName.trim();

        if (seenDelete.has(name)) {
            throw new SyncError(422, `duplicate token name in delete for ${email}: ${name}`);
        }
        seenDelete.add(name);

        return name;
    });

    const upsertNames = new Set(upsert.map((token) => token.name));
    const conflict = deletes.find((name) => upsertNames.has(name));
    if (conflict) {
        throw new SyncError(422, `token name present in both upsert and delete for ${email}: ${conflict}`);
    }

    return { upsert, delete: deletes };
}

export function validateUpsertItem(item) {
    const fields = safeParse(userSyncUpsertSchema, item);
    if (!fields.success) {
        throw new SyncError(400, fields.issues[0].message);
    }
    const { password, tokens } = fields.output;
    const { email, displayName, oidcIssuer, oidcSubject } = normalizeUserFields(fields.output);

    if (!email) throw new SyncError(400, "each upsert item must have a non-empty email");
    if (!displayName) throw new SyncError(400, "each upsert item must have a non-empty display_name");

    const hasOidc = oidcIssuer !== undefined || oidcSubject !== undefined;
    if ((oidcIssuer === undefined) !== (oidcSubject === undefined)) {
        throw new SyncError(422, "Both oidc_issuer and oidc_subject must be provided together");
    }

    return {
        email,
        displayName,
        password,
        oidcIssuer: oidcIssuer || null,
        oidcSubject: oidcSubject || null,
        hasOidc,
        tokens: validateTokenSync(tokens, email),
    };
}

function tokenKey(userId, name) {
    return `${userId}\u0000${name}`;
}

/**
 * Decides the whole sync from rows already loaded from the database.
 *
 * The caller builds userIdByEmail (it generates the ids of new users), loads
 * existingUsers and existingTokens, then applies the returned plan with SQL.
 * The sets and maps it reads must be keyed exactly as the caller loaded them:
 * existingTokens is keyed by `${userId}\u0000${name}`.
 *
 * Example:
 *
 * Input:
 *   items: [
 *     {
 *       email: "new@example.com",
 *       displayName: "New User",
 *       password: "secret",
 *       passwordHash: "argon2-secret",
 *       oidcIssuer: null,
 *       oidcSubject: null,
 *       tokens: {
 *         upsert: [
 *           { name: "ci", providedHash: null, generatedRaw: "raw-token",
 *             generatedHash: "generated-hash", expiresAt: null },
 *         ],
 *         delete: [],
 *       },
 *     },
 *     {
 *       email: "existing@example.com",
 *       displayName: "Existing User",
 *       password: null,
 *       passwordHash: null,
 *       oidcIssuer: null,
 *       oidcSubject: null,
 *       tokens: {
 *         upsert: [
 *           { name: "ci", providedHash: "provided-hash", generatedRaw: null,
 *             generatedHash: null, expiresAt: new Date("2027-01-01") },
 *         ],
 *         delete: ["old"],
 *       },
 *     },
 *   ]
 *   userIdByEmail: new Map([
 *     ["new@example.com", "user-new"],
 *     ["existing@example.com", "user-existing"],
 *   ])
 *   deleteEmails: ["gone@example.com"]
 *   existingUsers: new Map([
 *     ["existing@example.com", { id: "user-existing", password_hash: "stored-hash" }],
 *     ["gone@example.com", { id: "user-gone" }],
 *   ])
 *   existingTokens: new Map([
 *     ["user-existing\u0000ci", { id: "token-ci", token_hash: "old-ci-hash", expires_at: null }],
 *     ["user-existing\u0000old", { id: "token-old" }],
 *   ])
 *
 * Output:
 *   {
 *     userInserts: [
 *       { userId: "user-new", email: "new@example.com", displayName: "New User",
 *         passwordHash: "argon2-secret", oidcIssuer: null, oidcSubject: null },
 *     ],
 *     userUpdates: [
 *       { email: "existing@example.com", displayName: "Existing User",
 *         passwordHash: "stored-hash", oidcIssuer: null, oidcSubject: null },
 *     ],
 *     userDeletes: ["gone@example.com"],
 *     tokenInserts: [
 *       { userId: "user-new", name: "ci", tokenHash: "generated-hash", expiresAt: null },
 *     ],
 *     tokenUpdates: [
 *       { id: "token-ci", tokenHash: "provided-hash", expiresAt: new Date("2027-01-01") },
 *     ],
 *     tokenDeletes: ["token-old"],
 *     rawTokens: [
 *       { email: "new@example.com", name: "ci", token: "raw-token" },
 *     ],
 *     summary: {
 *       created: 1,
 *       updated: 1,
 *       deleted: 1,
 *       tokens: { created: 1, updated: 1, deleted: 1, unchanged: 0 },
 *     },
 *   }
 *
 * `hasOidc` and the raw `token` of each upsert are omitted; planUserSync does
 * not read them.
 */
export function planUserSync({ items, userIdByEmail, deleteEmails, existingUsers, existingTokens }) {
    const rows = items.map((item) => ({
        item,
        userId: userIdByEmail.get(item.email),
        existing: existingUsers.get(item.email) ?? null,
    }));

    const userInserts = rows
        .filter((row) => !row.existing)
        .map((row) => ({
            userId: row.userId,
            email: row.item.email,
            displayName: row.item.displayName,
            passwordHash: row.item.passwordHash,
            oidcIssuer: row.item.oidcIssuer,
            oidcSubject: row.item.oidcSubject,
        }));

    const userUpdates = rows
        .filter((row) => row.existing)
        .map((row) => ({
            email: row.item.email,
            displayName: row.item.displayName,
            passwordHash: row.item.password ? row.item.passwordHash : row.existing.password_hash,
            oidcIssuer: row.item.oidcIssuer,
            oidcSubject: row.item.oidcSubject,
        }));

    const tokenPlans = rows.flatMap((row) =>
        row.item.tokens.upsert.map((token) => {
            const existingToken = existingTokens.get(tokenKey(row.userId, token.name)) ?? null;

            return {
                ...planApiTokenChange({
                    existing: existingToken,
                    providedHash: token.providedHash,
                    generatedHash: token.generatedHash,
                    expiresAt: token.expiresAt,
                }),
                email: row.item.email,
                userId: row.userId,
                name: token.name,
                generatedRaw: token.generatedRaw,
                existingTokenId: existingToken?.id ?? null,
            };
        }),
    );

    const tokenInserts = tokenPlans
        .filter((tokenPlan) => tokenPlan.action === "created")
        .map((tokenPlan) => ({
            userId: tokenPlan.userId,
            name: tokenPlan.name,
            tokenHash: tokenPlan.tokenHash,
            expiresAt: tokenPlan.expiresAt,
        }));

    const tokenUpdates = tokenPlans
        .filter((tokenPlan) => tokenPlan.action === "updated")
        .map((tokenPlan) => ({
            id: tokenPlan.existingTokenId,
            tokenHash: tokenPlan.tokenHash,
            expiresAt: tokenPlan.expiresAt,
        }));

    const tokenDeletes = rows.flatMap((row) =>
        row.item.tokens.delete
            .map((name) => existingTokens.get(tokenKey(row.userId, name)))
            .filter((existingToken) => existingToken !== undefined)
            .map((existingToken) => existingToken.id),
    );

    const userDeletes = deleteEmails.filter((email) => existingUsers.has(email));

    const rawTokens = tokenPlans
        .filter((tokenPlan) => tokenPlan.generated && tokenPlan.action === "created")
        .map((tokenPlan) => ({ email: tokenPlan.email, name: tokenPlan.name, token: tokenPlan.generatedRaw }));

    const tokenCount = (action) => tokenPlans.filter((tokenPlan) => tokenPlan.action === action).length;

    return {
        userInserts,
        userUpdates,
        userDeletes,
        tokenInserts,
        tokenUpdates,
        tokenDeletes,
        rawTokens,
        summary: {
            created: userInserts.length,
            updated: userUpdates.length,
            deleted: userDeletes.length,
            tokens: {
                created: tokenCount("created"),
                updated: tokenCount("updated"),
                deleted: tokenDeletes.length,
                unchanged: tokenCount("unchanged"),
            },
        },
    };
}
