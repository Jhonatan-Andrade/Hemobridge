#!/usr/bin/env bash
# Aplica as migrations do Prisma (e, com --seed, a carga inicial) no banco da VM.
# Uso: /opt/hemobridge/infra/migrar.sh [--seed]
set -euo pipefail
cd /opt/hemobridge/infra
set -a; . ./.env; . ./admin-inicial.env; set +a
git -C ../repo pull -q --ff-only
CMD="npm ci --no-audit --no-fund --loglevel=error && npx prisma migrate deploy"
[ "${1:-}" = "--seed" ] && CMD="$CMD && npx prisma db seed"
docker run --rm --network host --user "$(id -u):$(id -g)" \
  -e HOME=/tmp -e npm_config_cache=/tmp/.npm \
  -e DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@127.0.0.1:5432/$POSTGRES_DB" \
  -e ADMIN_NOME -e ADMIN_EMAIL -e ADMIN_CPF -e ADMIN_SENHA_INICIAL \
  -e SEED_DADOS_EXEMPLO="${SEED_DADOS_EXEMPLO:-true}" \
  -v /opt/hemobridge/repo/backend:/app -w /app node:24-bookworm-slim bash -c "$CMD"
