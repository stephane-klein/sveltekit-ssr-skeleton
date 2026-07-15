import { redirect } from "@sveltejs/kit";
import { createSession, SESSION_COOKIE_NAME, validateMagicLoginToken } from "$lib/backend/auth.js";
import { sql } from "$lib/backend/pg.js";

export async function load({ url, cookies }) {
    const raw = url.searchParams.get("token");

    if (!raw) {
        return { invalid: true };
    }

    const result = await validateMagicLoginToken(raw);

    if (!result) {
        return { invalid: true };
    }

    const session = await createSession(result.userId);

    cookies.set(SESSION_COOKIE_NAME, session.id, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60,
    });

    const [user] = await sql`SELECT locale FROM users WHERE id = ${result.userId}`;

    if (user?.locale) {
        cookies.set("locale", user.locale, { path: "/", maxAge: 34560000, sameSite: "lax", httpOnly: false });
    }

    throw redirect(302, "/dashboard");
}
