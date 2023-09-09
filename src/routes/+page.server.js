export async function load({ locals }) {
    const result = await locals.sql`
        SELECT
            users.id AS id,
            users.username AS username
        FROM public.users
    `;
    return {
        users: result
    };
}
