import { createHash, randomBytes } from "node:crypto";
import { logger } from "./logger.js";

const issuer = process.env.AUTHELIA_ISSUER;
const clientId = process.env.AUTHELIA_CLIENT_ID;
const clientSecret = process.env.AUTHELIA_CLIENT_SECRET;
const origin = process.env.MY_APP_ORIGIN || "http://localhost:5173";
const redirectURI = `${origin}/login/oidc/callback`;

let endpointsCache = null;

export const isAutheliaConfigured = Boolean(issuer && clientId && clientSecret);

export function logAutheliaConfig() {
    if (isAutheliaConfigured) {
        logger.info({ issuer }, "Authelia sign-in enabled");
        return;
    }

    if (!issuer) logger.warn("Authelia sign-in disabled — AUTHELIA_ISSUER is not set");
    if (!clientId) logger.warn("Authelia sign-in disabled — AUTHELIA_CLIENT_ID is not set");
    if (!clientSecret) logger.warn("Authelia sign-in disabled — AUTHELIA_CLIENT_SECRET is not set");
}

function assertConfigured() {
    if (!isAutheliaConfigured) {
        throw new Error("AUTHELIA_ISSUER, AUTHELIA_CLIENT_ID and AUTHELIA_CLIENT_SECRET must be set");
    }
}

function generateState() {
    return randomBytes(32).toString("base64url");
}

function generateCodeVerifier() {
    return randomBytes(32).toString("base64url");
}

function createS256CodeChallenge(codeVerifier) {
    return createHash("sha256").update(codeVerifier).digest("base64url");
}

function createAuthorizationURLWithPKCE(authorizationEndpoint, state, codeVerifier, scopes) {
    const url = new URL(authorizationEndpoint);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectURI);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("code_challenge", createS256CodeChallenge(codeVerifier));
    if (scopes.length > 0) {
        url.searchParams.set("scope", scopes.join(" "));
    }
    return url;
}

// Shared fetch + JSON parse logic for the OIDC HTTP calls. `label` names the
// exchange ("OpenID configuration", "OIDC token", "OIDC userinfo") in the log
// and error messages. The caller decides how to react to a throw; this helper
// only logs the failure with enough context to debug it.
async function fetchJson(url, { label, init }) {
    let res;
    try {
        res = await fetch(url, init);
    } catch (err) {
        logger.error({ err, url }, `${label} request failed`);
        throw new Error(`Failed to fetch ${label}: ${err.message}`, { cause: err });
    }

    if (!res.ok) {
        logger.error({ url, status: res.status, statusText: res.statusText }, `${label} returned non-OK status`);
        throw new Error(`Failed to fetch ${label}: ${res.status}`);
    }

    try {
        return await res.json();
    } catch (err) {
        logger.error({ err, url }, `${label} response was not valid JSON`);
        throw new Error(`Failed to parse ${label} response`, { cause: err });
    }
}

async function discoverEndpoints() {
    if (endpointsCache) return endpointsCache;

    const config = await fetchJson(`${issuer}/.well-known/openid-configuration`, {
        label: "OpenID configuration",
    });

    endpointsCache = {
        authorizationEndpoint: config.authorization_endpoint,
        tokenEndpoint: config.token_endpoint,
        userinfoEndpoint: config.userinfo_endpoint,
    };

    logger.info(
        {
            authorizationEndpoint: config.authorization_endpoint,
            tokenEndpoint: config.token_endpoint,
            userinfoEndpoint: config.userinfo_endpoint,
            issuer: config.issuer,
        },
        "OIDC endpoints discovered",
    );

    return endpointsCache;
}

export async function createAuthorizationURL() {
    assertConfigured();
    const { authorizationEndpoint } = await discoverEndpoints();
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const url = createAuthorizationURLWithPKCE(authorizationEndpoint, state, codeVerifier, [
        "openid",
        "profile",
        "email",
    ]);

    logger.info({ url: url.toString() }, "OIDC authorization URL created");

    return { url, state, codeVerifier };
}

export async function validateAuthorizationCode(code, codeVerifier) {
    assertConfigured();
    const { tokenEndpoint } = await discoverEndpoints();

    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("code", code);
    body.set("redirect_uri", redirectURI);
    body.set("code_verifier", codeVerifier);

    const basicCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokens = await fetchJson(tokenEndpoint, {
        label: "OIDC token",
        init: {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
                Authorization: `Basic ${basicCredentials}`,
            },
            body,
        },
    });

    logger.info("OIDC authorization code validated");

    return tokens;
}

async function getUserInfoEndpoint() {
    const { userinfoEndpoint } = await discoverEndpoints();
    return userinfoEndpoint;
}

// Fetches the userinfo document an access token gives access to. The OIDC
// callback route used to inline this fetch, its status check, its parse and
// its error mapping.
export async function fetchUserInfo(accessToken) {
    const userinfoEndpoint = await getUserInfoEndpoint();

    const userinfo = await fetchJson(userinfoEndpoint, {
        label: "OIDC userinfo",
        init: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    logger.info({ email: userinfo.email }, "Userinfo fetched");

    return userinfo;
}

export function extractClaims(idToken) {
    const payload = idToken.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");

    return JSON.parse(Buffer.from(base64, "base64").toString());
}
