import assert from "node:assert/strict";
import test from "node:test";

import { isSignupEnabled } from "../src/lib/server/signup.js";

test("signup is closed by default", () => {
    assert.equal(isSignupEnabled({}), false);
});

test("signup opens only for the literal true", () => {
    assert.equal(isSignupEnabled({ SIGNUP_ENABLED: "true" }), true);
    assert.equal(isSignupEnabled({ SIGNUP_ENABLED: "false" }), false);
    assert.equal(isSignupEnabled({ SIGNUP_ENABLED: "1" }), false);
});
