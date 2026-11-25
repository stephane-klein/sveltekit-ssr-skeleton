// Pure normalization of the user fields the admin endpoints accept, so the
// trimming and the OIDC issuer cleanup are written once. Callers keep the
// both-or-neither OIDC pair rule, which the route handlers enforce per their
// documented decision in #lib/server/user-schema.js.
export function normalizeUserFields(output) {
    return {
        email: output.email?.trim(),
        displayName: output.display_name?.trim(),
        oidcIssuer: output.oidc_issuer?.replace(/\/$/, "").trim(),
        oidcSubject: output.oidc_subject?.trim(),
    };
}
