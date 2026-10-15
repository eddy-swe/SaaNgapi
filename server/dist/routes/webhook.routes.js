"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * Mock endpoint simulating an external integration receiver (Google Calendar Sync, Slack, or CRM)
 */
router.post('/mock-receiver', (req, res) => {
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
router.get('/logs', auth_1.authenticate, auth_1.requireHost, async (req, res) => {
    try {
        const logs = await prisma_1.prisma.webhookLog.findMany({
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to retrieve webhook logs' });
    }
});
exports.default = router;
