import { json } from "@sveltejs/kit";
import { sql } from "$lib/backend/pg.js";

function problem(status, detail, instance) {
    const titles = {
        400: "Bad Request",
        401: "Unauthorized",
        404: "Not Found",
        422: "Unprocessable Entity",
    };

    return json(
        {
            type: "about:blank",
            title: titles[status] || "Error",
            status,
            detail,
            instance,
        },
        { status },
    );
}

function contactLinks(id) {
    return {
        self: { href: `/api/v1/contacts/${id}` },
        collection: { href: "/api/v1/contacts" },
    };
}

export async function GET(event) {
    if (!event.locals.user) return problem(401, "Authentication required", event.request.url);

    const [contact] = await sql`SELECT id, firstname, lastname, created_at FROM contacts WHERE id = ${event.params.id}`;

    if (!contact) return problem(404, "Contact not found", event.request.url);

    return json({
        data: contact,
        _links: contactLinks(contact.id),
    });
}

export async function PATCH(event) {
    if (!event.locals.user) return problem(401, "Authentication required", event.request.url);

    const [existing] = await sql`SELECT id FROM contacts WHERE id = ${event.params.id}`;

    if (!existing) return problem(404, "Contact not found", event.request.url);

    const body = await event.request.json();

    if (body.firstname !== undefined && (typeof body.firstname !== "string" || !body.firstname.trim())) {
        return problem(422, "firstname must be a non-empty string", event.request.url);
    }

    if (body.lastname !== undefined && body.lastname !== null && typeof body.lastname !== "string") {
        return problem(422, "lastname must be a string or null", event.request.url);
    }

    const [contact] = await sql`
        UPDATE contacts
        SET firstname = COALESCE(${body.firstname?.trim() || null}, firstname),
            lastname  = COALESCE(${body.lastname?.trim() || null}, lastname)
        WHERE id = ${event.params.id}
        RETURNING id, firstname, lastname, created_at
    `;

    return json({
        data: contact,
        _links: contactLinks(contact.id),
    });
}

export async function DELETE(event) {
    if (!event.locals.user) return problem(401, "Authentication required", event.request.url);

    const [existing] = await sql`SELECT id FROM contacts WHERE id = ${event.params.id}`;

    if (!existing) return problem(404, "Contact not found", event.request.url);

    await sql`DELETE FROM contacts WHERE id = ${event.params.id}`;

    return new Response(null, { status: 204 });
}
