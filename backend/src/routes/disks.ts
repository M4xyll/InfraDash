import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { AuthRequest } from '../types/index.js';
import { prisma } from '../lib/prisma.js';
import { logAuditFromRequest } from '../services/audit.service.js';

const router = Router();

// Get all disks
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { vmId } = req.query;
    const where = vmId ? { vmId: vmId as string } : {};

    const disks = await prisma.disk.findMany({
      where,
      include: {
        vm: {
          select: {
            id: true,
            name: true,
            server: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: disks });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch disks' });
  }
});

// Get single disk
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const disk = await prisma.disk.findUnique({
      where: { id: req.params.id },
      include: {
        vm: {
          select: {
            id: true,
            name: true,
            server: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!disk) {
      res.status(404).json({ success: false, error: 'Disk not found' });
      return;
    }

    res.json({ success: true, data: disk });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch disk' });
  }
});

// Create disk
router.post(
  '/',
  authenticate,
  requirePermission('create'),
  [
    body('vmId').isUUID(),
    body('name').optional().trim(),
    body('size').isInt({ min: 1 }),
    body('type').isIn(['HDD', 'SSD', 'NVME']),
    body('comment').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const { vmId, name, size, type, comment } = req.body;
      const disk = await prisma.disk.create({
        data: { vmId, name, size, type, comment },
        include: { vm: { select: { id: true, name: true } } },
      });
      await logAuditFromRequest(req, {
        action: 'create',
        entityType: 'disk',
        entityId: disk.id,
        summary: `Created disk ${disk.name || disk.type}`,
        details: { vm: disk.vm?.name, size: disk.size, type: disk.type },
      });
      res.status(201).json({ success: true, data: disk });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to create disk' });
    }
  }
);

// Update disk
router.put(
  '/:id',
  authenticate,
  requirePermission('update'),
  [
    body('vmId').optional().isUUID(),
    body('name').optional().trim(),
    body('size').optional().isInt({ min: 1 }),
    body('type').optional().isIn(['HDD', 'SSD', 'NVME']),
    body('comment').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const { vmId, name, size, type, comment } = req.body;
      const disk = await prisma.disk.update({
        where: { id: req.params.id },
        data: { vmId, name, size, type, comment },
        include: { vm: { select: { id: true, name: true } } },
      });
      await logAuditFromRequest(req, {
        action: 'update',
        entityType: 'disk',
        entityId: disk.id,
        summary: `Updated disk ${disk.name || disk.type}`,
        details: { vm: disk.vm?.name, size: disk.size, type: disk.type },
      });
      res.json({ success: true, data: disk });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to update disk' });
    }
  }
);

// Delete disk
router.delete(
  '/:id',
  authenticate,
  requirePermission('delete'),
  async (req: AuthRequest, res: Response) => {
    try {
      const disk = await prisma.disk.delete({ where: { id: req.params.id } });
      await logAuditFromRequest(req, {
        action: 'delete',
        entityType: 'disk',
        entityId: disk.id,
        summary: `Deleted disk ${disk.name || disk.type}`,
        details: { size: disk.size, type: disk.type },
      });
      res.json({ success: true, message: 'Disk deleted' });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to delete disk' });
    }
  }
);

export default router;
