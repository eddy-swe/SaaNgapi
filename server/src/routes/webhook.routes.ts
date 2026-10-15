import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { authenticate, requireHost } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * Mock endpoint simulating an external integration receiver (Google Calendar Sync, Slack, or CRM)
 */
router.post('/mock-receiver', (req: Request, res: Response) => {
  const signature = req.headers['x-saangapi-signature'];
  console.log('[MOCK CALENDAR SYNC RECEIVER] Received Webhook Event:', {
    signature,
    payload: req.body
  });

  res.status(200).json({
    status: 'received',
    timestamp: new Date().toISOString()
  });
});

/**
 * Query webhook delivery logs for auditing & debugging
 */
router.get('/logs', authenticate, requireHost, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.webhookLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          select: {
            id: true,
            inviteeName: true,
            startTime: true,
            eventType: { select: { title: true } }
          }
        }
      }
    });

    res.status(200).json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve webhook logs' });
  }
});

export default router;
