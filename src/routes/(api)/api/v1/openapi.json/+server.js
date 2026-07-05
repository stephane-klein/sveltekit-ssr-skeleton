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
            "/api/v1/contacts": {
                get: {
                    summary: "List contacts",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        "200": {
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
                        "401": { $ref: "#/components/responses/Unauthorized" },
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
                        "201": {
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
                        "400": { $ref: "#/components/responses/BadRequest" },
                        "401": { $ref: "#/components/responses/Unauthorized" },
                    },
                },
            },
            "/api/v1/contacts/{id}": {
                get: {
                    summary: "Get a contact",
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: "id", in: "path", required: true, schema: { type: "integer" } },
                    ],
                    responses: {
                        "200": {
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
                        "401": { $ref: "#/components/responses/Unauthorized" },
                        "404": { $ref: "#/components/responses/NotFound" },
                    },
                },
                patch: {
                    summary: "Update a contact (partial)",
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: "id", in: "path", required: true, schema: { type: "integer" } },
                    ],
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
                        "200": {
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
                        "400": { $ref: "#/components/responses/BadRequest" },
                        "401": { $ref: "#/components/responses/Unauthorized" },
                        "404": { $ref: "#/components/responses/NotFound" },
                        "422": { $ref: "#/components/responses/Unprocessable" },
                    },
                },
                delete: {
                    summary: "Delete a contact",
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: "id", in: "path", required: true, schema: { type: "integer" } },
                    ],
                    responses: {
                        "204": { description: "Deleted (no content)" },
                        "401": { $ref: "#/components/responses/Unauthorized" },
                        "404": { $ref: "#/components/responses/NotFound" },
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
                Unprocessable: {
                    description: "Unprocessable Entity",
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
            },
        },
    });
}
