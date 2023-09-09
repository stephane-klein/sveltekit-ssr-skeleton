import sql from "$lib/server/db.js";

export async function handle({ event, resolve }) {
    event.locals = {
        // See https://github.com/porsager/postgres/pull/667/files
        sql: await sql.reserve()
    };

    const response = await resolve(event);
    event.locals.sql.release();
    return response;
};
