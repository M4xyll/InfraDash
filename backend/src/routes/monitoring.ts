import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../types/index.js';
import {
  getMonitoringStatuses,
  getServerMonitoring,
  ingestMonitoringSnapshot,
  issueMonitoringToken,
  type MonitoringSnapshot,
} from '../services/monitoring.service.js';
import { logAuditFromRequest } from '../services/audit.service.js';

const router = Router();

router.get('/statuses', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const statuses = await getMonitoringStatuses();
    res.json({ success: true, data: statuses });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch monitoring statuses' });
  }
});

router.get('/servers/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true },
    });

    if (!server) {
      res.status(404).json({ success: false, error: 'Server not found' });
      return;
    }

    const monitoring = await getServerMonitoring(server.id);
    res.json({
      success: true,
      data: {
        server,
        ...monitoring,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch server monitoring' });
  }
});

router.post('/servers/:id/token', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true },
    });

    if (!server) {
      res.status(404).json({ success: false, error: 'Server not found' });
      return;
    }

    const token = await issueMonitoringToken(server.id);

    await logAuditFromRequest(req, {
      action: 'create',
      entityType: 'monitoring-token',
      entityId: server.id,
      summary: `Issued monitoring token for server ${server.name}`,
    });

    res.json({
      success: true,
      data: {
        server,
        token: token.token,
        issuedAt: token.rotatedAt,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to issue monitoring token' });
  }
});

router.post(
  '/ingest',
  [
    body('timestamp').isISO8601(),
    body('cpu.usagePercent').isFloat({ min: 0, max: 100 }),
    body('memory.usedBytes').isInt({ min: 0 }),
    body('memory.totalBytes').isInt({ min: 1 }),
    body('memory.usagePercent').isFloat({ min: 0, max: 100 }),
    body('storage.usedBytes').isInt({ min: 0 }),
    body('storage.totalBytes').isInt({ min: 1 }),
    body('storage.usagePercent').isFloat({ min: 0, max: 100 }),
    body('uptimeSeconds').isInt({ min: 0 }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const token = req.get('x-monitoring-token') || req.body.token;
      if (!token || typeof token !== 'string') {
        res.status(401).json({ success: false, error: 'Monitoring token required' });
        return;
      }

      const snapshot = req.body as MonitoringSnapshot & { token?: string };
      const result = await ingestMonitoringSnapshot(token, {
        timestamp: snapshot.timestamp,
        hostname: snapshot.hostname,
        agentVersion: snapshot.agentVersion,
        cpu: snapshot.cpu,
        memory: snapshot.memory,
        storage: snapshot.storage,
        temperature: snapshot.temperature || {},
        uptimeSeconds: snapshot.uptimeSeconds,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to ingest monitoring payload';
      const status = message === 'Invalid monitoring token' ? 401 : 500;
      res.status(status).json({ success: false, error: message });
    }
  },
);

export default router;
