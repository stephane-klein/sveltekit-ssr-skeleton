import nodemailer from "nodemailer";
import { logger } from "./logger.js";

const {
    SMTP_HOST = "",
    SMTP_PORT = "587",
    SMTP_USER = "",
    SMTP_PASS = "",
    SMTP_SECURE = "",
    EMAIL_FROM = "noreply@example.com",
} = process.env;

const transporter = SMTP_HOST
    ? nodemailer.createTransport({
          host: SMTP_HOST,
          port: parseInt(SMTP_PORT, 10),
          secure: SMTP_SECURE === "true",
          auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      })
    : null;

if (transporter) {
    logger.info({ smtpHost: SMTP_HOST, smtpPort: SMTP_PORT, emailFrom: EMAIL_FROM }, "SMTP configured");

    transporter.verify().then(
        () => logger.info("SMTP connection verified"),
        (err) => logger.warn({ err }, "SMTP connection failed"),
    );
} else {
    logger.warn(
        "SMTP is not configured — set SMTP_HOST environment variable (e.g. SMTP_HOST=localhost with SMTP_PORT=1025 for Mailpit)",
    );
}

export function isMailAvailable() {
    return transporter !== null;
}

export async function sendMail({ to, subject, text, html }) {
    if (!transporter) {
        throw new Error(
            "SMTP is not configured — set SMTP_HOST environment variable (e.g. SMTP_HOST=localhost with SMTP_PORT=1025 for Mailpit)",
        );
    }

    return transporter.sendMail({
        from: EMAIL_FROM,
        to,
        subject,
        text,
        html,
    });
}
