import db from "../db";

export async function load() {
    return {
        users: (
            await db.query(
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
