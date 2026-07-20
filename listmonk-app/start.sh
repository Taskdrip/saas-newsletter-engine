#!/bin/sh
# Generates config.toml from env vars then starts listmonk
set -e

cd "$(dirname "$0")"

# Use PORT injected by Replit, or fall back to 9000
APP_PORT="${PORT:-9000}"

# Parse DATABASE_URL (format: postgresql://user:pass@host[:port]/dbname[?params])
if [ -n "$DATABASE_URL" ]; then
  REST="${DATABASE_URL#postgres://}"
  REST="${REST#postgresql://}"
  USERPASS="${REST%%@*}"
  DB_USER="${USERPASS%%:*}"
  DB_PASSWORD="${USERPASS#*:}"
  HOSTPART="${REST#*@}"
  HOSTPORT="${HOSTPART%%/*}"
  DB_HOST="${HOSTPORT%%:*}"
  if echo "$HOSTPORT" | grep -q ':'; then
    DB_PORT="${HOSTPORT#*:}"
  else
    DB_PORT="5432"
  fi
  DBPART="${HOSTPART#*/}"
  DB_NAME="${DBPART%%\?*}"
  DB_SSLMODE=$(echo "$DATABASE_URL" | grep -o 'sslmode=[^&]*' | cut -d= -f2 || echo "disable")
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-listmonk}"
DB_PASSWORD="${DB_PASSWORD:-listmonk}"
DB_NAME="${DB_NAME:-listmonk}"
DB_SSLMODE="${DB_SSLMODE:-disable}"

ADMIN_USER="${LISTMONK_ADMIN_USER:-listmonk}"
ADMIN_PASSWORD="${LISTMONK_ADMIN_PASSWORD:-listmonk_admin_2024}"

cat > config.toml << TOML
[app]
  address = "0.0.0.0:${APP_PORT}"
  admin_username = "${ADMIN_USER}"
  admin_password = "${ADMIN_PASSWORD}"

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

echo "[start.sh] Config written — db=${DB_HOST}:${DB_PORT}/${DB_NAME}, port=${APP_PORT}"

# First-boot: install DB schema. Set LISTMONK_INSTALL=true once, then remove it.
if [ "${LISTMONK_INSTALL}" = "true" ]; then
  echo "[start.sh] Installing database schema..."
  ./listmonk --install --yes
  echo "[start.sh] Install complete."
fi

# Upgrade-only: runs safe migrations. Set LISTMONK_UPGRADE=true when bumping version.
if [ "${LISTMONK_UPGRADE}" = "true" ]; then
  echo "[start.sh] Running DB upgrade/migrations..."
  ./listmonk --upgrade --yes
  echo "[start.sh] Upgrade complete."
fi

echo "[start.sh] Starting listmonk..."
exec ./listmonk
