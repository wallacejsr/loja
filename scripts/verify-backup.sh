#!/usr/bin/env bash

set -Eeuo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/zenv-store}"
BACKUP_DIR="${1:-}"

fail() {
  printf '[verify-backup] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Comando obrigatorio nao encontrado: $1"
}

require_command find
require_command gzip
require_command tar
require_command sha256sum

if [[ -z "$BACKUP_DIR" || "$BACKUP_DIR" == "latest" ]]; then
  BACKUP_DIR="$(
    find "$BACKUP_ROOT" \
      -mindepth 1 \
      -maxdepth 1 \
      -type d \
      -name '20??????T??????Z' \
      -printf '%p\n' \
      | sort \
      | tail -n 1
  )"
fi

[[ -n "$BACKUP_DIR" ]] || fail "Nenhum backup encontrado em ${BACKUP_ROOT}."
[[ -d "$BACKUP_DIR" ]] || fail "Diretorio de backup nao encontrado: ${BACKUP_DIR}"

for file in database.sql.gz uploads.tar.gz manifest.txt SHA256SUMS; do
  [[ -s "${BACKUP_DIR}/${file}" ]] || fail "Arquivo ausente ou vazio: ${BACKUP_DIR}/${file}"
done

(
  cd "$BACKUP_DIR"
  sha256sum --check SHA256SUMS
)

gzip -t "${BACKUP_DIR}/database.sql.gz"
tar -tzf "${BACKUP_DIR}/uploads.tar.gz" >/dev/null

printf 'Backup valido: %s\n' "$BACKUP_DIR"
cat "${BACKUP_DIR}/manifest.txt"
