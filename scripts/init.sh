#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/../"

cat << EOF | docker compose exec -T postgres sh -c "psql --quiet -U \$POSTGRES_USER \$POSTGRES_DB"
    CREATE DATABASE myapp WITH OWNER postgres;
    CREATE DATABASE myapp WITH OWNER postgres;
EOF

pnpm run migrate:reset --erase
pnpm run migrate:status
