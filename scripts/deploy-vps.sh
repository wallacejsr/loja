#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="${DEPLOY_APP_DIR:-/home/loja}"
WEB_ROOT="${DEPLOY_WEB_ROOT:-/home/zenvapparel.com/public_html}"
PM2_APP_NAME="${DEPLOY_PM2_APP_NAME:-loja-api}"
DOMAIN="${DEPLOY_DOMAIN:-zenvapparel.com}"
RUN_GIT_PULL="${DEPLOY_GIT_PULL:-0}"
RUN_NPM_INSTALL="${DEPLOY_RUN_NPM_INSTALL:-1}"
RUN_LINT="${DEPLOY_RUN_LINT:-1}"
RUN_BUILD="${DEPLOY_RUN_BUILD:-1}"
RUN_SCHEMA_SYNC="${DEPLOY_RUN_SCHEMA_SYNC:-0}"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '\n[deploy-vps] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Comando obrigatorio nao encontrado: $1"
}

require_command bash
require_command npm
require_command rsync
require_command curl
require_command pm2
require_command node
require_command base64

load_dotenv() {
  local env_file="$1"

  [[ -f "$env_file" ]] || return 0

  while IFS=$'\t' read -r key value_b64; do
    [[ -n "$key" ]] || continue
    export "$key=$(printf '%s' "$value_b64" | base64 --decode)"
  done < <(
    node --input-type=module -e '
      import fs from "node:fs";
      import { parse } from "dotenv";

      const envFile = process.argv[1];
      const parsed = parse(fs.readFileSync(envFile, "utf8"));

      for (const [key, value] of Object.entries(parsed)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
        const encoded = Buffer.from(String(value), "utf8").toString("base64");
        console.log(`${key}\t${encoded}`);
      }
    ' "$env_file"
  )
}

cd "$APP_DIR"

if [[ -f "$APP_DIR/.env" ]]; then
  load_dotenv "$APP_DIR/.env"
fi

API_PORT="${STORE_API_PORT:-4000}"
LOCAL_HEALTHCHECK_URL="${DEPLOY_LOCAL_HEALTHCHECK_URL:-http://127.0.0.1:${API_PORT}/api/health}"
HEALTHCHECK_URL="${DEPLOY_HEALTHCHECK_URL:-https://${DOMAIN}/api/health}"
STORE_HEALTHCHECK_URL="${DEPLOY_STORE_HEALTHCHECK_URL:-https://${DOMAIN}/api/store/health}"
ADMIN_URL="${DEPLOY_ADMIN_URL:-https://${DOMAIN}/admin}"
SCHEMA_HOST="${DEPLOY_SCHEMA_HOST:-${MARIADB_HOST:-127.0.0.1}}"
SCHEMA_PORT="${DEPLOY_SCHEMA_PORT:-${MARIADB_PORT:-3306}}"
SCHEMA_DATABASE="${DEPLOY_SCHEMA_DATABASE:-${MARIADB_DATABASE:-}}"
SCHEMA_USER="${DEPLOY_SCHEMA_USER:-${MARIADB_USER:-}}"
SCHEMA_PASSWORD="${DEPLOY_SCHEMA_PASSWORD:-${MARIADB_PASSWORD:-}}"

log "Deploy iniciado em ${APP_DIR}"

if [[ "$RUN_GIT_PULL" == "1" ]]; then
  if [[ -d "$APP_DIR/.git" ]]; then
    log "Atualizando repositorio com git pull --ff-only"
    git pull --ff-only
  else
    fail "DEPLOY_GIT_PULL=1 foi solicitado, mas ${APP_DIR} nao eh um repositorio git."
  fi
fi

if [[ "$RUN_NPM_INSTALL" == "1" ]]; then
  log "Instalando dependencias"
  npm install
fi

log "Validando dependencia mysql2"
npm ls mysql2 >/dev/null 2>&1 || fail "mysql2 nao esta instalado. Rode npm install."

if [[ "$RUN_SCHEMA_SYNC" == "1" ]]; then
  require_command mysql
  [[ -n "$SCHEMA_DATABASE" ]] || fail "MARIADB_DATABASE/DEPLOY_SCHEMA_DATABASE nao configurado."
  [[ -n "$SCHEMA_USER" ]] || fail "MARIADB_USER/DEPLOY_SCHEMA_USER nao configurado."
  [[ -n "$SCHEMA_PASSWORD" ]] || fail "MARIADB_PASSWORD/DEPLOY_SCHEMA_PASSWORD nao configurado."

  log "Sincronizando schema MariaDB"
  SCHEMA_CREDENTIALS_FILE="$(mktemp /tmp/zenv-schema-client.XXXXXX.cnf)"
  trap 'rm -f -- "${SCHEMA_CREDENTIALS_FILE:-}"' EXIT

  ESCAPED_SCHEMA_HOST="${SCHEMA_HOST//\\/\\\\}"
  ESCAPED_SCHEMA_HOST="${ESCAPED_SCHEMA_HOST//\"/\\\"}"
  ESCAPED_SCHEMA_USER="${SCHEMA_USER//\\/\\\\}"
  ESCAPED_SCHEMA_USER="${ESCAPED_SCHEMA_USER//\"/\\\"}"
  ESCAPED_SCHEMA_PASSWORD="${SCHEMA_PASSWORD//\\/\\\\}"
  ESCAPED_SCHEMA_PASSWORD="${ESCAPED_SCHEMA_PASSWORD//\"/\\\"}"

  cat > "$SCHEMA_CREDENTIALS_FILE" <<EOF
[client]
host="${ESCAPED_SCHEMA_HOST}"
port=${SCHEMA_PORT}
user="${ESCAPED_SCHEMA_USER}"
password="${ESCAPED_SCHEMA_PASSWORD}"
EOF
  chmod 600 "$SCHEMA_CREDENTIALS_FILE"

  mysql \
    --defaults-extra-file="$SCHEMA_CREDENTIALS_FILE" \
    "$SCHEMA_DATABASE" \
    < "$APP_DIR/server/store/mariadb-schema.sql"

  rm -f -- "$SCHEMA_CREDENTIALS_FILE"
  trap - EXIT
fi

if [[ "$RUN_LINT" == "1" ]]; then
  log "Executando validacao TypeScript"
  npm run lint
fi

if [[ "$RUN_BUILD" == "1" ]]; then
  log "Gerando build do frontend"
  npm run build
fi

[[ -d "$APP_DIR/dist" ]] || fail "Pasta dist nao encontrada. O build falhou ou nao foi executado."

log "Garantindo pasta de desafio SSL"
mkdir -p "$WEB_ROOT/.well-known/acme-challenge"

log "Sincronizando frontend para ${WEB_ROOT}"
rsync -av --delete --exclude '.well-known' "$APP_DIR/dist/" "$WEB_ROOT/"

log "Reiniciando backend no PM2"
if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP_NAME" --update-env
else
  pm2 start npm --name "$PM2_APP_NAME" --cwd "$APP_DIR" -- run api:start
fi
pm2 save >/dev/null

log "Aguardando backend estabilizar"
sleep 3

log "Executando smoke tests"
curl -fsS "$LOCAL_HEALTHCHECK_URL" >/tmp/deploy-vps-local-health.json
curl -fsS "$HEALTHCHECK_URL" >/tmp/deploy-vps-domain-health.json
curl -fsS "$STORE_HEALTHCHECK_URL" >/tmp/deploy-vps-store-health.json
curl -I -fsS "$ADMIN_URL" >/tmp/deploy-vps-admin-head.txt

log "Health local"
cat /tmp/deploy-vps-local-health.json
printf '\n'

log "Health dominio"
cat /tmp/deploy-vps-domain-health.json
printf '\n'

log "Health store"
cat /tmp/deploy-vps-store-health.json
printf '\n'

log "Deploy finalizado com sucesso"
printf 'Frontend: %s\n' "https://${DOMAIN}/"
printf 'Admin: %s\n' "$ADMIN_URL"
printf 'API health: %s\n' "$HEALTHCHECK_URL"
