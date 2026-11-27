import { isSignupEnabled } from "#lib/server/signup.js";

export function load() {
    return {
        signupEnabled: isSignupEnabled(),
    };
}
