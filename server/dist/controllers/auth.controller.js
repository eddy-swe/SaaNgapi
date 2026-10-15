"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = exports.loginSchema = exports.registerSchema = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const prisma_1 = require("../db/prisma");
const env_1 = require("../config/env");
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    username: zod_1.z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
    timezone: zod_1.z.string().default('America/New_York')
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required')
});
class AuthController {
    static async register(req, res) {
        try {
            const { name, email, password, username, timezone } = req.body;
            // Check if email or username already taken
            const existingEmail = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (existingEmail) {
                res.status(400).json({ success: false, message: 'Email is already registered' });
                return;
            }
            const existingUsername = await prisma_1.prisma.user.findUnique({ where: { username: username.toLowerCase() } });
            if (existingUsername) {
                res.status(400).json({ success: false, message: 'Username is already taken' });
                return;
            }
            const passwordHash = await bcryptjs_1.default.hash(password, 10);
            // Create user, default event type, and default Mon-Fri 09:00 - 17:00 availability
            const user = await prisma_1.prisma.$transaction(async (tx) => {
                const newUser = await tx.user.create({
                    data: {
                        name,
                        email: email.toLowerCase(),
                        passwordHash,
                        username: username.toLowerCase(),
                        timezone,
                        role: 'HOST'
                    }
                });
                // Create default event type
                await tx.eventType.create({
                    data: {
                        userId: newUser.id,
                        title: '30-Min Consultation',
                        slug: '30-min-consultation',
                        description: 'Quick introductory call to discuss goals and collaboration.',
                        duration: 30,
                        bufferBefore: 5,
                        bufferAfter: 5,
                        price: 0,
                        currency: 'USD',
                        color: '#4F46E5',
                        isActive: true
                    }
                });
                // Create default Mon-Fri 9am-5pm availability (1=Mon, ..., 5=Fri)
                const defaultAvailabilities = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
                    userId: newUser.id,
                    dayOfWeek,
                    startTime: '09:00',
                    endTime: '17:00',
                    isActive: true
                }));
                await tx.availability.createMany({
                    data: defaultAvailabilities
                });
                return newUser;
            });
            const token = jsonwebtoken_1.default.sign({
                userId: user.id,
                email: user.email,
                role: user.role,
                username: user.username
            }, env_1.ENV.JWT_SECRET, { expiresIn: '7d' });
            res.status(201).json({
                success: true,
                message: 'Account created successfully',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    timezone: user.timezone
                }
            });
        }
        catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ success: false, message: 'Error registering user' });
        }
    }
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            const user = await prisma_1.prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });
            if (!user) {
                res.status(401).json({ success: false, message: 'Invalid email or password' });
                return;
            }
            const isValidPassword = await bcryptjs_1.default.compare(password, user.passwordHash);
            if (!isValidPassword) {
                res.status(401).json({ success: false, message: 'Invalid email or password' });
                return;
            }
            const token = jsonwebtoken_1.default.sign({
                userId: user.id,
                email: user.email,
                role: user.role,
                username: user.username
            }, env_1.ENV.JWT_SECRET, { expiresIn: '7d' });
            res.status(200).json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    timezone: user.timezone,
                    bio: user.bio,
                    avatarUrl: user.avatarUrl
                }
            });
        }
        catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ success: false, message: 'Error logging in' });
        }
    }
    static async getMe(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                    role: true,
                    timezone: true,
                    bio: true,
                    avatarUrl: true,
                    createdAt: true
                }
            });
            if (!user) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }
            res.status(200).json({ success: true, user });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error fetching profile' });
        }
    }
    static async updateProfile(req, res) {
        try {
            const userId = req.user?.userId;
            const { name, timezone, bio, avatarUrl } = req.body;
            const updatedUser = await prisma_1.prisma.user.update({
                where: { id: userId },
                data: {
                    ...(name && { name }),
                    ...(timezone && { timezone }),
                    ...(bio !== undefined && { bio }),
                    ...(avatarUrl !== undefined && { avatarUrl })
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                    role: true,
                    timezone: true,
                    bio: true,
                    avatarUrl: true
                }
            });
            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                user: updatedUser
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Error updating profile' });
        }
    }
}
exports.AuthController = AuthController;
