-- Documents the schema objects whose name alone does not carry the invariant.
-- The same statements are mirrored in sqls/schema.sql.

COMMENT ON DOMAIN nanoid IS
    'Public identifier: 10 lowercase base36 characters, as produced by generate_nanoid(10). Not a secret and carries no ordering.';

COMMENT ON COLUMN users.locale IS
    'Language saved from /my/preference; NULL means no preference, so pages and emails fall back to the base locale (en).';

COMMENT ON COLUMN api_tokens.last_used IS
    'Written by the bearer-token check on each authenticated API request; NULL means never used. Token validity depends on expires_at, not on this column.';

COMMENT ON COLUMN password_reset_tokens.used IS
    'Set to TRUE when the reset link is consumed; a used token no longer validates, so each link works once.';

COMMENT ON COLUMN magic_link_tokens.used IS
    'Set to TRUE when the magic link is consumed; a used token no longer validates, so each link works once.';

COMMENT ON TABLE login_attempts IS
    'Sign-in attempts behind the throttle: failures are counted per client IP and per email within the application window; a successful password sign-in deletes the rows for that IP and email.';
