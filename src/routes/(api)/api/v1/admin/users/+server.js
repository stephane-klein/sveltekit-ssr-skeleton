import { safeParse } from "valibot";
import { generateId, hashPassword } from "#lib/server/auth.js";
import { sql } from "#lib/server/pg.js";
import { problem } from "#lib/server/problem.js";
import { normalizeUserFields } from "#lib/server/user-fields.js";
import { userFieldsSchema } from "#lib/server/user-schema.js";
import { generateCursor, requireAdminToken } from "../_helpers.js";

async function insertUser({ email, displayName, passwordHash, oidcIssuer, oidcSubject }) {
    const [user] = await sql`
        INSERT INTO users (id, email, display_name, password_hash, oidc_issuer, oidc_subject)
        VALUES (${generateId()}, ${email || null}, ${displayName || null}, ${passwordHash},
                ${oidcIssuer || null}, ${oidcSubject || null})
        RETURNING id, email, display_name, oidc_issuer, oidc_subject, is_active, created_at, updated_at
    `;
    return user;
}

async function updateUser({ email, displayName, password, passwordHash, oidcIssuer, oidcSubject, existing }) {
    const [user] = await sql`
        UPDATE users
        SET display_name  = ${displayName},
            password_hash = ${password ? passwordHash : existing.password_hash},
            oidc_issuer   = ${oidcIssuer || null},
            oidc_subject  = ${oidcSubject || null}
        WHERE email = ${email}
        RETURNING id, email, display_name, oidc_issuer, oidc_subject, is_active, created_at, updated_at
    `;
    return user;
}

export async function GET(event) {
    const authError = requireAdminToken(event);
    if (authError) return authError;

    const cursorParam = event.url.searchParams.get("cursor");
    const pageSize = Math.min(parseInt(event.url.searchParams.get("page_size") || "20", 10), 100);

    const users = cursorParam
        ? await sql`
              SELECT id, email, display_name, oidc_issuer, oidc_subject, is_active, created_at, updated_at
              FROM users
              WHERE (created_at, id) > (${JSON.parse(Buffer.from(cursorParam, "base64").toString()).created_at}, ${JSON.parse(Buffer.from(cursorParam, "base64").toString()).id})
              ORDER BY created_at, id
              LIMIT ${pageSize + 1}
          `
        : await sql`
              SELECT id, email, display_name, oidc_issuer, oidc_subject, is_active, created_at, updated_at
              FROM users
              ORDER BY created_at, id
              LIMIT ${pageSize + 1}
          `;

    const hasMore = users.length > pageSize;
    const page = hasMore ? users.slice(0, pageSize) : users;

    return Response.json({
        data: page,
        next_cursor: hasMore ? generateCursor(page[page.length - 1]) : null,
        _links: {
            self: { href: "/api/v1/admin/users" },
        },
    });
}

export async function POST(event) {
    const authError = requireAdminToken(event);
    if (authError) return authError;

    const body = await event.request.json();

    const parsed = safeParse(userFieldsSchema, body);
    if (!parsed.success) {
        return problem(400, parsed.issues[0].message, event.request.url);
    }
    const { email, displayName, oidcIssuer, oidcSubject } = normalizeUserFields(parsed.output);
    const { password } = parsed.output;

    const hasOidc = oidcIssuer !== undefined || oidcSubject !== undefined;

    if ((oidcIssuer === undefined) !== (oidcSubject === undefined)) {
        return problem(422, "Both oidc_issuer and oidc_subject must be provided together", event.request.url);
    }

    if (!hasOidc) {
        if (!email) return problem(400, "email is required", event.request.url);
        if (!displayName) return problem(400, "display_name is required", event.request.url);
    }

    if (email) {
        const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (existing.length > 0) {
            return problem(409, "A user with this email already exists", event.request.url);
        }
    }

    if (hasOidc) {
        const existing = await sql`
            SELECT id FROM users WHERE oidc_issuer = ${oidcIssuer} AND oidc_subject = ${oidcSubject}
        `;
        if (existing.length > 0) {
            return problem(409, "A user with this OIDC pair already exists", event.request.url);
        }
    }

    const passwordHash = password ? await hashPassword(password) : null;

    const user = await insertUser({ email, displayName, passwordHash, oidcIssuer, oidcSubject });

    return Response.json(
        {
            data: user,
            _links: {
                self: { href: `/api/v1/admin/users/${user.id}` },
                collection: { href: "/api/v1/admin/users" },
            },
        },
        {
            status: 201,
            headers: { Location: `/api/v1/admin/users/${user.id}` },
        },
    );
}

export async function PUT(event) {
    const authError = requireAdminToken(event);
    if (authError) return authError;

    const body = await event.request.json();

    const parsed = safeParse(userFieldsSchema, body);
    if (!parsed.success) {
        return problem(400, parsed.issues[0].message, event.request.url);
    }
    const { email, displayName, oidcIssuer, oidcSubject } = normalizeUserFields(parsed.output);
    const { password } = parsed.output;

    if (!email) return problem(400, "email is required", event.request.url);
    if (!displayName) return problem(400, "display_name is required", event.request.url);

    const hasOidc = oidcIssuer !== undefined || oidcSubject !== undefined;
    if ((oidcIssuer === undefined) !== (oidcSubject === undefined)) {
        return problem(422, "Both oidc_issuer and oidc_subject must be provided together", event.request.url);
    }

    const [existing] = await sql`SELECT id, password_hash FROM users WHERE email = ${email}`;

    if (hasOidc) {
        const conflict = await sql`
            SELECT id FROM users
            WHERE oidc_issuer = ${oidcIssuer} AND oidc_subject = ${oidcSubject}
            AND email != ${email}
        `;
        if (conflict.length > 0) {
            return problem(409, "A user with this OIDC pair already exists", event.request.url);
        }
    }

    const passwordHash = password ? await hashPassword(password) : null;

    const user = existing
        ? await updateUser({ email, displayName, password, passwordHash, oidcIssuer, oidcSubject, existing })
        : await insertUser({ email, displayName, passwordHash, oidcIssuer, oidcSubject });

    return Response.json({
        data: user,
        _links: {
            self: { href: `/api/v1/admin/users/${user.id}` },
            collection: { href: "/api/v1/admin/users" },
        },
    });
}
