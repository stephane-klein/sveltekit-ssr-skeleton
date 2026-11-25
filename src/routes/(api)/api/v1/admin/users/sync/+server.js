import { generateApiTokenSecret, generateId, hashPassword, hashToken } from "#lib/server/auth.js";
import { SyncError, planUserSync, validateUpsertItem } from "#lib/server/user-sync.js";
import { sql } from "#lib/server/pg.js";
import { problem } from "#lib/server/problem.js";
import { requireAdminToken } from "../../_helpers.js";

const MAX_BATCH_SIZE = 1000;

function conflictDetail(err) {
    if (err.constraint_name === "users_email_key") return "A user with this email already exists";
    if (err.constraint_name === "idx_users_oidc") return "A user with this OIDC pair already exists";
    return "A token with this name or value already exists";
}

// Applies the plan produced by planUserSync() with SQL only. The batch keeps
// the statements ordered: user rows exist before their tokens are written,
// and user deletes run last.
async function applyUserSync(tx, plan) {
    const tokenInserts = plan.tokenInserts.map((insert) => ({ ...insert, id: generateId() }));

    await tx.batch([
        tx`
            INSERT INTO users (
                id,
                email,
                display_name,
                password_hash,
                oidc_issuer,
                oidc_subject
            )
            SELECT
                x."userId",
                x.email,
                x."displayName",
                x."passwordHash",
                x."oidcIssuer",
                x."oidcSubject"
            FROM jsonb_to_recordset(${JSON.stringify(plan.userInserts)}::jsonb)
                 AS x(
                     "userId" text,
                     email text,
                     "displayName" text,
                     "passwordHash" text,
                     "oidcIssuer" text,
                     "oidcSubject" text
                 )
        `,
        tx`
            UPDATE users AS u
            SET display_name  = x."displayName",
                password_hash = x."passwordHash",
                oidc_issuer   = x."oidcIssuer",
                oidc_subject  = x."oidcSubject",
                updated_at    = now()
            FROM jsonb_to_recordset(${JSON.stringify(plan.userUpdates)}::jsonb)
                 AS x(
                     email text,
                     "displayName" text,
                     "passwordHash" text,
                     "oidcIssuer" text,
                     "oidcSubject" text
                 )
            WHERE u.email = x.email
        `,
        tx`
            INSERT INTO api_tokens (
                id,
                user_id,
                name,
                token_hash,
                expires_at
            )
            SELECT
                x.id,
                x."userId",
                x.name,
                x."tokenHash",
                x."expiresAt"
            FROM jsonb_to_recordset(${JSON.stringify(tokenInserts)}::jsonb)
                 AS x(
                     id text,
                     "userId" text,
                     name text,
                     "tokenHash" text,
                     "expiresAt" timestamptz
                 )
        `,
        tx`
            UPDATE api_tokens AS t
            SET token_hash = x."tokenHash",
                expires_at = x."expiresAt"
            FROM jsonb_to_recordset(${JSON.stringify(plan.tokenUpdates)}::jsonb)
                 AS x(
                     id text,
                     "tokenHash" text,
                     "expiresAt" timestamptz
                 )
            WHERE t.id = x.id
        `,
        tx`
            DELETE FROM api_tokens
            WHERE id = ANY(${plan.tokenDeletes}::text[])
        `,
        tx`
            DELETE FROM users
            WHERE email = ANY(${plan.userDeletes}::text[])
        `,
    ]);
}

export async function PUT(event) {
    const authError = requireAdminToken(event);
    if (authError) return authError;

    try {
        const body = await event.request.json();
        const upsert = Array.isArray(body.upsert) ? body.upsert : [];
        const deleteTargets = Array.isArray(body.delete) ? body.delete : [];

        if (upsert.length + deleteTargets.length === 0) {
            return problem(400, "upsert or delete must contain at least one item", event.request.url);
        }
        if (upsert.length + deleteTargets.length > MAX_BATCH_SIZE) {
            return problem(422, `batch size must not exceed ${MAX_BATCH_SIZE} items`, event.request.url);
        }

        const seenUpsertEmails = new Set();
        const upsertItems = upsert.map((item) => {
            if (typeof item !== "object" || item === null) {
                throw new SyncError(422, "each upsert item must be an object");
            }
            const validated = validateUpsertItem(item);
            if (seenUpsertEmails.has(validated.email)) {
                throw new SyncError(422, `duplicate email in upsert: ${validated.email}`);
            }
            seenUpsertEmails.add(validated.email);
            return validated;
        });

        const seenDeleteEmails = new Set();
        const deleteEmails = deleteTargets.map((item) => {
            const email = item?.email?.trim();
            if (!email) {
                throw new SyncError(422, "each delete item must be an object with a non-empty email");
            }
            if (seenDeleteEmails.has(email)) {
                throw new SyncError(422, `duplicate email in delete: ${email}`);
            }
            seenDeleteEmails.add(email);
            return email;
        });

        const upsertEmailSet = new Set(upsertItems.map((item) => item.email));
        const conflictEmail = deleteEmails.find((email) => upsertEmailSet.has(email));
        if (conflictEmail) {
            throw new SyncError(422, `email present in both upsert and delete: ${conflictEmail}`);
        }

        // Hash passwords and token values before opening the transaction, so the
        // transaction only performs database work.
        const preparedUpsertItems = await Promise.all(
            upsertItems.map(async (item) => ({
                ...item,
                passwordHash: item.password ? await hashPassword(item.password) : null,
                tokens: {
                    upsert: await Promise.all(
                        item.tokens.upsert.map(async (token) => {
                            const generatedRaw = token.token ? null : generateApiTokenSecret();

                            return {
                                ...token,
                                providedHash: token.token ? await hashToken(token.token) : null,
                                generatedRaw,
                                generatedHash: generatedRaw ? await hashToken(generatedRaw) : null,
                            };
                        }),
                    ),
                    delete: item.tokens.delete,
                },
            })),
        );

        const { summary, rawTokens, users } = await sql.begin(async (tx) => {
            const emails = [...upsertEmailSet, ...deleteEmails];
            const existingRows = await tx`
                SELECT id, email, password_hash FROM users WHERE email IN ${tx(emails)}
            `;
            const existingByEmail = new Map(existingRows.map((row) => [row.email, row]));

            const oidcPairs = preparedUpsertItems
                .map((item, ord) => ({
                    ord,
                    email: item.email,
                    oidcIssuer: item.oidcIssuer,
                    oidcSubject: item.oidcSubject,
                }))
                .filter((item) => item.oidcIssuer !== null && item.oidcSubject !== null);

            if (oidcPairs.length > 0) {
                const [conflict] = await tx`
                    SELECT x.email
                    FROM jsonb_to_recordset(${JSON.stringify(oidcPairs)}::jsonb)
                         AS x(
                             ord int,
                             email text,
                             "oidcIssuer" text,
                             "oidcSubject" text
                         )
                    JOIN users u
                      ON u.oidc_issuer = x."oidcIssuer"
                     AND u.oidc_subject = x."oidcSubject"
                     AND u.email <> x.email
                    ORDER BY x.ord
                    LIMIT 1
                `;

                if (conflict) {
                    throw new SyncError(409, `A user with this OIDC pair already exists: ${conflict.email}`);
                }
            }

            const userIdByEmail = new Map(
                preparedUpsertItems.map((item) => [item.email, existingByEmail.get(item.email)?.id ?? generateId()]),
            );
            const userIds = [...new Set(userIdByEmail.values())];
            const existingTokenRows =
                userIds.length > 0
                    ? await tx`
                          SELECT id, user_id, name, token_hash, expires_at
                          FROM api_tokens
                          WHERE user_id IN ${tx(userIds)}
                      `
                    : [];
            const existingTokenByUserAndName = new Map(
                existingTokenRows.map((row) => [`${row.user_id}\u0000${row.name}`, row]),
            );

            const plan = planUserSync({
                items: preparedUpsertItems,
                userIdByEmail,
                deleteEmails,
                existingUsers: existingByEmail,
                existingTokens: existingTokenByUserAndName,
            });

            await applyUserSync(tx, plan);

            const users = await tx`
                SELECT id, email, display_name, oidc_issuer, oidc_subject, is_active, created_at, updated_at
                FROM users ORDER BY created_at, id
            `;

            return { summary: plan.summary, rawTokens: plan.rawTokens, users };
        });

        return Response.json({
            data: {
                created: summary.created,
                updated: summary.updated,
                deleted: summary.deleted,
                tokens: summary.tokens,
                raw_tokens: rawTokens,
                users,
            },
            _links: {
                self: { href: "/api/v1/admin/users/sync" },
                collection: { href: "/api/v1/admin/users" },
            },
        });
    } catch (err) {
        if (err instanceof SyncError) {
            return problem(err.status, err.detail, event.request.url);
        }
        if (err.code === "23505") {
            return problem(409, conflictDetail(err), event.request.url);
        }
        throw err;
    }
}
