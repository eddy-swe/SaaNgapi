"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityController = exports.createOverrideSchema = exports.updateScheduleSchema = void 0;
const zod_1 = require("zod");
const prisma_1 = require("../db/prisma");
exports.updateScheduleSchema = zod_1.z.object({
    schedules: zod_1.z.array(zod_1.z.object({
        dayOfWeek: zod_1.z.number().int().min(0).max(6),
        startTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm'),
        endTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm'),
        isActive: zod_1.z.boolean()
    }))
});
exports.createOverrideSchema = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
    startTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
    endTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
    isUnavailable: zod_1.z.boolean().default(false)
});
class AvailabilityController {
    static async getAvailability(req, res) {
        try {
            const userId = req.user.userId;
            const [schedules, overrides] = await Promise.all([
                prisma_1.prisma.availability.findMany({
                    where: { userId, eventTypeId: null },
                    orderBy: { dayOfWeek: 'asc' }
                }),
                prisma_1.prisma.availabilityOverride.findMany({
                    where: { userId },
                    orderBy: { date: 'asc' }
                })
            ]);
            res.status(200).json({
                success: true,
                schedules,
                overrides
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch availability' });
        }
    }
    static async updateSchedule(req, res) {
        try {
            const userId = req.user.userId;
            const { schedules } = req.body;
            // Upsert schedules for the user
            await prisma_1.prisma.$transaction(async (tx) => {
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
                    }
                    else {
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
            const updatedSchedules = await prisma_1.prisma.availability.findMany({
                where: { userId, eventTypeId: null },
                orderBy: { dayOfWeek: 'asc' }
            });
            res.status(200).json({
                success: true,
                message: 'Weekly schedule updated successfully',
                schedules: updatedSchedules
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to update schedule' });
        }
    }
    static async addOverride(req, res) {
        try {
            const userId = req.user.userId;
            const { date, startTime, endTime, isUnavailable } = req.body;
            const existing = await prisma_1.prisma.availabilityOverride.findFirst({
                where: { userId, date }
            });
            let override;
            if (existing) {
                override = await prisma_1.prisma.availabilityOverride.update({
                    where: { id: existing.id },
                    data: {
                        startTime: startTime || null,
                        endTime: endTime || null,
                        isUnavailable: !!isUnavailable
                    }
                });
            }
            else {
                override = await prisma_1.prisma.availabilityOverride.create({
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
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to save override' });
        }
    }
    static async deleteOverride(req, res) {
        try {
            const userId = req.user.userId;
            const { id } = req.params;
            const existing = await prisma_1.prisma.availabilityOverride.findFirst({
                where: { id, userId }
            });
            if (!existing) {
                res.status(404).json({ success: false, message: 'Override not found' });
                return;
            }
            await prisma_1.prisma.availabilityOverride.delete({ where: { id } });
            res.status(200).json({ success: true, message: 'Override removed successfully' });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to delete override' });
        }
    }
}
exports.AvailabilityController = AvailabilityController;
