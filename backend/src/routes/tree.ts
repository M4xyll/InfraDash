import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { getInfrastructureGraph, getInfrastructureSummary } from '../services/tree.service.js';

const router = Router();

router.get('/summary', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await getInfrastructureSummary();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch infrastructure summary' });
  }
});

router.get('/graph', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const graph = await getInfrastructureGraph();
    res.json({ success: true, data: graph });
  } catch (error) {
    console.error('Error fetching graph:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch infrastructure graph' });
  }
});

// Get full infrastructure tree
router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const [graph, stats] = await Promise.all([
      getInfrastructureGraph(),
      getInfrastructureSummary(),
    ]);

    res.json({
      success: true,
      data: {
        ...graph,
        stats,
      },
    });
  } catch (error) {
    console.error('Error fetching tree:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch infrastructure tree' });
  }
});

export default router;
