CREATE OR REPLACE FUNCTION trigger_users_before_update_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_users_before_update_set_updated_at();

COMMENT ON TRIGGER users_set_updated_at ON users IS
    'Sets users.updated_at on every UPDATE so the column cannot go stale when a caller forgets it.';
