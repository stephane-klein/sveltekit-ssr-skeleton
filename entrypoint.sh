#!/bin/sh

set -e

COMMAND=${1:-""}

case "$COMMAND" in
    migrate)
        node src/migrate.js
        ;;
    seed)
        node src/migrate.js
        node src/seed.js
        ;;
    add-user)
        shift
        exec node src/add-user.js "$@"
        ;;
    create-api-token)
        shift
        exec node src/create-api-token.js "$@"
        ;;
    serve|"")
        node src/migrate.js
        exec node /app/build/index.js
        ;;
    *)
        exec "$@"
        ;;
esac
