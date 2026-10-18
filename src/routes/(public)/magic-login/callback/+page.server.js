import { redirect } from "@sveltejs/kit";
import { createSession, setSessionCookie, validateMagicLoginToken } from "$lib/backend/auth.js";
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

    const [user] = await sql`SELECT is_active, locale FROM users WHERE id = ${result.userId}`;

    if (!user?.is_active) {
        return { invalid: true };
    }

    const session = await createSession(result.userId);

    setSessionCookie(cookies, session.id);

    if (user.locale) {
        cookies.set("locale", user.locale, { path: "/", maxAge: 34560000, sameSite: "lax", httpOnly: false });
    }

    throw redirect(302, "/dashboard");
}
