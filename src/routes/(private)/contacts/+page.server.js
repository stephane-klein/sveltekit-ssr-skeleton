import { sql } from "#lib/server/pg.js";

const PAGE_SIZE = 25;

export async function load(event) {
    const page = Math.max(1, parseInt(event.url.searchParams.get("page") || "1", 10));
    const offset = (page - 1) * PAGE_SIZE;

    const [row] = await sql.unsafe(
        `SELECT get_contacts_page_data(
            _limit => $1::int,
            _offset => $2::int
        ) AS data`,
        [PAGE_SIZE, offset],
    );

    const total = Number(row.data.total);

    return {
        contacts: row.data.contacts,
        page,
        totalPages: Math.ceil(total / PAGE_SIZE),
    };
}
