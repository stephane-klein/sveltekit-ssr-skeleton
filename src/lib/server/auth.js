import { nanoid } from "nanoid";
import { sql } from "./pg.js";

export { hashPassword, verifyPassword } from "./password.js";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_EXPIRES_IN_MS = 1000 * 60 * 60 * 24 * 30;

export function setSessionCookie(cookies, sessionId) {
    cookies.set(SESSION_COOKIE_NAME, sessionId, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_EXPIRES_IN_MS / 1000,
    });
}

export function generateId() {
    return nanoid();
}

export async function createSession(userId, expiresInMs = SESSION_EXPIRES_IN_MS) {
    const id = generateId();
    const expiresAt = new Date(new Date().getTime() + expiresInMs);

    await sql`INSERT INTO sessions (id, user_id, expires_at) VALUES (${id}, ${userId}, ${expiresAt})`;

    return { id, userId, expiresAt };
}

export async function getSession(sessionId) {
    const [session] = await sql`
        SELECT s.id,
               s.expires_at,
               u.id AS user_id,
               u.email,
               u.display_name,
               u.locale,
               u.is_active
        FROM sessions s
        INNER JOIN users u ON u.id = s.user_id
        WHERE s.id = ${sessionId}
    `;

    if (!session) return null;

    return {
        id: session.id,
        expiresAt: session.expires_at,
        userIsActive: session.is_active,
        user: {
            id: session.user_id,
            email: session.email,
            display_name: session.display_name,
            locale: session.locale,
        },
    };
}

export async function renewSession(sessionId) {
    const expiresAt = new Date(new Date().getTime() + SESSION_EXPIRES_IN_MS);

    await sql`UPDATE sessions SET expires_at = ${expiresAt} WHERE id = ${sessionId}`;
}

export async function invalidateSession(sessionId) {
    await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}

export async function hashToken(token) {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateApiTokenSecret() {
    return nanoid(48);
}

export async function createApiToken(userId, name, expiresInDays = null) {
    const id = generateId();
    const raw = generateApiTokenSecret();
    const tokenHash = await hashToken(raw);
    const expiresAt = expiresInDays ? new Date(new Date().getTime() + expiresInDays * 24 * 3600 * 1000) : null;

    await sql`INSERT INTO api_tokens (id, user_id, name, token_hash, expires_at)
              VALUES (${id}, ${userId}, ${name}, ${tokenHash}, ${expiresAt})`;

    return { id, name, raw };
}

export async function authenticateApiToken(raw) {
    const tokenHash = await hashToken(raw);

    const [token] = await sql`
        SELECT t.id,
               t.expires_at,
               u.id AS user_id,
               u.email,
               u.display_name,
               u.locale,
               u.is_active
        FROM api_tokens t
        INNER JOIN users u ON u.id = t.user_id
        WHERE t.token_hash = ${tokenHash}
    `;

    if (!token) return null;
    if (!token.is_active) return null;
    if (token.expires_at && new Date().getTime() >= token.expires_at.getTime()) return { expired: true };

    return {
        id: token.id,
        user: {
            id: token.user_id,
            email: token.email,
            display_name: token.display_name,
            locale: token.locale,
        },
    };
}

export async function recordApiTokenUse(tokenId) {
    await sql`UPDATE api_tokens SET last_used = ${new Date()} WHERE id = ${tokenId}`;
}

export async function deleteApiToken(userId, tokenId) {
    const rows = await sql`
        DELETE FROM api_tokens
        WHERE id = ${tokenId} AND user_id = ${userId}
        RETURNING id
    `;

    return rows.length > 0;
}

export async function listUserApiTokens(userId) {
    return await sql`SELECT id, name, last_used, created_at, expires_at FROM api_tokens WHERE user_id = ${userId}`;
}

export async function createPasswordResetToken(email) {
    const [user] = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (!user) return null;

    const raw = nanoid(48);
    const tokenHash = await hashToken(raw);
    const expiresAt = new Date(new Date().getTime() + 1000 * 60 * 30);

    await sql`INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
              VALUES (${generateId()}, ${user.id}, ${tokenHash}, ${expiresAt})`;

    return raw;
}

export async function validatePasswordResetToken(raw) {
    const tokenHash = await hashToken(raw);

    const [token] = await sql`
        SELECT t.id, t.user_id, t.expires_at, u.email
        FROM password_reset_tokens t
        INNER JOIN users u ON u.id = t.user_id
        WHERE t.token_hash = ${tokenHash}
          AND t.used = FALSE
          AND t.expires_at > ${new Date()}
    `;

    if (!token) return null;

    return token;
}

export async function createMagicLoginToken(email) {
    const [user] = await sql`SELECT id FROM users WHERE email = ${email} AND is_active = TRUE`;
    if (!user) return null;

    const raw = nanoid(48);
    const tokenHash = await hashToken(raw);
    const expiresAt = new Date(new Date().getTime() + 1000 * 60 * 15);

    await sql`INSERT INTO magic_link_tokens (id, user_id, token_hash, expires_at)
              VALUES (${generateId()}, ${user.id}, ${tokenHash}, ${expiresAt})`;

    return raw;
}
