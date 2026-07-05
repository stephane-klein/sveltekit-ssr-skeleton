import { fail } from "@sveltejs/kit";
import { createPasswordResetToken } from "$lib/backend/auth.js";

export const actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const email = data.get("email");

        if (!email) {
            return fail(400, { error: "Email is required." });
        }

        const token = await createPasswordResetToken(email);

        if (!token) {
            return { sent: true, email };
        }

        const resetLink = `${request.headers.get("origin") || ""}/change-password?token=${token}`;

        return { sent: true, email, resetLink };
    },
};
