#!/usr/bin/env bash
# Build locally, ship the two build folders, restart. The server bundle has no node_modules: esbuild inlines them.
set -euo pipefail
HOST=${HOST:-root@77.42.12.77}
KEY=${KEY:-~/.ssh/id_ed25519_larpmotion}
cd "$(dirname "$0")/.."
npm run build >/dev/null
ssh -i $KEY "$HOST" "mkdir -p /opt/parley/app/server/practice"
# No --delete on dist: an open tab still asks for the previous build's page chunks (hashed names, so nothing clashes).
rsync -az -e "ssh -i $KEY" dist package.json "$HOST:/opt/parley/app/"
rsync -az --delete -e "ssh -i $KEY" dist-server "$HOST:/opt/parley/app/"
rsync -az -e "ssh -i $KEY" server/practice/ "$HOST:/opt/parley/app/server/practice/"
ssh -i $KEY "$HOST" 'chown -R parley:parley /opt/parley/app && systemctl enable --now parley >/dev/null 2>&1; systemctl restart parley && sleep 1.5 && systemctl is-active parley && curl -sf localhost:8787/api/health'
echo " deployed $(git rev-parse --short HEAD)"
