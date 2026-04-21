# Production-like deploy (Linux)

Serve the Vite build as static files and proxy `/api` to the Express app (same origin as the SPA). Optional: TLS via Let’s Encrypt, systemd for the API, cron for SQLite backups.

## 1. Prerequisites

- **Node.js** LTS (20 or 22): install via [NodeSource](https://github.com/nodesource/distributions), [nvm](https://github.com/nvm-sh/nvm), or your distro’s packages.
- **Build tools** (for `better-sqlite3`): e.g. on Debian/Ubuntu: `sudo apt install -y build-essential python3`
- **nginx** (or Caddy): `sudo apt install -y nginx`
- **git** and a deploy path, e.g. `sudo mkdir -p /opt/slowtube && sudo chown $USER:$USER /opt/slowtube`

Clone and install dependencies:

```bash
cd /opt/slowtube
git clone <your-fork-or-remote> .
cd backend && npm ci
cd ../frontend && npm ci
```

From the repo root you can also run `npm run build` (builds backend then frontend).

## 2. Environment (`backend/.env`)

Copy [`backend/.env.example`](../backend/.env.example) to `backend/.env` and set secrets. For nginx on the same host:

- `HOST_BIND=127.0.0.1` — API only listens on loopback; nginx talks to `127.0.0.1:6001`.
- `FRONTEND_URL` — exact public URL users use (e.g. `https://slowtube.example.com` or `http://192.168.1.10`).
- `GOOGLE_REDIRECT_URI` — must be `{origin}/api/auth/youtube/callback` (same origin as the API if you proxy only `/api` to Node).

## 3. Google Cloud Console (OAuth)

1. Open [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. OAuth 2.0 Client → **Authorized redirect URIs**: add your production URI, e.g. `https://slowtube.example.com/api/auth/youtube/callback`.
3. If you use a **Web application** client, add **Authorized JavaScript origins** for the same scheme/host/port as `FRONTEND_URL` (e.g. `https://slowtube.example.com`).

## 4. Build

```bash
cd /opt/slowtube
npm run build
```

Artifacts: `backend/dist/`, `frontend/dist/`.

## 5. systemd

1. Create a dedicated user (optional but recommended):

   ```bash
   sudo useradd --system --home /opt/slowtube --shell /usr/sbin/nologin slowtube
   sudo chown -R slowtube:slowtube /opt/slowtube
   ```

2. Edit [`slowtube.service`](slowtube.service): set `User`, `WorkingDirectory`, `EnvironmentFile`, and `ExecStart` (`which node` → full path to `node`).

3. Install and enable:

   ```bash
   sudo cp deploy/slowtube.service /etc/systemd/system/slowtube.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now slowtube
   sudo journalctl -u slowtube -f
   ```

## 6. nginx

1. Adjust [`nginx-slowtube.conf`](nginx-slowtube.conf): `server_name`, `root` (path to `frontend/dist`), upstream port if not `6001`.
2. Install:

   ```bash
   sudo cp deploy/nginx-slowtube.conf /etc/nginx/sites-available/slowtube
   sudo ln -sf /etc/nginx/sites-available/slowtube /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. TLS: `sudo certbot --nginx -d slowtube.example.com` (after DNS points to this host).

## 7. Firewall

Expose only HTTP/HTTPS to clients; do not expose the Node port if `HOST_BIND=127.0.0.1`:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 8. Backups

Use [`backup-sqlite.sh`](backup-sqlite.sh) from cron:

```bash
chmod +x deploy/backup-sqlite.sh
DATABASE_PATH=/opt/slowtube/backend/database/watch-later.db \
BACKUP_DIR=/var/backups/slowtube \
./deploy/backup-sqlite.sh
```

Example cron (daily 3:15 UTC) as user `slowtube`:

```
15 3 * * * DATABASE_PATH=/opt/slowtube/backend/database/watch-later.db BACKUP_DIR=/var/backups/slowtube /opt/slowtube/deploy/backup-sqlite.sh
```

## Health check

- Backend: `GET /health` (e.g. `curl -s http://127.0.0.1:6001/health` or through nginx if you expose it).

## Troubleshooting builds

From the repo root, `npm run build` runs `tsc` in `backend` and `frontend`. If either package fails typecheck, fix the reported errors or use the same local workflow you already use to produce `backend/dist` and `frontend/dist` before restarting systemd and nginx.
