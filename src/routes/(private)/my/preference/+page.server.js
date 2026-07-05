export function load(event) {
    return {
        user: event.locals.user,
    };
}

export const actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const timezone = data.get("timezone");
        const language = data.get("language");

        return { saved: true, timezone, language };
    },
};
