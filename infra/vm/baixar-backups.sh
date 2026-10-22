#!/usr/bin/env bash
# Copia os backups da VM para este computador (cópia fora da AWS).
# O Learner Lab apaga a conta ao fim da disciplina: rode isto periodicamente.
# Uso: infra/vm/baixar-backups.sh [pasta-destino]   (padrão: ~/hemobridge-backups)
set -euo pipefail
DESTINO="${1:-$HOME/hemobridge-backups}"
HOST="${HEMOBRIDGE_SSH:-hemobridge}"
mkdir -p "$DESTINO"
chmod 700 "$DESTINO" 2>/dev/null || true
# Só baixa os arquivos que ainda não existem localmente.
for arquivo in $(ssh "$HOST" 'ls -1 /var/backups/hemobridge'); do
  [ -f "$DESTINO/$arquivo" ] || scp -q "$HOST:/var/backups/hemobridge/$arquivo" "$DESTINO/"
done
ls -1t "$DESTINO" | head -6
