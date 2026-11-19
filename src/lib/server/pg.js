import { tracingChannel } from "node:diagnostics_channel";
import postgres from "postgres";

import { logger } from "./logger.js";
import { sqlDuration } from "./metrics.js";
import { getMetrics } from "./pg-metrics.js";
import { onShutdown } from "./lifecycle.js";

const POSTGRES_URL = process.env.MY_APP_POSTGRES_URL;
export const POSTGRES_SCHEMA = process.env.MY_APP_POSTGRES_SCHEMA || "public";

export const sql = postgres(POSTGRES_URL, {
    idle_timeout: 1,
    connection: {
        search_path: POSTGRES_SCHEMA,
    },
    onnotice: (notice) => logger.debug({ ...notice }, "PostgreSQL notice"),
});

// postgres.js publishes every query on this tracing channel. Subscribing is
// enough: no query object is patched, and nothing is published while nobody
// listens. `start` runs in the async context of the caller, so the request
// store is the one from the code that made the query.
const queryChannel = tracingChannel("postgres:query");
const requestStores = new WeakMap();

const subscription = {
    start(context) {
        requestStores.set(context, getMetrics());
    },
    asyncEnd(context) {
        const store = requestStores.get(context);
        requestStores.delete(context);

        if (context.queued == null || context.complete == null) return;

        const durationMs = context.complete - context.queued;

        sqlDuration.observe({ query: String(context.query ?? "").slice(0, 50) }, durationMs / 1000);
        store?.queries.push({ durationMs });
    },
};

queryChannel.subscribe(subscription);
import.meta.hot?.dispose(() => queryChannel.unsubscribe(subscription));

onShutdown(() => sql.end({ timeout: 5 }));

export async function waitForDb(maxRetries = 10, delayMs = 1000) {
    logger.info(`Attempting to connect to ${POSTGRES_URL.replace(/\/\/.*:/, "//xxxxx:")}`);

    for (let i = 1; i <= maxRetries; i++) {
        try {
            await sql`SELECT 1`;
            return;
        } catch (err) {
            if (i === maxRetries) throw err;
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }
}
