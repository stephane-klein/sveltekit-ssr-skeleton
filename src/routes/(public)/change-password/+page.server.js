import { redirect, fail } from "@sveltejs/kit";
import { hashPassword, hashToken, validatePasswordResetToken } from "#lib/server/auth.js";
import { sql } from "#lib/server/pg.js";

export async function load(event) {
    const token = event.url.searchParams.get("token");

    if (!token) {
        throw redirect(302, "/login");
    }

    const resetToken = await validatePasswordResetToken(token);

    if (!resetToken) {
        return { invalid: true };
    }

    return { valid: true, email: resetToken.email };
}

export const actions = {
    default: async ({ request, url }) => {
        const raw = url.searchParams.get("token");

        if (!raw) {
            return fail(400, { error: "Missing reset token." });
        }

        const resetToken = await validatePasswordResetToken(raw);

        if (!resetToken) {
            return fail(400, { error: "Invalid or expired reset token." });
        }

        const data = await request.formData();
        const password = data.get("password");
        const confirm = data.get("confirm");

        if (!password || password.length < 12) {
            return fail(400, { error: "Password must be at least 12 characters." });
        }

        if (password !== confirm) {
            return fail(400, { error: "Passwords do not match." });
        }

        const passwordHash = await hashPassword(password);
        const tokenHash = await hashToken(raw);

        const [row] = await sql`
            WITH consumed AS (
                UPDATE password_reset_tokens
                SET used = TRUE
                WHERE token_hash = ${tokenHash}
                  AND used = FALSE
                  AND expires_at > now()
                RETURNING user_id
            ),
            updated_user AS (
                UPDATE users
                SET password_hash = ${passwordHash}
                WHERE id = (SELECT user_id FROM consumed)
                RETURNING id
            ),
            deleted_sessions AS (
                DELETE FROM sessions
                WHERE user_id IN (SELECT id FROM updated_user)
            )
            SELECT EXISTS (SELECT 1 FROM updated_user) AS applied
        `;

        if (!row.applied) {
            return fail(400, { error: "Invalid or expired reset token." });
        }

        throw redirect(302, "/login");
    },
};
