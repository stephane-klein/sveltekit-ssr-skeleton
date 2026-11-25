import { safeParse } from "valibot";
import { contactCreateSchema } from "#lib/server/contact-schema.js";
import { sql } from "#lib/server/pg.js";
import { problem } from "#lib/server/problem.js";
import { requireUser } from "#lib/server/require-user.js";

export async function GET(event) {
    const authError = requireUser(event);
    if (authError) return authError;

    const contacts = await sql`SELECT nanoid, firstname, lastname, created_at FROM contacts ORDER BY id`;

    return Response.json({
        data: contacts,
        _links: {
            self: { href: "/api/v1/contacts" },
        },
    });
}

export async function POST(event) {
    const authError = requireUser(event);
    if (authError) return authError;

    const parsed = safeParse(contactCreateSchema, await event.request.json());
    if (!parsed.success) {
        return problem(400, parsed.issues[0].message, event.request.url);
    }

    const { firstname, lastname } = parsed.output;

    const [contact] = await sql`
        INSERT INTO contacts (firstname, lastname)
        VALUES (${firstname.trim()}, ${lastname.trim()})
        RETURNING nanoid, firstname, lastname, created_at
    `;

    return Response.json(
        {
            data: contact,
            _links: {
                self: { href: `/api/v1/contacts/${contact.nanoid}` },
            },
        },
        {
            status: 201,
            headers: { Location: `/api/v1/contacts/${contact.nanoid}` },
        },
    );
}
