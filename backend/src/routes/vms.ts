import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { AuthRequest } from '../types/index.js';
import { prisma } from '../lib/prisma.js';
import { logAuditFromRequest } from '../services/audit.service.js';

const router = Router();

// Get all VMs
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { serverId } = req.query;
    const where = serverId ? { serverId: serverId as string } : {};

    const vms = await prisma.vM.findMany({
      where,
      include: {
        server: { select: { id: true, name: true } },
        _count: { select: { disks: true, ips: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: vms });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch VMs' });
  }
});

// Get single VM
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const vm = await prisma.vM.findUnique({
      where: { id: req.params.id },
      include: {
        server: { select: { id: true, name: true } },
        disks: true,
        ips: true,
        networkConnections: true,
      },
    });

    if (!vm) {
      res.status(404).json({ success: false, error: 'VM not found' });
      return;
    }

    res.json({ success: true, data: vm });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch VM' });
  }
});

// Create VM
router.post(
  '/',
  authenticate,
  requirePermission('create'),
  [
    body('name').trim().isLength({ min: 1 }),
    body('serverId').isUUID(),
    body('comment').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const { name, serverId, comment } = req.body;
      const vm = await prisma.vM.create({
        data: { name, serverId, comment },
        include: { server: { select: { id: true, name: true } } },
      });
      await logAuditFromRequest(req, {
        action: 'create',
        entityType: 'vm',
        entityId: vm.id,
        summary: `Created VM ${vm.name}`,
        details: { server: vm.server?.name },
      });
      res.status(201).json({ success: true, data: vm });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to create VM' });
    }
  }
);

// Update VM
router.put(
  '/:id',
  authenticate,
  requirePermission('update'),
  [
    body('name').optional().trim().isLength({ min: 1 }),
    body('serverId').optional().isUUID(),
    body('comment').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const { name, serverId, comment } = req.body;
      const vm = await prisma.vM.update({
        where: { id: req.params.id },
        data: { name, serverId, comment },
        include: { server: { select: { id: true, name: true } } },
      });
      await logAuditFromRequest(req, {
        action: 'update',
        entityType: 'vm',
        entityId: vm.id,
        summary: `Updated VM ${vm.name}`,
        details: { server: vm.server?.name },
      });
      res.json({ success: true, data: vm });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to update VM' });
    }
  }
);

// Delete VM
router.delete(
  '/:id',
  authenticate,
  requirePermission('delete'),
  async (req: AuthRequest, res: Response) => {
    try {
      const vm = await prisma.vM.delete({ where: { id: req.params.id } });
      await logAuditFromRequest(req, {
        action: 'delete',
        entityType: 'vm',
        entityId: vm.id,
        summary: `Deleted VM ${vm.name}`,
      });
      res.json({ success: true, message: 'VM deleted' });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to delete VM' });
    }
  }
);

export default router;
