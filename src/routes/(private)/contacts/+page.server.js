import { sql } from "$lib/backend/pg.js";

export async function load() {
    return {
        contacts: await sql`SELECT id, firstname, lastname, created_at FROM contacts ORDER BY id`,
    };
}
