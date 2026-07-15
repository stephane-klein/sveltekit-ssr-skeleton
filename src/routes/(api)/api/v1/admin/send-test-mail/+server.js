import { json } from "@sveltejs/kit";
import { requireAdminToken, problem } from "../_helpers.js";
import { sendMail } from "$lib/backend/mailer.js";
import { logger } from "$lib/backend/logger.js";

const TEST_EMAIL_TO = process.env.TEST_EMAIL_TO;

export async function POST(event) {
    const authError = requireAdminToken(event);
    if (authError) return authError;

    const body = await event.request.json().catch(() => ({}));
    const to = body.to || TEST_EMAIL_TO;

    if (!to || typeof to !== "string" || !to.includes("@")) {
        return problem(
            400,
            "A valid 'to' email address is required — set TEST_EMAIL_TO env or provide 'to' in the request body",
            event.request.url,
        );
    }

    const subject = body.subject || "Test email from my-app";
    const text = body.text || "This is a test email sent from my-app.";

    try {
        const info = await sendMail({ to, subject, text });
        logger.info({ messageId: info.messageId, to, subject }, "Test email sent");
        return json({
            data: { messageId: info.messageId, to, subject },
            _links: { self: { href: "/api/v1/admin/send-test-mail" } },
        });
    } catch (err) {
        logger.error({ err, to }, "Failed to send test email");
        return problem(500, `Failed to send email: ${err.message}`, event.request.url);
    }
}
