#!/usr/bin/env bash
# Provisiona a VM de dados do Hemobridge (Ubuntu 26.04 LTS na EC2).
# Idempotente: pode ser executado de novo sem perder dados.
#
# Uso, a partir do computador com acesso SSH à VM:
#   scp -r infra/vm hemobridge:/tmp/hemobridge-vm
#   ssh hemobridge 'sudo bash /tmp/hemobridge-vm/provisionar.sh'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
ORIGEM="$(cd "$(dirname "$0")" && pwd)"
BASE=/opt/hemobridge
USUARIO=ubuntu

# --- Sistema -----------------------------------------------------------------
timedatectl set-timezone America/Sao_Paulo
hostnamectl set-hostname hemobridge-db
apt-get update -qq
apt-get -y -qq -o Dpkg::Options::=--force-confold upgrade
apt-get -y -qq install ca-certificates curl gnupg ufw fail2ban unattended-upgrades git jq postgresql-client

if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf && sysctl -p /etc/sysctl.d/99-swap.conf >/dev/null
fi

# --- Docker ------------------------------------------------------------------
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get -y -qq install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
usermod -aG docker "$USUARIO"
cat > /etc/docker/daemon.json <<'J'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
J
systemctl restart docker

# --- Acesso: só chave SSH, firewall e fail2ban -------------------------------
cat > /etc/ssh/sshd_config.d/99-hemobridge.conf <<'S'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
S
sshd -t
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow OpenSSH >/dev/null
ufw --force enable
cat > /etc/fail2ban/jail.d/sshd.local <<'F'
[sshd]
enabled = true
backend = systemd
maxretry = 5
bantime = 1h
F
systemctl enable fail2ban >/dev/null 2>&1
systemctl restart fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades

# --- Serviços de dados -------------------------------------------------------
install -d -o "$USUARIO" -g "$USUARIO" "$BASE" "$BASE/infra" "$BASE/infra/postgres-init" "$BASE/infra/seaweedfs"
[ -d "$BASE/repo" ] || sudo -u "$USUARIO" git clone -q https://github.com/Jhonatan-Andrade/Hemobridge.git "$BASE/repo"
install -o "$USUARIO" -g "$USUARIO" -m 640 "$ORIGEM/docker-compose.yml" "$BASE/infra/"
install -o "$USUARIO" -g "$USUARIO" -m 750 "$ORIGEM/backup.sh" "$ORIGEM/migrar.sh" "$BASE/infra/"
install -o "$USUARIO" -g "$USUARIO" -m 644 \
  "$BASE/repo/backend/docker/postgres-init/20-remove-extensoes-extras.sql" "$BASE/infra/postgres-init/"

gerar() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "$1"; }
cd "$BASE/infra"
if [ ! -f .env ]; then
  cat > .env <<E
POSTGRES_USER=hemobridge
POSTGRES_PASSWORD=$(gerar 32)
POSTGRES_DB=hemobridge
S3_ACCESS_KEY=hb$(gerar 18)
S3_SECRET_KEY=$(gerar 40)
S3_BUCKET=hemobridge-exames
E
fi
if [ ! -f admin-inicial.env ]; then
  printf 'ADMIN_NOME="Administrador Hemobridge"\nADMIN_EMAIL=admin@hemobridge.local\nADMIN_CPF=52998224725\nADMIN_SENHA_INICIAL=Hb%s7a\n' \
    "$(gerar 14)" > admin-inicial.env
fi
set -a; . ./.env; set +a
cat > seaweedfs/s3.json <<J
{"identities":[{"name":"hemobridge-api","credentials":[{"accessKey":"$S3_ACCESS_KEY","secretKey":"$S3_SECRET_KEY"}],"actions":["Admin","Read","Write","List","Tagging"]}]}
J
chown -R "$USUARIO:$USUARIO" "$BASE/infra"
chmod 600 .env admin-inicial.env seaweedfs/s3.json
sudo -u "$USUARIO" docker compose up -d

# --- Backup diário (executa o atrasado ao ligar a VM) ------------------------
install -d -o "$USUARIO" -g "$USUARIO" -m 750 /var/backups/hemobridge
install -m 644 "$ORIGEM/hemobridge-backup.service" "$ORIGEM/hemobridge-backup.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now hemobridge-backup.timer

echo "Pronto. Aplique as migrations com: $BASE/infra/migrar.sh --seed"
