import { mkdir, appendFile, readFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { AuthRequest } from '../types/index.js';

export type AuditLogEntry = {
  id: string;
  timestamp: string;
  actor: {
    userId?: string;
    email?: string;
    role?: string;
  };
  request: {
    ip?: string;
    userAgent?: string;
  };
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  details?: Record<string, unknown>;
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'audit-log.jsonl');

async function ensureAuditDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  await ensureAuditDir();

  const record: AuditLogEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  };

  await appendFile(AUDIT_LOG_FILE, `${JSON.stringify(record)}\n`, 'utf8');
}

export async function logAuditFromRequest(
  req: AuthRequest,
  payload: {
    action: string;
    entityType: string;
    entityId?: string;
    summary: string;
    details?: Record<string, unknown>;
    actorOverride?: {
      userId?: string;
      email?: string;
      role?: string;
    };
  }
) {
  await logAudit({
    actor: payload.actorOverride || {
      userId: req.user?.userId,
      email: req.user?.email,
      role: req.user?.role,
    },
    request: {
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined,
    },
    action: payload.action,
    entityType: payload.entityType,
    entityId: payload.entityId,
    summary: payload.summary,
    details: payload.details,
  });
}

export async function readAuditLogs(limit = 250) {
  try {
    const content = await readFile(AUDIT_LOG_FILE, 'utf8');
    return content
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditLogEntry)
      .reverse()
      .slice(0, limit);
  } catch {
    return [];
  }
}
