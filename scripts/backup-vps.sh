#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

APP_DIR="${BACKUP_APP_DIR:-/home/loja}"
ENV_FILE="${BACKUP_ENV_FILE:-${APP_DIR}/.env}"

log() {
  printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

fail() {
  printf '[backup-vps] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Comando obrigatorio nao encontrado: $1"
}

load_dotenv() {
  local env_file="$1"

  [[ -f "$env_file" ]] || fail "Arquivo de ambiente nao encontrado: ${env_file}"

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
        console.log(`${key}\t${Buffer.from(String(value), "utf8").toString("base64")}`);
      }
    ' "$env_file"
  )
}

cleanup() {
  if [[ -n "${TEMP_DIR:-}" && -d "$TEMP_DIR" ]]; then
    rm -rf -- "$TEMP_DIR"
  fi
}

require_command node
require_command base64
require_command flock
require_command gzip
require_command tar
require_command sha256sum
require_command find

if command -v mariadb-dump >/dev/null 2>&1; then
  DB_DUMP_COMMAND="mariadb-dump"
elif command -v mysqldump >/dev/null 2>&1; then
  DB_DUMP_COMMAND="mysqldump"
else
  fail "Nenhum cliente de dump MariaDB encontrado (mariadb-dump ou mysqldump)."
fi

load_dotenv "$ENV_FILE"

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/zenv-store}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
UPLOADS_DIR="${BACKUP_UPLOADS_DIR:-${APP_DIR}/storage/uploads}"
REMOTE_ROOT="${BACKUP_REMOTE_ROOT:-}"
LOCK_FILE="${BACKUP_LOCK_FILE:-/var/lock/zenv-store-backup.lock}"
TIMESTAMP="$(date -u '+%Y%m%dT%H%M%SZ')"
HOST_LABEL="$(hostname -s 2>/dev/null || hostname)"
FINAL_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
TEMP_DIR="${BACKUP_ROOT}/.${TIMESTAMP}.tmp"

[[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] || fail "BACKUP_RETENTION_DAYS deve ser um numero inteiro."
[[ "$RETENTION_DAYS" -ge 1 ]] || fail "BACKUP_RETENTION_DAYS deve ser maior ou igual a 1."
[[ "$BACKUP_ROOT" == /* ]] || fail "BACKUP_ROOT deve ser um caminho absoluto."
[[ "$BACKUP_ROOT" != "/" ]] || fail "BACKUP_ROOT nao pode apontar para a raiz do sistema."

if [[ -n "$REMOTE_ROOT" ]]; then
  require_command rclone
  [[ "$REMOTE_ROOT" == *:* ]] || fail "BACKUP_REMOTE_ROOT deve apontar para um remote rclone."
  REMOTE_ROOT="${REMOTE_ROOT%/}"
fi

trap cleanup EXIT

mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"

exec 9>"$LOCK_FILE"
flock -n 9 || fail "Ja existe outro backup em execucao."

DB_HOST="${MARIADB_HOST:-127.0.0.1}"
DB_PORT="${MARIADB_PORT:-3306}"
DB_NAME="${MARIADB_DATABASE:-}"
DB_USER="${MARIADB_USER:-}"
DB_PASSWORD="${MARIADB_PASSWORD:-}"

[[ -n "$DB_NAME" ]] || fail "MARIADB_DATABASE nao configurado."
[[ -n "$DB_USER" ]] || fail "MARIADB_USER nao configurado."
[[ -n "$DB_PASSWORD" ]] || fail "MARIADB_PASSWORD nao configurado."
[[ -d "$UPLOADS_DIR" ]] || fail "Diretorio de uploads nao encontrado: ${UPLOADS_DIR}"
[[ ! -e "$FINAL_DIR" ]] || fail "Destino de backup ja existe: ${FINAL_DIR}"

mkdir -p "$TEMP_DIR"

DB_CREDENTIALS_FILE="${TEMP_DIR}/.mariadb-client.cnf"
ESCAPED_DB_HOST="${DB_HOST//\\/\\\\}"
ESCAPED_DB_HOST="${ESCAPED_DB_HOST//\"/\\\"}"
ESCAPED_DB_USER="${DB_USER//\\/\\\\}"
ESCAPED_DB_USER="${ESCAPED_DB_USER//\"/\\\"}"
ESCAPED_DB_PASSWORD="${DB_PASSWORD//\\/\\\\}"
ESCAPED_DB_PASSWORD="${ESCAPED_DB_PASSWORD//\"/\\\"}"

cat > "$DB_CREDENTIALS_FILE" <<EOF
[client]
host="${ESCAPED_DB_HOST}"
port=${DB_PORT}
user="${ESCAPED_DB_USER}"
password="${ESCAPED_DB_PASSWORD}"
EOF
chmod 600 "$DB_CREDENTIALS_FILE"

log "Criando dump transacional do MariaDB"
"$DB_DUMP_COMMAND" \
  --defaults-extra-file="$DB_CREDENTIALS_FILE" \
  --single-transaction \
  --quick \
  --skip-lock-tables \
  --triggers \
  --hex-blob \
  --default-character-set=utf8mb4 \
  "$DB_NAME" \
  | gzip -9 > "${TEMP_DIR}/database.sql.gz"

rm -f -- "$DB_CREDENTIALS_FILE"

[[ -s "${TEMP_DIR}/database.sql.gz" ]] || fail "O dump do banco foi criado vazio."
gzip -t "${TEMP_DIR}/database.sql.gz"

log "Compactando uploads"
tar -C "$UPLOADS_DIR" -czf "${TEMP_DIR}/uploads.tar.gz" .
[[ -s "${TEMP_DIR}/uploads.tar.gz" ]] || fail "O arquivo de uploads foi criado vazio."
tar -tzf "${TEMP_DIR}/uploads.tar.gz" >/dev/null

cat > "${TEMP_DIR}/manifest.txt" <<EOF
backup_version=1
created_at_utc=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
host=${HOST_LABEL}
database=${DB_NAME}
database_host=${DB_HOST}
uploads_source=${UPLOADS_DIR}
retention_days=${RETENTION_DAYS}
EOF

(
  cd "$TEMP_DIR"
  sha256sum database.sql.gz uploads.tar.gz manifest.txt > SHA256SUMS
  sha256sum --check SHA256SUMS >/dev/null
)

mv "$TEMP_DIR" "$FINAL_DIR"
trap - EXIT

log "Aplicando retencao de ${RETENTION_DAYS} dia(s)"
find "$BACKUP_ROOT" \
  -mindepth 1 \
  -maxdepth 1 \
  -type d \
  -name '20??????T??????Z' \
  -mtime "+${RETENTION_DAYS}" \
  -exec rm -rf -- {} +

if [[ -n "$REMOTE_ROOT" ]]; then
  REMOTE_DIR="${REMOTE_ROOT}/${TIMESTAMP}"
  log "Enviando copia criptografada para ${REMOTE_DIR}"
  rclone copy "$FINAL_DIR" "$REMOTE_DIR" \
    --checkers 4 \
    --transfers 2 \
    --retries 3 \
    --low-level-retries 10

  log "Validando copia externa"
  rclone check "$FINAL_DIR" "$REMOTE_DIR" --one-way --download
fi

log "Backup concluido: ${FINAL_DIR}"
du -sh "$FINAL_DIR"
printf '%s\n' "$FINAL_DIR"
