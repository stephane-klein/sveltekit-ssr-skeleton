import assert from "node:assert/strict";
import test from "node:test";

import { getAppOrigin } from "../src/lib/server/app-origin.js";

test("reads MY_APP_ORIGIN", () => {
    assert.equal(getAppOrigin({ MY_APP_ORIGIN: "https://app.example.com" }), "https://app.example.com");
});

test("falls back to the local development origin", () => {
    assert.equal(getAppOrigin({}), "http://localhost:5173");
});
