import db from "$lib/server/db.js";

export async function handle({ event, resolve }) {
    event.locals = {
        db: await db.connect()
    };

    const response = await resolve(event);
    event.locals.db.release();
    return response;
};
