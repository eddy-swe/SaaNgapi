"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventTypeController = exports.updateEventTypeSchema = exports.createEventTypeSchema = void 0;
const zod_1 = require("zod");
const prisma_1 = require("../db/prisma");
exports.createEventTypeSchema = zod_1.z.object({
    title: zod_1.z.string().min(2, 'Title is required'),
    slug: zod_1.z
        .string()
        .min(2, 'Slug is required')
        .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
    description: zod_1.z.string().optional(),
    duration: zod_1.z.number().int().min(5, 'Duration must be at least 5 minutes').max(720),
    bufferBefore: zod_1.z.number().int().min(0).default(0),
    bufferAfter: zod_1.z.number().int().min(0).default(0),
    price: zod_1.z.number().min(0).optional(),
    currency: zod_1.z.string().default('USD'),
    color: zod_1.z.string().default('#3B82F6'),
    isActive: zod_1.z.boolean().default(true),
    customQuestions: zod_1.z.string().optional()
});
exports.updateEventTypeSchema = exports.createEventTypeSchema.partial();
class EventTypeController {
    static async list(req, res) {
        try {
            const userId = req.user.userId;
            const eventTypes = await prisma_1.prisma.eventType.findMany({
                where: { userId },
                include: {
                    _count: {
                        select: { bookings: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.status(200).json({ success: true, eventTypes });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to retrieve event types' });
        }
    }
    static async create(req, res) {
        try {
            const userId = req.user.userId;
            const data = req.body;
            // Check slug uniqueness for this user
            const existing = await prisma_1.prisma.eventType.findUnique({
                where: {
                    userId_slug: {
                        userId,
                        slug: data.slug
                    }
                }
            });
            if (existing) {
                res.status(400).json({
                    success: false,
                    message: 'You already have an event type with this slug'
                });
                return;
            }
            const eventType = await prisma_1.prisma.eventType.create({
                data: {
                    ...data,
                    userId
                }
            });
            res.status(201).json({ success: true, eventType });
        }
        catch (error) {
            console.error('Error creating event type:', error);
            res.status(500).json({ success: false, message: 'Failed to create event type' });
        }
    }
    static async getById(req, res) {
        try {
            const userId = req.user.userId;
            const { id } = req.params;
            const eventType = await prisma_1.prisma.eventType.findFirst({
                where: { id, userId }
            });
            if (!eventType) {
                res.status(404).json({ success: false, message: 'Event type not found' });
                return;
            }
            res.status(200).json({ success: true, eventType });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch event type' });
        }
    }
    static async update(req, res) {
        try {
            const userId = req.user.userId;
            const { id } = req.params;
            const data = req.body;
            // Ensure ownership
            const existing = await prisma_1.prisma.eventType.findFirst({
                where: { id, userId }
            });
            if (!existing) {
                res.status(404).json({ success: false, message: 'Event type not found' });
                return;
            }
            if (data.slug && data.slug !== existing.slug) {
                const slugExists = await prisma_1.prisma.eventType.findUnique({
                    where: {
                        userId_slug: {
                            userId,
                            slug: data.slug
                        }
                    }
                });
                if (slugExists) {
                    res.status(400).json({
                        success: false,
                        message: 'You already have an event type with this slug'
                    });
                    return;
                }
            }
            const updated = await prisma_1.prisma.eventType.update({
                where: { id },
                data
            });
            res.status(200).json({ success: true, eventType: updated });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to update event type' });
        }
    }
    static async delete(req, res) {
        try {
            const userId = req.user.userId;
            const { id } = req.params;
            const existing = await prisma_1.prisma.eventType.findFirst({
                where: { id, userId }
            });
            if (!existing) {
                res.status(404).json({ success: false, message: 'Event type not found' });
                return;
            }
            await prisma_1.prisma.eventType.delete({
                where: { id }
            });
            res.status(200).json({ success: true, message: 'Event type deleted successfully' });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to delete event type' });
        }
    }
}
exports.EventTypeController = EventTypeController;
