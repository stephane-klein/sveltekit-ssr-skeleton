import { register } from "$lib/backend/metrics.js";

export async function GET() {
    return new Response(await register.metrics(), {
        headers: { "Content-Type": register.contentType },
    });
}
