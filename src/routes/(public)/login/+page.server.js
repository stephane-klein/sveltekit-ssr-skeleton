import { fail, redirect } from "@sveltejs/kit";
import { createSession, SESSION_COOKIE_NAME, verifyPassword } from "$lib/backend/auth.js";
import { sql } from "$lib/backend/pg.js";

export function load() {
    return {
        autheliaIssuer: process.env.AUTHELIA_ISSUER || null,
    };
}

export const actions = {
    default: async ({ request, cookies }) => {
        const data = await request.formData();
        const email = data.get("email");
        const password = data.get("password");

        if (!email || !password) {
            return fail(400, { error: "Email and password are required." });
        }

        const [user] = await sql`SELECT id, email, display_name, password_hash FROM users WHERE email = ${email}`;

        if (!user || !user.password_hash) {
            return fail(400, { error: "Invalid email or password." });
        }

        const valid = await verifyPassword(user.password_hash, password);

        if (!valid) {
            return fail(400, { error: "Invalid email or password." });
        }

        const session = await createSession(user.id);

        cookies.set(SESSION_COOKIE_NAME, session.id, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 30 * 24 * 60 * 60,
        });

        throw redirect(302, "/dashboard");
    },
};
