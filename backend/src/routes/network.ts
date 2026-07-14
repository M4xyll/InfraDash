import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { AuthRequest } from '../types/index.js';
import { prisma } from '../lib/prisma.js';
import { logAuditFromRequest } from '../services/audit.service.js';

const router = Router();

// Get all network connections
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { serverId, vmId } = req.query;
    const where: Record<string, unknown> = {};

    if (serverId) where.serverId = serverId;
    if (vmId) where.vmId = vmId;

    const connections = await prisma.networkConnection.findMany({
      where,
      include: {
        server: { select: { id: true, name: true } },
        vm: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: connections });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch network connections' });
  }
});

// Get single connection
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const connection = await prisma.networkConnection.findUnique({
      where: { id: req.params.id },
      include: {
        server: { select: { id: true, name: true } },
        vm: { select: { id: true, name: true } },
      },
    });

    if (!connection) {
      res.status(404).json({ success: false, error: 'Network connection not found' });
      return;
    }

    res.json({ success: true, data: connection });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch network connection' });
  }
});

// Create connection
router.post(
  '/',
  authenticate,
  requirePermission('create'),
  [
    body('name').optional().trim(),
    body('bandwidth').isInt({ min: 1 }),
    body('color').optional().trim(),
    body('serverId').optional().isUUID(),
    body('vmId').optional().isUUID(),
    body('comment').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const { name, bandwidth, color, serverId, vmId, comment } = req.body;
      const connection = await prisma.networkConnection.create({
        data: { name, bandwidth, color, serverId, vmId, comment },
        include: {
          server: { select: { id: true, name: true } },
          vm: { select: { id: true, name: true } },
        },
      });
      await logAuditFromRequest(req, {
        action: 'create',
        entityType: 'network-connection',
        entityId: connection.id,
        summary: `Created network connection ${connection.name || connection.id}`,
        details: { bandwidth: connection.bandwidth, server: connection.server?.name, vm: connection.vm?.name },
      });
      res.status(201).json({ success: true, data: connection });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to create network connection' });
    }
  }
);

// Update connection
router.put(
  '/:id',
  authenticate,
  requirePermission('update'),
  [
    body('name').optional().trim(),
    body('bandwidth').optional().isInt({ min: 1 }),
    body('color').optional().trim(),
    body('serverId').optional({ values: 'null' }).isUUID(),
    body('vmId').optional({ values: 'null' }).isUUID(),
    body('comment').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const { name, bandwidth, color, serverId, vmId, comment } = req.body;
      const connection = await prisma.networkConnection.update({
        where: { id: req.params.id },
        data: { name, bandwidth, color, serverId, vmId, comment },
        include: {
          server: { select: { id: true, name: true } },
          vm: { select: { id: true, name: true } },
        },
      });
      await logAuditFromRequest(req, {
        action: 'update',
        entityType: 'network-connection',
        entityId: connection.id,
        summary: `Updated network connection ${connection.name || connection.id}`,
        details: { bandwidth: connection.bandwidth, server: connection.server?.name, vm: connection.vm?.name },
      });
      res.json({ success: true, data: connection });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to update network connection' });
    }
  }
);

// Delete connection
router.delete(
  '/:id',
  authenticate,
  requirePermission('delete'),
  async (req: AuthRequest, res: Response) => {
    try {
      const connection = await prisma.networkConnection.delete({ where: { id: req.params.id } });
      await logAuditFromRequest(req, {
        action: 'delete',
        entityType: 'network-connection',
        entityId: connection.id,
        summary: `Deleted network connection ${connection.name || connection.id}`,
        details: { bandwidth: connection.bandwidth },
      });
      res.json({ success: true, message: 'Network connection deleted' });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to delete network connection' });
    }
  }
);

export default router;
