import { fail, redirect } from "@sveltejs/kit";
import { isLocale } from "#lib/paraglide/runtime.js";
import { sql } from "#lib/server/pg.js";

export function load(event) {
    return {
        user: event.locals.user,
    };
}

export const actions = {
    default: async ({ request, cookies, locals }) => {
        const user = locals.user;
        if (!user) return fail(401);

        const data = await request.formData();
        const language = data.get("language");

        if (!isLocale(language)) {
            return fail(400, { errorKey: "invalid_language" });
        }

        await sql`UPDATE users SET locale = ${language} WHERE id = ${user.id}`;
        cookies.set("locale", language, { path: "/", maxAge: 34560000, sameSite: "lax", httpOnly: false });

        throw redirect(303, "/my/preference/");
    },
};
