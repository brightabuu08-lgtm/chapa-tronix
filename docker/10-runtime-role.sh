#!/bin/sh
set -eu
# Bootstrap is used only during first cluster initialization. Runtime cannot own schema objects.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=runtime_password="$POSTGRES_RUNTIME_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE chapa_runtime LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION', :'runtime_password') \gexec
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE chapa TO chapa_runtime;
GRANT USAGE ON SCHEMA public TO chapa_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO chapa_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO chapa_runtime;
SQL
