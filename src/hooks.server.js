import sql from "$lib/server/db.js";

export async function handle({ event, resolve }) {
    const stats = {
        waiting: 0,
        duration: 0,
        execution: 0
    };
    sql.options.onquery = () => {
        return () => {
            return (result) => {
                stats.waiting += result.waiting;
                stats.duration += result.duration;
                stats.execution += result.execution;
            };
        };
    };

    event.locals = {
        // See https://github.com/porsager/postgres/pull/667/files
        sql: await sql.reserve()
    };

    const response = await resolve(event);
    event.locals.sql.release();
    response.headers.set("x-stats-sql-waiting", `${stats.waiting.toFixed(4)}ms`);
    response.headers.set("x-stats-sql-duration", `${stats.duration.toFixed(4)}ms`);
    response.headers.set("x-stats-sql-execution", `${stats.execution.toFixed(4)}ms`);
    return response;
};
