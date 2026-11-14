#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu box for Parley: Node 22, Caddy (auto HTTPS), firewall, app user, systemd unit.
# Usage: ssh root@HOST 'bash -s' < deploy/provision.sh
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg ufw debian-keyring debian-archive-keyring apt-transport-https >/dev/null
# Node 22 (node:sqlite needs 22.5+)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
apt-get install -y -qq nodejs >/dev/null
# Caddy
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg --yes
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update -qq && apt-get install -y -qq caddy >/dev/null
# Firewall: ssh + web only
ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw --force enable >/dev/null
# App user and folders
id parley >/dev/null 2>&1 || useradd --system --create-home --home-dir /opt/parley --shell /usr/sbin/nologin parley
mkdir -p /opt/parley/app /opt/parley/data && chown -R parley:parley /opt/parley
cat > /etc/systemd/system/parley.service <<'UNIT'
[Unit]
Description=Parley
After=network.target

[Service]
User=parley
WorkingDirectory=/opt/parley/app
EnvironmentFile=/opt/parley/.env
Environment=NODE_ENV=production
Environment=DATA_DIR=/opt/parley/data
ExecStart=/usr/bin/node --disable-warning=ExperimentalWarning dist-server/index.js
Restart=always
RestartSec=2
MemoryMax=700M

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
node -v; caddy version | head -1
