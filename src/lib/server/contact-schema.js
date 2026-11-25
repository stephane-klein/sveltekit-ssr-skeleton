import { check, minLength, object, optional, pipe, string } from "valibot";

// minLength(1) documents the rule in the generated OpenAPI; check() enforces it
// at runtime because "   " has length 3. Same pattern as the token name.
const nonEmptyText = (field) =>
    pipe(
        string(`${field} must be a non-empty string`),
        minLength(1, `${field} must be a non-empty string`),
        check((value) => value.trim().length > 0, `${field} must be a non-empty string`),
    );

export const contactCreateSchema = object({
    firstname: nonEmptyText("firstname"),
    lastname: nonEmptyText("lastname"),
});

export const contactUpdateSchema = object({
    firstname: optional(nonEmptyText("firstname")),
    lastname: optional(nonEmptyText("lastname")),
});
