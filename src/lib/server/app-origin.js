// The public origin of the application. It builds the absolute links sent by
// email (password reset, magic login) and the OIDC redirect URI.
//
// Never derive it from a request header: a client controls `Origin`, so a link
// built from it would send the token to the client's host.
//
// MY_APP_ORIGIN is set by the Helm chart and by deployment-playground/compose.yml.
// It is unset under `pnpm dev`, where Vite listens on port 5173; the fallback
// matches that port. Export MY_APP_ORIGIN when the dev server runs elsewhere.
export function getAppOrigin(env = process.env) {
    return env.MY_APP_ORIGIN || "http://localhost:5173";
}
