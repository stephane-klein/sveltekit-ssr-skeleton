#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { createApiToken } from "./lib/backend/auth.js";
import { logger } from "./lib/backend/logger.js";
import { sql, waitForDb } from "./lib/backend/pg.js";

const argv = yargs(hideBin(process.argv))
    .option("email", {
        type: "string",
        demandOption: true,
        description: "User email address",
    })
    .option("name", {
        type: "string",
        demandOption: true,
        description: "Token name (e.g. 'CI/CD deploy')",
    })
    .parse();

await waitForDb();

const [user] = await sql`SELECT id, email FROM users WHERE email = ${argv.email}`;

if (!user) {
    logger.error({ email: argv.email }, "User not found");
    process.exit(1);
}

const token = await createApiToken(user.id, argv.name);

logger.info({ name: argv.name }, "API token created");
console.log("\nRaw token (shown once — store it safely):");
console.log(token.raw);

await sql.end();
