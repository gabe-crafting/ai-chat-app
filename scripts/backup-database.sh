#!/usr/bin/env bash
set -euo pipefail

# Logical Postgres backup for Supabase (roles + schema + data).
# Requires: pg_dump, pg_restore, SUPABASE_DB_URL, OUTPUT_DIR

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL is not set." >&2
  exit 1
fi

OUTPUT_DIR="${OUTPUT_DIR:-./backup-out}"
mkdir -p "$OUTPUT_DIR"

DB_DUMP="${OUTPUT_DIR}/postgres.dump"
STORAGE_SCHEMA="${OUTPUT_DIR}/storage-schema.sql"

echo "Dumping database (custom format)…"
pg_dump "$SUPABASE_DB_URL" -Fc --no-owner --no-acl -f "$DB_DUMP"

echo "Verifying dump…"
pg_restore --list "$DB_DUMP" >/dev/null

echo "Dumping storage schema metadata…"
pg_dump "$SUPABASE_DB_URL" --schema=storage --schema-only --no-owner --no-acl -f "$STORAGE_SCHEMA"

BYTES=$(stat -c%s "$DB_DUMP" 2>/dev/null || stat -f%z "$DB_DUMP")
if [[ "$BYTES" -lt 1000 ]]; then
  echo "Backup file suspiciously small (${BYTES} bytes)." >&2
  exit 1
fi

echo "Backup ready in ${OUTPUT_DIR}"
