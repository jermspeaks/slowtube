#!/usr/bin/env bash
# Backup Slowtube SQLite DB. Run from cron (e.g. daily) as a user that can read the DB file.
# Usage: BACKUP_DIR=/var/backups/slowtube DATABASE_PATH=/opt/slowtube/backend/database/watch-later.db ./backup-sqlite.sh
set -euo pipefail

DB_PATH="${DATABASE_PATH:-./backend/database/watch-later.db}"
DEST_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="watch-later-${STAMP}.db"

mkdir -p "$DEST_DIR"

BACKUP_FILE="${DEST_DIR}/${NAME}"
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_PATH" ".backup '${BACKUP_FILE}'"
else
  cp -a "$DB_PATH" "$BACKUP_FILE"
fi

# Keep last 14 daily backups (optional — comment out if you use another retention tool)
find "$DEST_DIR" -name 'watch-later-*.db' -type f -mtime +14 -delete 2>/dev/null || true

echo "Backed up to ${BACKUP_FILE}"
