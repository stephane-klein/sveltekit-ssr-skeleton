import { fail, redirect } from "@sveltejs/kit";
import { createSession, createMagicLoginToken, SESSION_COOKIE_NAME, verifyPassword } from "$lib/backend/auth.js";
import { isMailAvailable, sendMail } from "$lib/backend/mailer.js";
import { logger } from "$lib/backend/logger.js";
import { sql } from "$lib/backend/pg.js";

export function load() {
    return {
        autheliaIssuer: process.env.AUTHELIA_ISSUER || null,
    };
}

export const actions = {
    signIn: async ({ request, cookies }) => {
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

    magicLink: async ({ request }) => {
        const data = await request.formData();
        const email = data.get("email");

        if (!email) {
            return fail(400, { magicLinkError: "Email is required." });
        }

        if (!isMailAvailable()) {
            return { magicLinkUnavailable: true };
        }

        const raw = await createMagicLoginToken(email);

        if (!raw) {
            throw redirect(302, "/magic-link/sent?email=" + encodeURIComponent(email));
        }

        const origin = request.headers.get("origin") || "";
        const magicLink = `${origin}/magic-login/callback?token=${raw}`;

        try {
            await sendMail({
                to: email,
                subject: "Sign in to my-app",
                text: [
                    "Click the link below to sign in.",
                    "",
                    magicLink,
                    "",
                    "This link expires in 15 minutes.",
                    "If you didn't request this, you can ignore this email.",
                ].join("\n"),
            });
            logger.info({ email }, "Magic login email sent");
        } catch (err) {
            logger.error({ err, email }, "Failed to send magic login email");
            return fail(500, { magicLinkError: "Failed to send the email. Please try again later." });
        }

        throw redirect(302, "/magic-link/sent?email=" + encodeURIComponent(email));
    },
};
