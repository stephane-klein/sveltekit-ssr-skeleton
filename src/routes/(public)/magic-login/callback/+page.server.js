import { redirect } from "@sveltejs/kit";
import { createSession, hashToken, setSessionCookie } from "#lib/server/auth.js";
import { sql } from "#lib/server/pg.js";

export async function load({ url, cookies }) {
    const raw = url.searchParams.get("token");

    if (!raw) {
        return { invalid: true };
    }

    const [user] = await sql`
        WITH consumed AS (
            UPDATE magic_link_tokens
            SET used = TRUE
            WHERE token_hash = ${await hashToken(raw)}
              AND used = FALSE
              AND expires_at > now()
            RETURNING user_id
        )
        SELECT u.id AS user_id, u.is_active, u.locale
        FROM consumed c
        JOIN users u ON u.id = c.user_id
    `;

    if (!user?.is_active) {
        return { invalid: true };
    }

    const session = await createSession(user.user_id);

    setSessionCookie(cookies, session.id);

    if (user.locale) {
        cookies.set("locale", user.locale, { path: "/", maxAge: 34560000, sameSite: "lax", httpOnly: false });
    }

    throw redirect(302, "/dashboard");
}
