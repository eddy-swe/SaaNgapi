import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../types';

export const updateScheduleSchema = z.object({
  schedules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm'),
      endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm'),
      isActive: z.boolean()
    })
  )
});

export const createOverrideSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  isUnavailable: z.boolean().default(false)
});

export class AvailabilityController {
  public static async getAvailability(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const [schedules, overrides] = await Promise.all([
        prisma.availability.findMany({
          where: { userId, eventTypeId: null },
          orderBy: { dayOfWeek: 'asc' }
        }),
        prisma.availabilityOverride.findMany({
          where: { userId },
          orderBy: { date: 'asc' }
        })
      ]);

      res.status(200).json({
        success: true,
        schedules,
        overrides
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch availability' });
    }
  }

  public static async updateSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { schedules } = req.body;

      // Upsert schedules for the user
      await prisma.$transaction(async (tx) => {
        for (const item of schedules) {
          const existing = await tx.availability.findFirst({
            where: {
              userId,
              eventTypeId: null,
              dayOfWeek: item.dayOfWeek
            }
          });

          if (existing) {
            await tx.availability.update({
              where: { id: existing.id },
              data: {
                startTime: item.startTime,
                endTime: item.endTime,
                isActive: item.isActive
              }
            });
          } else {
            await tx.availability.create({
              data: {
                userId,
                dayOfWeek: item.dayOfWeek,
                startTime: item.startTime,
                endTime: item.endTime,
                isActive: item.isActive
              }
            });
          }
        }
      });

      const updatedSchedules = await prisma.availability.findMany({
        where: { userId, eventTypeId: null },
        orderBy: { dayOfWeek: 'asc' }
      });

      res.status(200).json({
        success: true,
        message: 'Weekly schedule updated successfully',
        schedules: updatedSchedules
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to update schedule' });
    }
  }

  public static async addOverride(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { date, startTime, endTime, isUnavailable } = req.body;

      const existing = await prisma.availabilityOverride.findFirst({
        where: { userId, date }
      });

      let override;
      if (existing) {
        override = await prisma.availabilityOverride.update({
          where: { id: existing.id },
          data: {
            startTime: startTime || null,
            endTime: endTime || null,
            isUnavailable: !!isUnavailable
          }
        });
      } else {
        override = await prisma.availabilityOverride.create({
          data: {
            userId,
            date,
            startTime: startTime || null,
            endTime: endTime || null,
            isUnavailable: !!isUnavailable
          }
        });
      }

      res.status(200).json({
        success: true,
        message: 'Date override saved successfully',
        override
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to save override' });
    }
  }

  public static async deleteOverride(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const existing = await prisma.availabilityOverride.findFirst({
        where: { id, userId }
      });

      if (!existing) {
        res.status(404).json({ success: false, message: 'Override not found' });
        return;
      }

      await prisma.availabilityOverride.delete({ where: { id } });

      res.status(200).json({ success: true, message: 'Override removed successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to delete override' });
    }
  }
}
