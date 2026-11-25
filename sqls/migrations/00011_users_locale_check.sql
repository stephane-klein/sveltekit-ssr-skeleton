-- users.locale may hold values written before validation existed. Only 'en'
-- and 'fr' can be rendered by Paraglide, the locale cookie and the email
-- templates, so any other value is reset to NULL: NULL already means "no
-- preference" and the render falls back to the base locale (en).
UPDATE users
   SET locale = NULL
 WHERE locale IS NOT NULL
   AND locale NOT IN ('en', 'fr');

ALTER TABLE users
    ADD CONSTRAINT users_locale_check
    CHECK (locale IS NULL OR locale IN ('en', 'fr'));

COMMENT ON CONSTRAINT users_locale_check ON users IS
    'Only the locales the application can render; NULL means no preference and falls back to the base locale.';
