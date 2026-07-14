#!/usr/bin/env node

import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const VERSION = '1.0.0';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');

  try {
    const raw = await readFile(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex <= 0) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (!key || process.env[key] !== undefined) continue;

      const unquoted =
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
          ? value.slice(1, -1)
          : value;

      process.env[key] = unquoted;
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return;
    }

    throw error;
  }
}

await loadEnvFile();

const API_URL = process.env.MONITOR_API_URL;
const TOKEN = process.env.MONITOR_TOKEN;
const INTERVAL_MS = Number(process.env.MONITOR_INTERVAL_MS || 15000);

if (!API_URL || !TOKEN) {
  console.error('Missing MONITOR_API_URL or MONITOR_TOKEN');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cpuSnapshot() {
  const cpus = os.cpus();
  const totals = cpus.map((cpu) => {
    const times = cpu.times;
    const total = times.user + times.nice + times.sys + times.idle + times.irq;
    return { idle: times.idle, total };
  });

  return totals.reduce(
    (acc, item) => ({
      idle: acc.idle + item.idle,
      total: acc.total + item.total,
    }),
    { idle: 0, total: 0 },
  );
}

async function readCpuUsage() {
  const first = cpuSnapshot();
  await sleep(250);
  const second = cpuSnapshot();
  const idle = second.idle - first.idle;
  const total = second.total - first.total;
  const usagePercent = total > 0 ? ((total - idle) / total) * 100 : 0;

  return {
    usagePercent: Number(usagePercent.toFixed(2)),
    loadAverage: os.loadavg().map((value) => Number(value.toFixed(2))),
  };
}

function readMemoryUsage() {
  const totalBytes = os.totalmem();
  const usedBytes = totalBytes - os.freemem();
  return {
    usedBytes,
    totalBytes,
    usagePercent: Number(((usedBytes / totalBytes) * 100).toFixed(2)),
  };
}

async function readStorageUsage() {
  try {
    const { stdout } = await execFileAsync('df', ['-k', '/']);
    const lines = stdout.trim().split('\n');
    const fields = lines[lines.length - 1].trim().split(/\s+/);
    const totalBytes = Number(fields[1]) * 1024;
    const usedBytes = Number(fields[2]) * 1024;
    return {
      usedBytes,
      totalBytes,
      usagePercent: totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(2)) : 0,
    };
  } catch {
    return {
      usedBytes: 0,
      totalBytes: 1,
      usagePercent: 0,
    };
  }
}

async function readTemperature() {
  try {
    const { stdout } = await execFileAsync('sensors', []);
    const match = stdout.match(/\+([0-9]+(?:\.[0-9]+)?)°C/);
    if (match) return { celsius: Number(match[1]) };
  } catch {
    // ignore and try thermal_zone fallback
  }

  try {
    const raw = await readFile('/sys/class/thermal/thermal_zone0/temp', 'utf8');
    const celsius = Number(raw.trim()) / 1000;
    if (Number.isFinite(celsius)) return { celsius: Number(celsius.toFixed(1)) };
  } catch {
    // ignore
  }

  return { celsius: null };
}

async function buildPayload() {
  const [cpu, storage, temperature] = await Promise.all([
    readCpuUsage(),
    readStorageUsage(),
    readTemperature(),
  ]);

  return {
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    agentVersion: VERSION,
    cpu,
    memory: readMemoryUsage(),
    storage,
    temperature,
    uptimeSeconds: Math.floor(os.uptime()),
  };
}

async function sendPayload() {
  const payload = await buildPayload();
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-monitoring-token': TOKEN,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Monitoring push failed: ${response.status} ${text}`);
  }
}

async function main() {
  while (true) {
    try {
      await sendPayload();
    } catch (error) {
      console.error(`[monitor-agent] ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    await sleep(INTERVAL_MS);
  }
}

main();
