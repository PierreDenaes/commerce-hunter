#!/usr/bin/env bash
# Backup quotidien PostgreSQL (conteneur ch-postgres) avec rétention.
#
# Installation sur le VPS (cron, 4h du matin) :
#   crontab -e
#   0 4 * * * /var/www/commercehunter/scripts/backup-postgres.sh >> /var/log/ch-backup.log 2>&1
#
# Restauration :
#   gunzip -c /var/backups/commercehunter/ch_YYYY-MM-DD.sql.gz \
#     | docker exec -i ch-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
#
# Recommandé en plus : copie hors VPS (rclone/S3) — un backup sur la même
# machine ne protège pas d'une panne disque.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/commercehunter}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
CONTAINER="${CONTAINER:-ch-postgres}"

# Lit POSTGRES_USER / POSTGRES_DB depuis l'environnement du conteneur
# (source de vérité unique — pas de credentials dans ce script).
PG_USER="$(docker exec "$CONTAINER" printenv POSTGRES_USER)"
PG_DB="$(docker exec "$CONTAINER" printenv POSTGRES_DB)"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%F)"
OUT="$BACKUP_DIR/ch_${STAMP}.sql.gz"

docker exec "$CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DB" --no-owner | gzip > "$OUT.tmp"
mv "$OUT.tmp" "$OUT"

# Sanity check : un dump vide ou tronqué doit faire échouer le cron
SIZE=$(stat -c%s "$OUT" 2>/dev/null || stat -f%z "$OUT")
if [ "$SIZE" -lt 1024 ]; then
  echo "ERREUR: dump anormalement petit (${SIZE} octets) — backup invalide" >&2
  exit 1
fi

# Rétention
find "$BACKUP_DIR" -name "ch_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

echo "$(date -Is) backup OK: $OUT ($SIZE octets)"
