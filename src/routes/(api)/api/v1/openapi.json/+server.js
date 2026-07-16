import { json } from "@sveltejs/kit";

export function GET() {
    return json({
        openapi: "3.0.0",
        info: {
            title: "my-app API",
            version: "1.0.0",
            description: "REST API for my-app",
        },
        servers: [{ url: "" }],
        paths: {
            "/api/v1/admin/users": {
                get: {
                    summary: "List users (admin)",
                    security: [{ adminBearer: [] }],
                    parameters: [
                        { name: "cursor", in: "query", schema: { type: "string" }, description: "Pagination cursor" },
                        { name: "page_size", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
                    ],
                    responses: {
                        200: {
                            description: "List of users",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: {
                                                type: "array",
                                                items: { $ref: "#/components/schemas/AdminUser" },
                                            },
                                            next_cursor: { type: "string", nullable: true },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        500: { $ref: "#/components/responses/InternalError" },
                    },
                },
                post: {
                    summary: "Create a user (admin)",
                    description: "Either email+display_name+password or oidc_issuer+oidc_subject must be provided",
                    security: [{ adminBearer: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        email: { type: "string", format: "email", example: "user@example.com" },
                                        display_name: { type: "string", example: "John Doe" },
                                        password: {
                                            type: "string",
                                            format: "password",
                                            minLength: 6,
                                            example: "s3cur3!",
                                        },
                                        oidc_issuer: {
                                            type: "string",
                                            example: "https://auth.example.com",
                                        },
                                        oidc_subject: {
                                            type: "string",
                                            example: "johndoe",
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: "User created",
                            headers: {
                                Location: {
                                    schema: { type: "string", format: "uri" },
                                    description: "URL of the created user",
                                },
                            },
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: { $ref: "#/components/schemas/AdminUser" },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        400: { $ref: "#/components/responses/BadRequest" },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        409: { $ref: "#/components/responses/Conflict" },
                        422: { $ref: "#/components/responses/Unprocessable" },
                        500: { $ref: "#/components/responses/InternalError" },
                    },
                },
            },
            "/api/v1/admin/users/{id}": {
                get: {
                    summary: "Get a user (admin)",
                    security: [{ adminBearer: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                    responses: {
                        200: {
                            description: "User details",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: { $ref: "#/components/schemas/AdminUser" },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        404: { $ref: "#/components/responses/NotFound" },
                        500: { $ref: "#/components/responses/InternalError" },
                    },
                },
                patch: {
                    summary: "Update a user (admin, partial)",
                    security: [{ adminBearer: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        email: { type: "string", format: "email", example: "newemail@example.com" },
                                        display_name: { type: "string", example: "New Name" },
                                        password: { type: "string", format: "password", minLength: 8 },
                                        oidc_issuer: { type: "string", example: "https://auth.example.com" },
                                        oidc_subject: { type: "string", example: "johndoe" },
                                        is_active: { type: "boolean" },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: "User updated",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: { $ref: "#/components/schemas/AdminUser" },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        400: { $ref: "#/components/responses/BadRequest" },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        404: { $ref: "#/components/responses/NotFound" },
                        409: { $ref: "#/components/responses/Conflict" },
                        422: { $ref: "#/components/responses/Unprocessable" },
                        500: { $ref: "#/components/responses/InternalError" },
                    },
                },
                delete: {
                    summary: "Delete a user (admin)",
                    security: [{ adminBearer: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
                    responses: {
                        204: { description: "Deleted (no content)" },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        404: { $ref: "#/components/responses/NotFound" },
                        500: { $ref: "#/components/responses/InternalError" },
                    },
                },
            },
            "/api/v1/admin/send-test-mail": {
                post: {
                    summary: "Send a test email with hardcoded subject and body (admin)",
                    description: "Only the recipient address can be set — subject and text are hardcoded to prevent abuse.",
                    security: [{ adminBearer: [] }],
                    requestBody: {
                        required: false,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        to: { type: "string", format: "email", example: "user@example.com" },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: "Email sent",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: {
                                                type: "object",
                                                properties: {
                                                    messageId: { type: "string", example: "<abc123@localhost>" },
                                                    to: { type: "string", format: "email" },
                                                    subject: { type: "string" },
                                                },
                                            },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        400: { $ref: "#/components/responses/BadRequest" },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        500: { $ref: "#/components/responses/InternalError" },
                    },
                },
            },
            "/api/v1/contacts": {
                get: {
                    summary: "List contacts",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: "List of contacts",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: {
                                                type: "array",
                                                items: { $ref: "#/components/schemas/Contact" },
                                            },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        401: { $ref: "#/components/responses/Unauthorized" },
                    },
                },
                post: {
                    summary: "Create a contact",
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["firstname"],
                                    properties: {
                                        firstname: { type: "string", example: "Alice" },
                                        lastname: { type: "string", example: "Martin" },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: "Contact created",
                            headers: {
                                Location: {
                                    schema: { type: "string", format: "uri" },
                                    description: "URL of the created contact",
                                },
                            },
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: { $ref: "#/components/schemas/Contact" },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        400: { $ref: "#/components/responses/BadRequest" },
                        401: { $ref: "#/components/responses/Unauthorized" },
                    },
                },
            },
            "/api/v1/contacts/{id}": {
                get: {
                    summary: "Get a contact",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                    responses: {
                        200: {
                            description: "Contact details",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: { $ref: "#/components/schemas/Contact" },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        404: { $ref: "#/components/responses/NotFound" },
                    },
                },
                patch: {
                    summary: "Update a contact (partial)",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        firstname: { type: "string", example: "Alice" },
                                        lastname: { type: "string", example: "Martin" },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: "Contact updated",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            data: { $ref: "#/components/schemas/Contact" },
                                            _links: { $ref: "#/components/schemas/Links" },
                                        },
                                    },
                                },
                            },
                        },
                        400: { $ref: "#/components/responses/BadRequest" },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        404: { $ref: "#/components/responses/NotFound" },
                        422: { $ref: "#/components/responses/Unprocessable" },
                    },
                },
                delete: {
                    summary: "Delete a contact",
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
                    responses: {
                        204: { description: "Deleted (no content)" },
                        401: { $ref: "#/components/responses/Unauthorized" },
                        404: { $ref: "#/components/responses/NotFound" },
                    },
                },
            },
        },
        components: {
            schemas: {
                Contact: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 1 },
                        firstname: { type: "string", example: "Alice" },
                        lastname: { type: "string", example: "Martin" },
                        created_at: { type: "string", format: "date-time", example: "2026-07-11T09:00:00Z" },
                    },
                },
                Links: {
                    type: "object",
                    properties: {
                        self: {
                            type: "object",
                            properties: { href: { type: "string", format: "uri" } },
                        },
                        collection: {
                            type: "object",
                            properties: { href: { type: "string", format: "uri" } },
                        },
                    },
                },
                AdminUser: {
                    type: "object",
                    properties: {
                        id: { type: "string", example: "nano-id-abc123" },
                        email: { type: "string", format: "email", example: "user@example.com" },
                        display_name: { type: "string", example: "John Doe" },
                        oidc_issuer: { type: "string", nullable: true, example: "https://auth.example.com" },
                        oidc_subject: { type: "string", nullable: true, example: "johndoe" },
                        is_active: { type: "boolean", example: true },
                        created_at: { type: "string", format: "date-time", example: "2026-07-11T09:00:00+02:00" },
                        updated_at: { type: "string", format: "date-time", example: "2026-07-11T09:00:00+02:00" },
                    },
                },
                ProblemDetail: {
                    type: "object",
                    properties: {
                        type: { type: "string", format: "uri", example: "about:blank" },
                        title: { type: "string" },
                        status: { type: "integer" },
                        detail: { type: "string" },
                        instance: { type: "string", format: "uri" },
                    },
                },
            },
            responses: {
                BadRequest: {
                    description: "Bad Request",
                    content: {
                        "application/problem+json": {
                            schema: { $ref: "#/components/schemas/ProblemDetail" },
                        },
                    },
                },
                Unauthorized: {
                    description: "Unauthorized",
                    content: {
                        "application/problem+json": {
                            schema: { $ref: "#/components/schemas/ProblemDetail" },
                        },
                    },
                },
                NotFound: {
                    description: "Not Found",
                    content: {
                        "application/problem+json": {
                            schema: { $ref: "#/components/schemas/ProblemDetail" },
                        },
                    },
                },
                Conflict: {
                    description: "Conflict",
                    content: {
                        "application/problem+json": {
                            schema: { $ref: "#/components/schemas/ProblemDetail" },
                        },
                    },
                },
                Unprocessable: {
                    description: "Unprocessable Entity",
                    content: {
                        "application/problem+json": {
                            schema: { $ref: "#/components/schemas/ProblemDetail" },
                        },
                    },
                },
                InternalError: {
                    description: "Internal Server Error",
                    content: {
                        "application/problem+json": {
                            schema: { $ref: "#/components/schemas/ProblemDetail" },
                        },
                    },
                },
            },
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    description: "API token generated from /my/tokens or create-api-token CLI",
                },
                adminBearer: {
                    type: "http",
                    scheme: "bearer",
                    description: "Super admin token set via MY_APP_ADMIN_TOKEN environment variable",
                },
            },
        },
    });
}
