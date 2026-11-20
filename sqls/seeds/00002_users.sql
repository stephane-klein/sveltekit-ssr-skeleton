-- Development only: demo account advertised in README.md.
INSERT INTO users (id, email, display_name, password_hash)
VALUES (
       'demo-alice',
       'alice@example.com',
       'Alice Admin',
        -- Hash generated with: pnpm hash-password --password=password123
       '$argon2id$v=19$m=19456,t=2,p=1$KlukUlRCFfykfEyMKpdA4g$+zLFSTnpz9OXyXGwmfydrWvxa0D2iFd4hYp0Zc5V/hQ'
)
  ON CONFLICT (email) DO NOTHING;

INSERT INTO api_tokens (id, user_id, name, token_hash, expires_at)
SELECT 'demo-alice-token',
       id,
       'demo',
       encode(sha256('REPLACE_ME_ALICE_API_TOKEN_32_CHARS_MIN'::bytea), 'hex'),
       NULL
  FROM users
 WHERE email = 'alice@example.com'
  ON CONFLICT DO NOTHING;
