-- Stored functions, reloaded on every `pnpm migrate`.
--
-- This file MUST stay idempotent. Prefer `CREATE OR REPLACE FUNCTION`. Use
-- `DROP FUNCTION IF EXISTS` only when the signature changes: a function
-- referenced by a column `DEFAULT` cannot be dropped while the default depends
-- on it.
--
-- A migration that drops or renames a table used by a function here must ship
-- the matching update of this file, otherwise the next `pnpm migrate` fails
-- loudly here.
--
-- `DROP FUNCTION IF EXISTS` statements emit "does not exist, skipping" NOTICEs,
-- which the pino `onnotice` hook logs at debug. Wrap them in
-- `SET LOCAL client_min_messages = warning` ... `= notice` when they would emit
-- NOTICEs. `CREATE OR REPLACE` does not emit that NOTICE.
--
-- The template below is an example. `generate_nanoid` is defined at the end of
-- this file.
--
-- SET LOCAL client_min_messages = warning;
--
-- DROP FUNCTION IF EXISTS contacts_count();
--
-- SET LOCAL client_min_messages = notice;
--
-- CREATE FUNCTION contacts_count() RETURNS bigint
-- LANGUAGE sql
-- AS $$
--     SELECT count(*) FROM contacts;
-- $$;
--
-- COMMENT ON FUNCTION contacts_count() IS 'Example function — returns the number of rows in contacts.';

-- `contacts.nanoid` uses this function as a DEFAULT, so do not DROP it.
-- `CREATE OR REPLACE` keeps the dependency intact.
CREATE OR REPLACE FUNCTION generate_nanoid(
    size INT DEFAULT 10,
    alphabet TEXT DEFAULT '0123456789abcdefghijklmnopqrstuvwxyz'
)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
    id_builder     TEXT := '';
    bytes          BYTEA;
    alphabet_index INT;
    mask           INT;
    step           INT;
BEGIN
    IF size IS NULL OR size < 1 THEN
        RAISE EXCEPTION 'size must be a positive integer';
    END IF;

    IF alphabet IS NULL OR LENGTH(alphabet) < 2 THEN
        RAISE EXCEPTION 'alphabet must contain at least two characters';
    END IF;

    mask := (2 << FLOOR(LOG(2, LENGTH(alphabet) - 1))::INT) - 1;
    step := CEIL(1.6 * mask * size / LENGTH(alphabet))::INT;

    WHILE TRUE LOOP
        bytes := gen_random_bytes(step);

        FOR i IN 0 .. step - 1 LOOP
            alphabet_index := GET_BYTE(bytes, i) & mask;

            IF alphabet_index < LENGTH(alphabet) THEN
                id_builder := id_builder || SUBSTR(alphabet, alphabet_index + 1, 1);

                IF LENGTH(id_builder) = size THEN
                    RETURN id_builder;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION generate_nanoid(INT, TEXT)
    IS 'Generates a nanoid from cryptographically secure random bytes.';

CREATE OR REPLACE FUNCTION trigger_users_before_update_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- Returns one contacts page and its total in a single round-trip. The page CTE
-- walks the primary key index, so `ORDER BY id LIMIT/OFFSET` stops after the
-- requested rows. The JSON aggregate orders explicitly: the array order is part
-- of the contract, not a side effect of the plan.
CREATE OR REPLACE FUNCTION get_contacts_page_data(
    _limit integer,
    _offset integer
) RETURNS jsonb
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
    WITH page AS (
        SELECT id, nanoid, firstname, lastname, created_at
        FROM contacts
        ORDER BY id
        LIMIT _limit
        OFFSET _offset
    ),
    total AS (
        SELECT count(*)::int AS n FROM contacts
    )
    SELECT jsonb_build_object(
        'contacts', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'nanoid', nanoid,
                'firstname', firstname,
                'lastname', lastname,
                'created_at', to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
            ) ORDER BY id)
            FROM page
        ), '[]'::jsonb),
        'total', (SELECT n FROM total)
    );
$$;

COMMENT ON FUNCTION get_contacts_page_data(INT, INT)
    IS 'Returns the contacts page (up to _limit rows from _offset) and the total row count as one JSONB document.';
