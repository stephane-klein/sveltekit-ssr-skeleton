import { problem } from "$lib/server/problem.js";

export function requireUser(event) {
    if (!event.locals.user) {
        return problem(401, "Authentication required", event.request.url);
    }

    return null;
}
