export async function load({ locals }) {
    return {
        users: (
            await locals.db.query(
                `
                    SELECT
                        users.id AS id,
                        users.username AS username
                    FROM public.users
                `
            )
        ).rows
    };
}
