# InfraDash Monitoring Agent

Minimal push agent for live host metrics.

## What it sends

- CPU usage
- RAM usage
- Total usage across local disks/filesystems
- Temperature when available
- Uptime

## Requirements

- Node.js 18+
- Optional: `lm-sensors` for better temperature reporting

## Run

Create a local `.env` file in `monitoring-agent/`:

```bash
MONITOR_API_URL=http://YOUR_DASHBOARD_HOST:3001/api/monitoring/ingest
MONITOR_TOKEN=paste-issued-token-here
MONITOR_INTERVAL_MS=15000
```

Then start the agent:

```bash
npm run start
```

## Recommended deployment

Run the agent directly on the host.

That matters for storage reporting:
- on the host: the agent can see the machine's real disks and filesystems
- in Docker: the agent usually only sees the container filesystem

## systemd

Example install on a Linux host:

```bash
sudo mkdir -p /opt/infradash-monitoring-agent
sudo cp agent.mjs package.json package-lock.json .env /opt/infradash-monitoring-agent/
cd /opt/infradash-monitoring-agent
npm install --omit=dev
```

Create `/etc/systemd/system/infradash-monitoring-agent.service`:

```ini
[Unit]
Description=InfraDash Monitoring Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/infradash-monitoring-agent
ExecStart=/usr/bin/node /opt/infradash-monitoring-agent/agent.mjs
Restart=always
RestartSec=5
User=root
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now infradash-monitoring-agent
sudo systemctl status infradash-monitoring-agent
```

To update it later:

```bash
sudo cp agent.mjs package.json package-lock.json .env /opt/infradash-monitoring-agent/
cd /opt/infradash-monitoring-agent
npm install --omit=dev
sudo systemctl restart infradash-monitoring-agent
```

## Docker

Docker is still available, but it is better suited for testing than for full host storage visibility.

Build and run the standalone agent with Docker Compose:

```bash
docker compose up -d --build
```

Stop it again with:

```bash
docker compose down
```

The compose file reads the same local `.env` file from `monitoring-agent/.env`.

You can still override values directly in the shell if needed:

```bash
MONITOR_API_URL="http://YOUR_DASHBOARD_HOST:3001/api/monitoring/ingest" \
MONITOR_TOKEN="paste-issued-token-here" \
node monitoring-agent/agent.mjs
```

Optional interval override:

```bash
MONITOR_INTERVAL_MS=10000
```

The host-based `systemd` setup above is the recommended way to run the agent in production.
