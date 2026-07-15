import { fail } from "@sveltejs/kit";
import { createPasswordResetToken } from "$lib/backend/auth.js";
import { isMailAvailable, sendMail } from "$lib/backend/mailer.js";
import { logger } from "$lib/backend/logger.js";

export const actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const email = data.get("email");

        if (!email) {
            return fail(400, { error: "Email is required." });
        }

        if (!isMailAvailable()) {
            return { mail_unavailable: true };
        }

        const token = await createPasswordResetToken(email);

        if (!token) {
            return { sent: true, email };
        }

        const origin = request.headers.get("origin") || "";
        const resetLink = `${origin}/change-password?token=${token}`;

        try {
            await sendMail({
                to: email,
                subject: "Reset your password",
                text: `You requested a password reset.\n\nClick the link below to set a new password:\n${resetLink}\n\nThis link expires in 30 minutes.\n\nIf you didn't request this, you can ignore this email.`,
            });
            logger.info({ email }, "Password reset email sent");
        } catch (err) {
            logger.error({ err, email }, "Failed to send password reset email");
            return fail(500, { error: "Failed to send reset email. Please try again later." });
        }

        return { sent: true, email, resetLink };
    },
};
