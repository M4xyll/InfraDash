import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { AuthRequest } from '../types/index.js';
import { prisma } from '../lib/prisma.js';
import { logAuditFromRequest } from '../services/audit.service.js';

const router = Router();

// Get all servers
router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const servers = await prisma.server.findMany({
      include: {
        _count: {
          select: { vms: true, ips: true, networkConnections: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: servers });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch servers' });
  }
});

// Get single server with all related data
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: req.params.id },
      include: {
        vms: {
          include: {
            disks: true,
            ips: true,
          },
        },
        ips: true,
        networkConnections: true,
      },
    });

    if (!server) {
      res.status(404).json({ success: false, error: 'Server not found' });
      return;
    }

    res.json({ success: true, data: server });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch server' });
  }
});

// Create server
router.post(
  '/',
  authenticate,
  requirePermission('create'),
  [
    body('name').trim().isLength({ min: 1 }),
    body('location').optional().trim(),
    body('comment').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const { name, location, comment } = req.body;
      const server = await prisma.server.create({
        data: { name, location, comment },
      });
      await logAuditFromRequest(req, {
        action: 'create',
        entityType: 'server',
        entityId: server.id,
        summary: `Created server ${server.name}`,
        details: { location: server.location },
      });
      res.status(201).json({ success: true, data: server });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to create server' });
    }
  }
);

// Update server
router.put(
  '/:id',
  authenticate,
  requirePermission('update'),
  [
    body('name').optional().trim().isLength({ min: 1 }),
    body('location').optional().trim(),
    body('comment').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const { name, location, comment } = req.body;
      const server = await prisma.server.update({
        where: { id: req.params.id },
        data: { name, location, comment },
      });
      await logAuditFromRequest(req, {
        action: 'update',
        entityType: 'server',
        entityId: server.id,
        summary: `Updated server ${server.name}`,
        details: { location: server.location },
      });
      res.json({ success: true, data: server });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to update server' });
    }
  }
);

// Delete server
router.delete(
  '/:id',
  authenticate,
  requirePermission('delete'),
  async (req: AuthRequest, res: Response) => {
    try {
      const server = await prisma.server.delete({ where: { id: req.params.id } });
      await logAuditFromRequest(req, {
        action: 'delete',
        entityType: 'server',
        entityId: server.id,
        summary: `Deleted server ${server.name}`,
      });
      res.json({ success: true, message: 'Server deleted' });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to delete server' });
    }
  }
);

export default router;
