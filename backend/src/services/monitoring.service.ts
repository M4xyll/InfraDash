import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

export type MonitoringSnapshot = {
  timestamp: string;
  hostname?: string;
  agentVersion?: string;
  cpu: {
    usagePercent: number;
    loadAverage?: number[];
  };
  memory: {
    usedBytes: number;
    totalBytes: number;
    usagePercent: number;
  };
  storage: {
    usedBytes: number;
    totalBytes: number;
    usagePercent: number;
  };
  temperature: {
    celsius?: number | null;
  };
  uptimeSeconds: number;
};

type MonitoringRegistryRecord = {
  serverId: string;
  token: string;
  createdAt: string;
  rotatedAt: string;
};

type MonitoringRegistry = Record<string, MonitoringRegistryRecord>;

type MonitoringSnapshotState = Record<
  string,
  {
    latest: MonitoringSnapshot;
    history: MonitoringSnapshot[];
    lastSeenAt: string;
  }
>;

const DATA_DIR = path.resolve(process.cwd(), 'data');
const REGISTRY_FILE = path.join(DATA_DIR, 'monitoring-registry.json');
const SNAPSHOT_FILE = path.join(DATA_DIR, 'monitoring-snapshots.json');
const HISTORY_LIMIT = 60;

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await ensureDataDir();
  await writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function readRegistry() {
  return readJsonFile<MonitoringRegistry>(REGISTRY_FILE, {});
}

async function writeRegistry(registry: MonitoringRegistry) {
  await writeJsonFile(REGISTRY_FILE, registry);
}

async function readSnapshots() {
  return readJsonFile<MonitoringSnapshotState>(SNAPSHOT_FILE, {});
}

async function writeSnapshots(state: MonitoringSnapshotState) {
  await writeJsonFile(SNAPSHOT_FILE, state);
}

export function createMonitoringToken() {
  return randomBytes(24).toString('hex');
}

export function isMonitoringOnline(lastSeenAt?: string) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 45_000;
}

export async function issueMonitoringToken(serverId: string) {
  const registry = await readRegistry();
  const now = new Date().toISOString();
  const token = createMonitoringToken();

  registry[serverId] = {
    serverId,
    token,
    createdAt: registry[serverId]?.createdAt || now,
    rotatedAt: now,
  };

  await writeRegistry(registry);

  return {
    serverId,
    token,
    createdAt: registry[serverId].createdAt,
    rotatedAt: registry[serverId].rotatedAt,
  };
}

export async function getMonitoringStatuses() {
  const registry = await readRegistry();
  const snapshots = await readSnapshots();

  return Object.keys(registry).map((serverId) => {
    const state = snapshots[serverId];
    return {
      serverId,
      configured: true,
      online: isMonitoringOnline(state?.lastSeenAt),
      lastSeenAt: state?.lastSeenAt,
      latest: state?.latest,
    };
  });
}

export async function getServerMonitoring(serverId: string) {
  const registry = await readRegistry();
  const snapshots = await readSnapshots();
  const state = snapshots[serverId];
  const registryEntry = registry[serverId];

  return {
    configured: Boolean(registryEntry),
    online: isMonitoringOnline(state?.lastSeenAt),
    lastSeenAt: state?.lastSeenAt,
    latest: state?.latest,
    history: state?.history || [],
  };
}

export async function ingestMonitoringSnapshot(token: string, snapshot: MonitoringSnapshot) {
  const registry = await readRegistry();
  const serverId = Object.keys(registry).find((key) => registry[key].token === token);

  if (!serverId) {
    throw new Error('Invalid monitoring token');
  }

  const snapshots = await readSnapshots();
  const previous = snapshots[serverId];
  const history = [...(previous?.history || []), snapshot].slice(-HISTORY_LIMIT);

  snapshots[serverId] = {
    latest: snapshot,
    history,
    lastSeenAt: new Date().toISOString(),
  };

  await writeSnapshots(snapshots);

  return { serverId };
}
