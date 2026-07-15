import nodemailer from "nodemailer";

const {
    SMTP_HOST = "",
    SMTP_PORT = "587",
    SMTP_USER = "",
    SMTP_PASS = "",
    EMAIL_FROM = "noreply@example.com",
} = process.env;

if (!SMTP_HOST) {
    throw new Error(
        "SMTP is not configured — set SMTP_HOST environment variable (e.g. SMTP_HOST=localhost with SMTP_PORT=1025 for Mailpit)",
    );
}

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: false,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

export async function sendMail({ to, subject, text, html }) {
    return transporter.sendMail({
        from: EMAIL_FROM,
        to,
        subject,
        text,
        html,
    });
}
