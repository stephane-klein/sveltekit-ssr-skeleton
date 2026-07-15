import { json } from "@sveltejs/kit";
import { sql } from "$lib/backend/pg.js";
import { isMailAvailable } from "$lib/backend/mailer.js";

export async function GET() {
    try {
        await sql`SELECT 1`;
    } catch {
        return new Response(
            JSON.stringify({ status: "error", ready: false, checks: { database: "error", smtp: "unknown" } }),
            { status: 503 },
        );
    }

    return json({
        status: "ok",
        ready: true,
        checks: { database: "ok", smtp: isMailAvailable() ? "ok" : "unconfigured" },
    });
}
