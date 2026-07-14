# InfraDash Monitoring Agent

Minimal push agent for live host metrics.

## What it sends

- CPU usage
- RAM usage
- Root filesystem usage
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

## Docker

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

## Service example

```ini
[Unit]
Description=InfraDash Monitoring Agent
After=network.target

[Service]
Environment="MONITOR_API_URL=http://YOUR_DASHBOARD_HOST:3001/api/monitoring/ingest"
Environment="MONITOR_TOKEN=paste-issued-token-here"
ExecStart=/usr/bin/node /opt/infradash/monitoring-agent/agent.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
