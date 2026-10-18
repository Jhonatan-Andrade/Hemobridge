#!/usr/bin/env bash
# Backup do PostgreSQL (pg_dump formato custom) e dos arquivos do S3 (SeaweedFS).
# Mantém os últimos 14 backups de cada tipo em /var/backups/hemobridge.
set -euo pipefail
umask 077
DEST=/var/backups/hemobridge
TS=$(date +%Y%m%d-%H%M%S)
cd /opt/hemobridge/infra
set -a; . ./.env; set +a
docker exec hemobridge-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -Z 6 > "$DEST/db-$TS.dump.tmp"
mv "$DEST/db-$TS.dump.tmp" "$DEST/db-$TS.dump"
docker run --rm --user "$(id -u):$(id -g)" -v hemobridge_s3data:/data:ro -v "$DEST":/backup busybox tar czf "/backup/s3-$TS.tar.gz" -C /data .
chmod 600 "$DEST"/s3-$TS.tar.gz
ls -1t "$DEST"/db-*.dump 2>/dev/null | tail -n +15 | xargs -r rm -f
ls -1t "$DEST"/s3-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "backup ok: $TS"
