import { SESSION_COOKIE_NAME, validateApiToken, validateSession } from "$lib/backend/auth.js";
import { sql } from "$lib/backend/pg.js";
import { logger } from "$lib/backend/logger.js";
import { renderDuration } from "$lib/backend/metrics.js";

export async function handle({ event, resolve }) {
    event.locals.user = null;

    const sessionId = event.cookies.get(SESSION_COOKIE_NAME);

    if (sessionId) {
        const session = await validateSession(sessionId);

        if (session) {
            const [user] = await sql`SELECT id, email, display_name FROM users WHERE id = ${session.user_id}`;

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
                const [user] = await sql`SELECT id, email, display_name FROM users WHERE id = ${token.user_id}`;

                if (user) {
                    event.locals.user = user;
                }
            }
        }
    }

    const route = event.route.id;

    // Exclude infra routes (/health, /metrics, etc.) from SSR duration tracking
    // — they are short endpoints that would pollute the render duration histogram.
    if (route?.includes("(infra)")) {
        return resolve(event);
    }

    const end = renderDuration.startTimer({ route: route ?? "unknown" });
    const response = await resolve(event);
    end();

    return response;
}

export function handleError({ error, event }) {
    logger.error({ error, url: event.url.toString() }, "Unhandled error");

    return {
        message: "Internal Error",
    };
}
