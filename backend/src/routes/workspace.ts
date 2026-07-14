import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { prisma } from '../lib/prisma.js';
import { logAuditFromRequest } from '../services/audit.service.js';

const router = Router();

// Get workspace layout for current user
router.get('/layout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const layouts = await prisma.workspaceLayout.findMany({
      where: { userId },
      select: {
        nodeId: true,
        x: true,
        y: true,
      },
    });

    res.json({
      success: true,
      data: layouts,
    });
  } catch (error) {
    console.error('Error fetching workspace layout:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch workspace layout' });
  }
});

// Save workspace layout for current user
router.post('/layout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { positions } = req.body as { positions: Array<{ nodeId: string; x: number; y: number }> };

    if (!positions || !Array.isArray(positions)) {
      res.status(400).json({ success: false, error: 'Positions array required' });
      return;
    }

    // Upsert all positions in a transaction
    await prisma.$transaction(
      positions.map((pos) =>
        prisma.workspaceLayout.upsert({
          where: {
            userId_nodeId: {
              userId,
              nodeId: pos.nodeId,
            },
          },
          create: {
            userId,
            nodeId: pos.nodeId,
            x: pos.x,
            y: pos.y,
          },
          update: {
            x: pos.x,
            y: pos.y,
          },
        })
      )
    );

    await logAuditFromRequest(req, {
      action: 'update',
      entityType: 'workspace-layout',
      summary: `Saved workspace layout with ${positions.length} node positions`,
      details: {
        positions: positions.length,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving workspace layout:', error);
    res.status(500).json({ success: false, error: 'Failed to save workspace layout' });
  }
});

export default router;
