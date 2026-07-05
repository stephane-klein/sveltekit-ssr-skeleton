import { json } from "@sveltejs/kit";
import { sql } from "$lib/backend/pg.js";

function problem(status, detail, instance) {
    return json(
        {
            type: "about:blank",
            title: [400, "Bad Request", 401, "Unauthorized", 404, "Not Found"][
                [400, 401, 404].indexOf(status) * 2 + 1
            ],
            status,
            detail,
            instance,
        },
        { status },
    );
}

export async function GET(event) {
    if (!event.locals.user) return problem(401, "Authentication required", "/api/v1/contacts");

    const contacts = await sql`SELECT id, firstname, lastname, created_at FROM contacts ORDER BY id`;

    return json({
        data: contacts,
        _links: {
            self: { href: "/api/v1/contacts" },
        },
    });
}

export async function POST(event) {
    if (!event.locals.user) return problem(401, "Authentication required", "/api/v1/contacts");

    const body = await event.request.json();
    const firstname = body?.firstname;
    const lastname = body?.lastname;

    if (!firstname || typeof firstname !== "string" || !firstname.trim()) {
        return problem(400, "firstname is required", "/api/v1/contacts");
    }

    const [contact] = await sql`
        INSERT INTO contacts (firstname, lastname)
        VALUES (${firstname.trim()}, ${lastname?.trim() || null})
        RETURNING id, firstname, lastname, created_at
    `;

    return json(
        {
            data: contact,
            _links: {
                self: { href: `/api/v1/contacts/${contact.id}` },
            },
        },
        {
            status: 201,
            headers: { Location: `/api/v1/contacts/${contact.id}` },
        },
    );
}
