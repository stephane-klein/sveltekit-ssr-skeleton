export async function load({ locals }) {
    return {
        users: (
            await locals.sql`
                SELECT
                    users.id AS id,
                    users.username AS username
                FROM public.users
            `
        )
    };
}
