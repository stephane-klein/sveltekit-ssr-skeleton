import { sequence } from "@sveltejs/kit/hooks";
import { getTextDirection, serverAsyncLocalStorage } from "$lib/paraglide/runtime";
import { paraglideMiddleware } from "$lib/paraglide/server";
import { SESSION_COOKIE_NAME, validateApiToken, validateSession } from "$lib/backend/auth.js";
import { sql } from "$lib/backend/pg.js";
import { logger } from "$lib/backend/logger.js";
import { renderDuration } from "$lib/backend/metrics.js";

const LOCALE_COOKIE = "locale";
const COOKIE_OPTS = { path: "/", maxAge: 34560000, sameSite: "lax", httpOnly: false };

async function authHandle({ event, resolve }) {
    event.locals.user = null;

    const sessionId = event.cookies.get(SESSION_COOKIE_NAME);

    if (sessionId) {
        const session = await validateSession(sessionId);

        if (session) {
            const [user] = await sql`SELECT id, email, display_name, locale FROM users WHERE id = ${session.user_id}`;

            if (user) {
                event.locals.user = user;
            }
        } else {
            event.cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
        }
    }

    if (!event.locals.user) {
        const authHeader = event.request.headers.get("Authorization");

        if (authHeader?.startsWith("Bearer ")) {
            const raw = authHeader.slice(7);
            const token = await validateApiToken(raw);

            if (token) {
                const [user] = await sql`SELECT id, email, display_name, locale FROM users WHERE id = ${token.user_id}`;

                if (user) {
                    event.locals.user = user;
                }
            }
        }
    }

    let effectiveLocale = event.cookies.get(LOCALE_COOKIE);

    if (!effectiveLocale && event.locals.user?.locale) {
        effectiveLocale = event.locals.user.locale;
    }

    if (effectiveLocale) {
        event.locals.effectiveLocale = effectiveLocale;
        event.cookies.set(LOCALE_COOKIE, effectiveLocale, COOKIE_OPTS);
    }

    const route = event.route.id;

    if (route?.includes("(infra)")) {
        return resolve(event);
    }

    const end = renderDuration.startTimer({ route: route ?? "unknown" });
    const response = await resolve(event);

    end();

    return response;
}

const paraglideHandle = ({ event, resolve }) =>
    paraglideMiddleware(event.request, ({ request, locale }) => {
        event.request = request;

        const effectiveLocale = event.locals.effectiveLocale || locale;
        const outerStore = serverAsyncLocalStorage.getStore();

        return serverAsyncLocalStorage.run({ ...outerStore, locale: effectiveLocale }, () =>
            resolve(event, {
                transformPageChunk: ({ html }) =>
                    html
                        .replace("%paraglide.lang%", effectiveLocale)
                        .replace("%paraglide.dir%", getTextDirection(effectiveLocale)),
            }),
        );
    });

export const handle = sequence(authHandle, paraglideHandle);

export function handleError({ error, event }) {
    logger.error({ error, url: event.url.toString() }, "Unhandled error");

    return { message: "Internal Error" };
}
