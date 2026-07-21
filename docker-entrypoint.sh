#!/bin/sh
# ──────────────────────────────────────────────────────────────────────────────
# listmonk Docker entrypoint
# Generates /listmonk/config.toml from environment variables, then
# optionally runs --install (first boot) before starting the server.
# ──────────────────────────────────────────────────────────────────────────────
set -e

# ── 1. Parse DATABASE_URL → individual DB_* vars ──────────────────────────────
# Railway PostgreSQL provides DATABASE_URL in the form:
#   postgresql://user:password@host:port/dbname
if [ -n "$DATABASE_URL" ]; then
  # Strip the protocol prefix (postgres:// or postgresql://)
  REST="${DATABASE_URL#postgres://}"
  REST="${REST#postgresql://}"

  # user:password
  USERPASS="${REST%%@*}"
  DB_USER="${USERPASS%%:*}"
  DB_PASSWORD="${USERPASS#*:}"

  # host:port/dbname?params
  HOSTPART="${REST#*@}"
  HOSTPORT="${HOSTPART%%/*}"
  DB_HOST="${HOSTPORT%%:*}"
  DB_PORT="${HOSTPORT#*:}"

  # dbname (strip query-string params)
  DBPART="${HOSTPART#*/}"
  DB_NAME="${DBPART%%\?*}"

  export DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME
fi

# ── 2. Defaults ───────────────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-listmonk}"
DB_PASSWORD="${DB_PASSWORD:-listmonk}"
DB_NAME="${DB_NAME:-listmonk}"
DB_SSLMODE="${DB_SSLMODE:-require}"

# Railway injects PORT; listmonk must bind to it
APP_PORT="${PORT:-9000}"

# ── 3. Write config.toml ──────────────────────────────────────────────────────
# Note: admin_username / admin_password are deprecated in listmonk v6 — users
# are managed via the Admin UI. We omit them to avoid the startup WARNING.
CONFIG_PATH="/listmonk/config.toml"

cat > "$CONFIG_PATH" << TOML
[app]
  address = "0.0.0.0:${APP_PORT}"

[db]
  host = "${DB_HOST}"
  port = ${DB_PORT}
  user = "${DB_USER}"
  password = "${DB_PASSWORD}"
  database = "${DB_NAME}"
  ssl_mode = "${DB_SSLMODE}"
  max_open = 25
  max_idle = 25
  max_lifetime = "300s"
TOML

echo "[entrypoint] config.toml written (db=${DB_HOST}:${DB_PORT}/${DB_NAME}, port=${APP_PORT})"

# ── 4. Install DB schema (idempotent — skips if already set up) ───────────────
echo "[entrypoint] Ensuring database schema …"
/listmonk/listmonk --install --idempotent --yes --config "$CONFIG_PATH"
echo "[entrypoint] Schema ready."

# ── 5. Upgrade (runs safe migrations, no-op if already current) ───────────────
# Only runs when LISTMONK_UPGRADE=true to avoid adding startup latency on every
# deploy. Set it once when upgrading listmonk versions, then remove it.
if [ "${LISTMONK_UPGRADE}" = "true" ]; then
  echo "[entrypoint] Running --upgrade …"
  /listmonk/listmonk --upgrade --yes --config "$CONFIG_PATH"
  echo "[entrypoint] Upgrade complete."
fi

# ── 6. Launch ─────────────────────────────────────────────────────────────────
echo "[entrypoint] Starting listmonk on port ${APP_PORT} …"
exec "$@" --config "$CONFIG_PATH"
