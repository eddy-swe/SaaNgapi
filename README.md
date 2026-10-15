# SaaNgapi — Full-Stack Scheduling & Appointment Platform

SaaNgapi is an enterprise-grade, full-stack scheduling and appointment booking platform inspired by Calendly and Cal.com. It provides dynamic timezone resolution, smart buffer calculations, atomic slot conflict prevention via database transactions, and an intuitive responsive React interface.

---

## 🏛 Architecture & Tech Stack

### Frontend (`/client`)
- **Framework**: React 18 with Vite and TypeScript
- **Styling**: Tailwind CSS with custom branding and responsive layouts
- **Icons**: Lucide React
- **State Management & Data Fetching**: TanStack React Query (v5) for server cache synchronization and React Context for user authentication
- **Date & Time Operations**: `date-fns` & `date-fns-tz` for zero-math local clock translations

### Backend (`/server`)
- **Runtime & Server**: Node.js, Express, TypeScript (`tsx` for hot reload)
- **Database & ORM**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens) with `bcryptjs` password hashing and role validation
- **Data Validation**: Zod schema validation middleware
- **Calendar & Notifications**:
  - Automated HTML email dispatcher with ICS (.ics) calendar file generation
  - Webhook dispatcher with HMAC-SHA256 signature verification for external sync (e.g. Google Calendar / CRM)

---

## 📂 Project Directory Structure

```text
SaaNgapi/
├── docker-compose.yml             # Local PostgreSQL Docker service
├── package.json                   # Root orchestrator scripts (concurrent client + server)
├── README.md                      # Complete setup, API reference & documentation
├── server/                        # Express + TypeScript Backend
│   ├── .env.example               # Server environment variables template
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (User, EventType, Availability, Booking)
│   │   └── seed.ts                # Database seed data (Demo host, event types, bookings)
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts             # Typed environment configuration
│   │   ├── db/
│   │   │   └── prisma.ts          # Prisma Client singleton
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT authentication & host authorization guard
│   │   │   ├── errorHandler.ts    # Centralized error & 404 handlers
│   │   │   └── validate.ts        # Zod request validation middleware
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts         # Register, Login, Profile
│   │   │   ├── eventType.controller.ts    # CRUD for event types
│   │   │   ├── availability.controller.ts # Weekly hours & date overrides
│   │   │   ├── booking.controller.ts      # Host booking management & reschedule
│   │   │   └── public.controller.ts       # Public slots calculation & booking creation
│   │   ├── services/
│   │   │   ├── slotCalculator.ts  # Core slot generation & overlap algorithm
│   │   │   ├── email.service.ts   # HTML email & .ics calendar generator
│   │   │   └── webhook.service.ts # Calendar sync webhook dispatcher with HMAC
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── eventType.routes.ts
│   │   │   ├── availability.routes.ts
│   │   │   ├── booking.routes.ts
│   │   │   ├── public.routes.ts
│   │   │   └── webhook.routes.ts
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript interfaces & Express types
│   │   └── index.ts               # Express entrypoint
│   └── tsconfig.json
└── client/                        # React + Vite + Tailwind Frontend
    ├── index.html
    ├── vite.config.ts             # Vite config with /api proxy
    ├── tailwind.config.js         # Tailwind theme & color tokens
    ├── src/
    │   ├── api/
    │   │   └── client.ts          # Axios client with JWT interceptor
    │   ├── context/
    │   │   └── AuthContext.tsx    # React Auth Provider & hooks
    │   ├── components/
    │   │   ├── Navbar.tsx         # Responsive navigation & session controls
    │   │   ├── Footer.tsx         # App footer
    │   │   ├── CalendarPicker.tsx # Interactive date calendar with disabled past dates
    │   │   ├── TimeSlotPicker.tsx # Available time slot cards with local tz
    │   │   ├── BookingFormModal.tsx # Attendee details modal (Name, Email, Notes)
    │   │   ├── EventTypeModal.tsx # Create/Edit event types modal
    │   │   ├── RescheduleModal.tsx # Interactive rescheduling dialog
    │   │   ├── CancelModal.tsx    # Appointment cancellation confirmation
    │   │   └── StatusBadge.tsx    # Lifecycle badge (CONFIRMED, CANCELLED, etc.)
    │   ├── pages/
    │   │   ├── Home.tsx           # Modern landing page
    │   │   ├── Login.tsx          # Host login with instant demo pre-fill
    │   │   ├── Register.tsx       # Host registration with custom handle
    │   │   ├── Dashboard.tsx      # Host overview & upcoming metrics
    │   │   ├── EventTypesPage.tsx # Event types CRUD & link sharing
    │   │   ├── AvailabilityPage.tsx # Weekly hours & date overrides
    │   │   ├── BookingsPage.tsx   # Upcoming, Past, Cancelled appointments
    │   │   ├── PublicBookingPage.tsx # Public booking page (/:username/:slug)
    │   │   └── BookingConfirmationPage.tsx # Success view & .ics download
    │   ├── utils/
    │   │   ├── date.ts            # Date formatting & .ics file downloader
    │   │   └── timezones.ts       # Timezone auto-detection & curated tz list
    │   ├── types/
    │   │   └── index.ts           # Frontend TypeScript interfaces
    │   ├── App.tsx                # App routes & auth protection
    │   └── main.tsx               # TanStack Query & React root mount
    └── tsconfig.json
```

---

## ⚡ Slot Calculation & Conflict Prevention Algorithm

SaaNgapi implements a two-phase scheduling algorithm in `server/src/services/slotCalculator.ts`:

1. **Candidate Slot Generation**:
   - Computes day-of-week in the **host's native timezone**.
   - Checks for date-specific overrides in `AvailabilityOverride` (e.g. vacation day off).
   - If no override, fetches recurring weekly hours from `Availability` (e.g. `09:00 - 17:00`).
   - Converts working boundaries into UTC timestamps.
   - Iterates in discrete intervals (e.g. 15 or 30 minutes) up to `windowEndUtc - duration`.
   - Filters out past slots and slots violating the minimum scheduling notice (default: 30 minutes).

2. **Buffer Padding & Overlap Detection**:
   - Expands candidate slots with host buffers:
     `[candidateStart - bufferBefore, candidateEnd + bufferAfter]`
   - Queries all existing active bookings (`CONFIRMED` or `PENDING`) overlapping the day window.
   - For each booking, expands its interval with its own event buffers:
     `[bookingStart - bBufferBefore, bookingEnd + bBufferAfter]`
   - Standard interval intersection check:
     $$\max(A_{\text{start}}, B_{\text{start}}) < \min(A_{\text{end}}, B_{\text{end}})$$
   - Only collision-free slots are converted into the invitee's requested timezone and returned to the frontend.

3. **Atomic Transaction Lock**:
   - When an invitee submits a booking, the operation is wrapped in a **Prisma ACID transaction** (`prisma.$transaction`).
   - The slot is re-verified (`verifySlotAvailability`) before insertion. If two users click simultaneously, one succeeds and the other receives an HTTP `409 Conflict`, completely preventing double bookings.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Node.js 18+ (tested on Node v22.15.1)
- npm 9+
- PostgreSQL database (or Docker to run the included `docker-compose.yml`)

### 2. Start PostgreSQL (Docker)
```bash
docker compose up -d
```
*(Alternatively, point `DATABASE_URL` in `server/.env` to any existing PostgreSQL instance).*

### 3. Install Dependencies
From the repository root:
```bash
npm run install:all
```
Or manually in each folder:
```bash
cd server && npm install
cd ../client && npm install
```

### 4. Database Setup & Seeding
```bash
cd server
npm run prisma:generate
npm run db:push
npm run db:seed
```
*The seed command pre-configures a demo host user:*
- **Host Email**: `alex@saangapi.com`
- **Password**: `password123`
- **Public Handle**: `/alex`
- **Preconfigured Event Types**:
  - `15-min-sync` (15 min, Free)
  - `30-min-consultation` (30 min, $50)
  - `60-min-review` (60 min, $120)

### 5. Launch the Application
Run both server and client concurrently from the project root:
```bash
npm run dev
```

Or run them in separate terminals:
- **Server**: `cd server && npm run dev` (Runs on `http://localhost:5000`)
- **Client**: `cd client && npm run dev` (Runs on `http://localhost:5173`)

---

## 🧪 Testing the Booking Workflow

1. Open `http://localhost:5173/login`.
2. Click **"Click to Auto-fill Demo Host Credentials"** and sign in.
3. Review upcoming bookings on the **Dashboard**.
4. Visit `/alex/30-min-consultation` in an incognito window:
   - Pick a date on the calendar.
   - Choose a time slot (notice it renders in your local timezone).
   - Enter your name & email to book.
5. You are redirected to the confirmation page:
   - Click **"Add to Calendar (.ics)"** to verify calendar integration.
   - Check the server console to observe the dispatched confirmation email log and the signed webhook event!
