import { OAuth2Client, generateState, generateCodeVerifier, CodeChallengeMethod } from "arctic";
import { logger } from "./logger.js";

const issuer = process.env.AUTHELIA_ISSUER;
const clientId = process.env.AUTHELIA_CLIENT_ID;
const clientSecret = process.env.AUTHELIA_CLIENT_SECRET;
const origin = process.env.ORIGIN || "http://localhost:5173";
const redirectURI = `${origin}/login/oidc/callback`;

let endpointsCache = null;

async function discoverEndpoints() {
    if (endpointsCache) return endpointsCache;

    const discoveryUrl = `${issuer}/.well-known/openid-configuration`;

    let res;
    try {
        res = await fetch(discoveryUrl);
    } catch (err) {
        logger.error({ err, discoveryUrl }, "OIDC discovery fetch failed");
        throw new Error(`Failed to fetch OpenID configuration: ${err.message}`);
    }

    if (!res.ok) {
        logger.error({ discoveryUrl, status: res.status, statusText: res.statusText }, "OIDC discovery returned non-OK status");
        throw new Error(`Failed to fetch OpenID configuration: ${res.status}`);
    }

    let config;
    try {
        config = await res.json();
    } catch (err) {
        logger.error({ err, discoveryUrl }, "OIDC discovery response was not valid JSON");
        throw new Error("Failed to parse OpenID configuration");
    }

    endpointsCache = {
        authorizationEndpoint: config.authorization_endpoint,
        tokenEndpoint: config.token_endpoint,
        userinfoEndpoint: config.userinfo_endpoint,
    };

    logger.info({
        authorizationEndpoint: config.authorization_endpoint,
        tokenEndpoint: config.token_endpoint,
        userinfoEndpoint: config.userinfo_endpoint,
        issuer: config.issuer,
    }, "OIDC endpoints discovered");

    return endpointsCache;
}

function getClient() {
    if (!issuer || !clientId || !clientSecret) {
        throw new Error("AUTHELIA_ISSUER, AUTHELIA_CLIENT_ID and AUTHELIA_CLIENT_SECRET must be set");
    }

    return new OAuth2Client(clientId, clientSecret, redirectURI);
}

export async function createAuthorizationURL() {
    const client = getClient();
    const { authorizationEndpoint } = await discoverEndpoints();
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const url = client.createAuthorizationURLWithPKCE(
        authorizationEndpoint,
        state,
        CodeChallengeMethod.S256,
        codeVerifier,
        ["openid", "profile", "email"],
    );

    logger.info({ url: url.toString() }, "OIDC authorization URL created");

    return { url, state, codeVerifier };
}

export async function validateAuthorizationCode(code, codeVerifier) {
    const client = getClient();
    const { tokenEndpoint } = await discoverEndpoints();

    let tokens;
    try {
        tokens = await client.validateAuthorizationCode(tokenEndpoint, code, codeVerifier);
    } catch (err) {
        logger.error({ err, tokenEndpoint }, "OIDC token validation failed");
        throw err;
    }

    logger.info("OIDC authorization code validated");

    return tokens;
}

export async function getUserInfoEndpoint() {
    const { userinfoEndpoint } = await discoverEndpoints();
    return userinfoEndpoint;
}

export function extractClaims(idToken) {
    const payload = idToken.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");

    return JSON.parse(Buffer.from(base64, "base64").toString());
}
