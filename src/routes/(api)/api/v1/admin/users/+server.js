import { json } from "@sveltejs/kit";
import { generateId, hashPassword } from "$lib/backend/auth.js";
import { sql } from "$lib/backend/pg.js";
import { generateCursor, problem, requireAdminToken } from "../_helpers.js";

export async function GET(event) {
    const authError = requireAdminToken(event);
    if (authError) return authError;

    const cursorParam = event.url.searchParams.get("cursor");
    const pageSize = Math.min(parseInt(event.url.searchParams.get("page_size") || "20", 10), 100);

    const users = cursorParam
        ? await sql`
              SELECT id, email, display_name, is_active, created_at, updated_at
              FROM users
              WHERE (created_at, id) > (${JSON.parse(Buffer.from(cursorParam, "base64").toString()).created_at}, ${JSON.parse(Buffer.from(cursorParam, "base64").toString()).id})
              ORDER BY created_at, id
              LIMIT ${pageSize + 1}
          `
        : await sql`
              SELECT id, email, display_name, is_active, created_at, updated_at
              FROM users
              ORDER BY created_at, id
              LIMIT ${pageSize + 1}
          `;

    const hasMore = users.length > pageSize;
    if (hasMore) users.pop();

    return json({
        data: users,
        next_cursor: hasMore ? generateCursor(users[users.length - 1]) : null,
        _links: {
            self: { href: "/api/v1/admin/users" },
        },
    });
}

export async function POST(event) {
    const authError = requireAdminToken(event);
    if (authError) return authError;

    const body = await event.request.json();
    const { email, display_name, password } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
        return problem(400, "email is required", event.request.url);
    }

    if (!display_name || typeof display_name !== "string" || !display_name.trim()) {
        return problem(400, "display_name is required", event.request.url);
    }

    if (!password || typeof password !== "string" || password.length < 6) {
        return problem(422, "password must be at least 8 characters", event.request.url);
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email.trim()}`;
    if (existing.length > 0) {
        return problem(409, "A user with this email already exists", event.request.url);
    }

    const id = generateId();
    const passwordHash = await hashPassword(password);
    const displayName = display_name.trim();

    const [user] = await sql`
        INSERT INTO users (id, email, display_name, password_hash)
        VALUES (${id}, ${email.trim()}, ${displayName}, ${passwordHash})
        RETURNING id, email, display_name, is_active, created_at, updated_at
    `;

    return json(
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
