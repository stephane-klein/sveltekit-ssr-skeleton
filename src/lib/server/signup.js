// Signup is closed by default: only the literal "true" opens it, so a typo
// or a missing variable keeps registration closed.
export function isSignupEnabled(env = process.env) {
    return env.SIGNUP_ENABLED === "true";
}
