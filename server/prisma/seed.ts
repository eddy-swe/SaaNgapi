import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, setHours, setMinutes } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SaaNgapi database...');

  // Clean existing records if any
  await prisma.webhookLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.availabilityOverride.deleteMany();
  await prisma.eventType.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Demo Host User
  const host = await prisma.user.create({
    data: {
      name: 'Alex Rivera',
      email: 'alex@saangapi.com',
      username: 'alex',
      passwordHash,
      role: 'HOST',
      timezone: 'America/New_York',
      bio: 'Senior System Architect & Full-Stack Tech Consultant. Available for architecture advisory and technical coaching.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'
    }
  });

  console.log(`👤 Created Host User: ${host.name} (@${host.username})`);

  // 2. Create Event Types
  const event1 = await prisma.eventType.create({
    data: {
      userId: host.id,
      title: '15-Min Quick Sync',
      slug: '15-min-sync',
      description: 'A swift 15-minute introductory alignment call for quick questions or introductory greetings.',
      duration: 15,
      bufferBefore: 5,
      bufferAfter: 5,
      price: 0,
      currency: 'USD',
      color: '#10B981', // Emerald green
      isActive: true
    }
  });

  const event2 = await prisma.eventType.create({
    data: {
      userId: host.id,
      title: '30-Min Strategy Consultation',
      slug: '30-min-consultation',
      description: 'Discuss technical roadmap, system design architecture, and best engineering practices.',
      duration: 30,
      bufferBefore: 10,
      bufferAfter: 10,
      price: 50,
      currency: 'USD',
      color: '#4F46E5', // Indigo
      isActive: true
    }
  });

  const event3 = await prisma.eventType.create({
    data: {
      userId: host.id,
      title: '60-Min In-Depth Architecture Review',
      slug: '60-min-review',
      description: 'Comprehensive code and infrastructure deep dive. Ideal for database schema optimization and scalability bottlenecks.',
      duration: 60,
      bufferBefore: 15,
      bufferAfter: 15,
      price: 120,
      currency: 'USD',
      color: '#F59E0B', // Amber
      isActive: true
    }
  });

  console.log(`📅 Created 3 Event Types for @${host.username}`);

  // 3. Create Weekly Availability (Mon - Fri: 09:00 - 17:00)
  const schedules = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    userId: host.id,
    dayOfWeek,
    startTime: '09:00',
    endTime: '17:00',
    isActive: true
  }));

  await prisma.availability.createMany({ data: schedules });
  console.log('⏰ Created Weekly Availability rules (Mon-Fri 09:00 - 17:00)');

  // 4. Create Sample Bookings (Upcoming and Past)
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 4);
  const pastDate = addDays(today, -3);

  const tomorrow10am = setMinutes(setHours(tomorrow, 10), 0);
  const tomorrow1030am = setMinutes(setHours(tomorrow, 10), 30);

  const nextWeek2pm = setMinutes(setHours(nextWeek, 14), 0);
  const nextWeek3pm = setMinutes(setHours(nextWeek, 15), 0);

  const past11am = setMinutes(setHours(pastDate, 11), 0);
  const past1130am = setMinutes(setHours(pastDate, 11), 30);

  // Booking 1: Upcoming 30-min consultation tomorrow
  await prisma.booking.create({
    data: {
      eventTypeId: event2.id,
      hostId: host.id,
      inviteeName: 'Sarah Connor',
      inviteeEmail: 'sarah@example.com',
      inviteeTimezone: 'America/Los_Angeles',
      inviteeNotes: 'Interested in microservices scaling strategies and high-concurrency database connection pooling.',
      startTime: tomorrow10am,
      endTime: tomorrow1030am,
      status: 'CONFIRMED',
      meetingUrl: 'https://meet.jit.si/saangapi-demo-room-1'
    }
  });

  // Booking 2: Upcoming 60-min review next week
  await prisma.booking.create({
    data: {
      eventTypeId: event3.id,
      hostId: host.id,
      inviteeName: 'David Miller',
      inviteeEmail: 'david@fintech-startup.io',
      inviteeTimezone: 'Europe/London',
      inviteeNotes: 'Review our PostgreSQL schema design and indexing strategy.',
      startTime: nextWeek2pm,
      endTime: nextWeek3pm,
      status: 'CONFIRMED',
      meetingUrl: 'https://meet.jit.si/saangapi-demo-room-2'
    }
  });

  // Booking 3: Past completed booking
  await prisma.booking.create({
    data: {
      eventTypeId: event1.id,
      hostId: host.id,
      inviteeName: 'Elena Rostova',
      inviteeEmail: 'elena@techcorp.com',
      inviteeTimezone: 'America/New_York',
      inviteeNotes: 'Initial sync on cloud migration.',
      startTime: past11am,
      endTime: past1130am,
      status: 'CONFIRMED',
      meetingUrl: 'https://meet.jit.si/saangapi-demo-room-3'
    }
  });

  console.log('✅ Seed completed successfully! Demo user: alex@saangapi.com / password123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
