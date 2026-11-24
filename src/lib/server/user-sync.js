// User sync batch planning. The route validates the batch, hashes passwords
// and token values outside the transaction, then asks this module what to
// write. planUserSync is pure: it reads existing rows and returns a decision.
// The route applies the decision with SQL and derives the summary from the
// plan, never from counters. planApiTokenChange() is the model this follows.
import { safeParse } from "valibot";
import { planApiTokenChange } from "./api-token-sync.js";
import { userSyncUpsertSchema } from "#lib/schemas/user.js";

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
    const { email: rawEmail, display_name, password, oidc_issuer, oidc_subject, tokens } = fields.output;
    const email = rawEmail?.trim();
    const displayName = display_name?.trim();
    const oidcIssuer = oidc_issuer?.replace(/\/$/, "").trim();
    const oidcSubject = oidc_subject?.trim();

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

// Decides the whole sync from rows already loaded from the database. The
// caller builds userIdByEmail (it generates the ids of new users), loads
// existingUsers and existingTokens, then applies the returned plan with SQL.
// The sets and maps it reads must be keyed exactly as the caller loaded them:
// existingTokens is keyed by `${userId}\u0000${name}`.
export function planUserSync({ items, userIdByEmail, deleteEmails, existingUsers, existingTokens }) {
    const rows = items.map((item) => ({
        item,
        userId: userIdByEmail.get(item.email),
        existing: existingUsers.get(item.email) ?? null,
    }));

    const userInserts = rows.filter((row) => !row.existing).map((row) => ({ userId: row.userId, ...row.item }));

    const userUpdates = rows
        .filter((row) => row.existing)
        .map((row) => ({ userId: row.userId, ...row.item, existing: row.existing }));

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
