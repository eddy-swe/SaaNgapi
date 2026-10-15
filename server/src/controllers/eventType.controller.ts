import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../types';

export const createEventTypeSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  slug: z
    .string()
    .min(2, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  duration: z.number().int().min(5, 'Duration must be at least 5 minutes').max(720),
  bufferBefore: z.number().int().min(0).default(0),
  bufferAfter: z.number().int().min(0).default(0),
  price: z.number().min(0).optional(),
  currency: z.string().default('USD'),
  color: z.string().default('#3B82F6'),
  isActive: z.boolean().default(true),
  customQuestions: z.string().optional()
});

export const updateEventTypeSchema = createEventTypeSchema.partial();

export class EventTypeController {
  public static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const eventTypes = await prisma.eventType.findMany({
        where: { userId },
        include: {
          _count: {
            select: { bookings: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json({ success: true, eventTypes });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to retrieve event types' });
    }
  }

  public static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = req.body;

      // Check slug uniqueness for this user
      const existing = await prisma.eventType.findUnique({
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

      const eventType = await prisma.eventType.create({
        data: {
          ...data,
          userId
        }
      });

      res.status(201).json({ success: true, eventType });
    } catch (error) {
      console.error('Error creating event type:', error);
      res.status(500).json({ success: false, message: 'Failed to create event type' });
    }
  }

  public static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const eventType = await prisma.eventType.findFirst({
        where: { id, userId }
      });

      if (!eventType) {
        res.status(404).json({ success: false, message: 'Event type not found' });
        return;
      }

      res.status(200).json({ success: true, eventType });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch event type' });
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const data = req.body;

      // Ensure ownership
      const existing = await prisma.eventType.findFirst({
        where: { id, userId }
      });

      if (!existing) {
        res.status(404).json({ success: false, message: 'Event type not found' });
        return;
      }

      if (data.slug && data.slug !== existing.slug) {
        const slugExists = await prisma.eventType.findUnique({
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

      const updated = await prisma.eventType.update({
        where: { id },
        data
      });

      res.status(200).json({ success: true, eventType: updated });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to update event type' });
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const existing = await prisma.eventType.findFirst({
        where: { id, userId }
      });

      if (!existing) {
        res.status(404).json({ success: false, message: 'Event type not found' });
        return;
      }

      await prisma.eventType.delete({
        where: { id }
      });

      res.status(200).json({ success: true, message: 'Event type deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to delete event type' });
    }
  }
}
