# 🏫 UOM Room Allocation System v2.0

> A production-ready full-stack web application for managing university room bookings using a **FIFO queue-based allocation** system.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Deployment Guide](#deployment-guide)
- [Testing](#testing)
- [Database Schema](#database-schema)

---

## Overview

The UOM Room Allocation System allows university departments to submit room booking requests that are fulfilled in **First-In, First-Out (FIFO)** order. Administrators can process requests individually or in bulk. The system detects conflicts automatically, enforces per-department semester limits, and provides a full audit trail.

### Default Credentials (after seeding)

| Role    | Email                          | Password      |
|---------|-------------------------------|---------------|
| Admin   | admin@uom.edu.pk              | `Admin@123`   |
| Student | ali@student.uom.edu.pk        | `Student@123` |

---

## Architecture

```
┌────────────────────────────────────────────────┐
│              React Frontend (Vite)             │
│  Dashboard · Booking · Queue · Admin · Profile │
└──────────────────────┬─────────────────────────┘
                       │ HTTPS / REST API
┌──────────────────────▼─────────────────────────┐
│           Express.js Backend (Node 20)         │
│  auth · rooms · queue · allocations · admin    │
│  JWT · Helmet · Rate Limiting · Joi Validation │
└──────────────────────┬─────────────────────────┘
                       │ pg pool
┌──────────────────────▼─────────────────────────┐
│              PostgreSQL 16                     │
│  users · rooms · booking_queue · allocations   │
│  semesters · activity_logs · dept_usage        │
└────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Package           | Purpose                            |
|-------------------|------------------------------------|
| Express.js 4      | HTTP server & routing              |
| PostgreSQL + pg   | Primary database                   |
| bcryptjs          | Password hashing (cost factor 12)  |
| jsonwebtoken      | JWT authentication                 |
| Joi               | Request validation schemas         |
| Helmet            | Security headers                   |
| express-rate-limit| Rate limiting                      |
| Winston           | Structured logging                 |
| Morgan            | HTTP request logs                  |
| Jest + Supertest  | Testing                            |

### Frontend
| Package           | Purpose                            |
|-------------------|------------------------------------|
| React 18          | UI framework                       |
| React Router v6   | Client-side routing                |
| Vite              | Build tool & dev server            |
| Axios             | HTTP client with interceptors      |
| react-hot-toast   | Notifications                      |

---

## Features

### For Students
- 📅 **Room Booking** — Submit requests with date, time, department, semester info
- 📋 **Queue Tracking** — See your position in the FIFO queue
- ✓ **Booking History** — View all your confirmed allocations
- 👤 **Profile** — Update name, department, password

### For Admins
- ▶ **Process Queue** — Allocate one or all pending requests at once
- 👥 **User Management** — Activate/deactivate users, change roles
- 📊 **Department Usage** — Track allocations per department per semester
- 📋 **Activity Logs** — Full audit trail of all system events
- ⬡ **Room Management** — View schedules for any room in any date range

### System
- 🔒 JWT authentication with role-based access control
- ✅ Conflict detection (no double-booking)
- ⚠️ Weekly limit enforcement (16 bookings per department per semester)
- 🛡️ SQL injection prevention via parameterized queries
- 📦 Docker + docker-compose for one-command deployment

---

## Folder Structure

```
uom-room-allocation/
├── backend/
│   ├── controllers/          # Request handlers (thin layer)
│   │   ├── authController.js
│   │   ├── queueController.js
│   │   ├── allocationController.js
│   │   ├── processController.js
│   │   ├── roomController.js
│   │   └── adminController.js
│   ├── services/
│   │   └── allocationService.js  # Core FIFO allocation logic
│   ├── middleware/
│   │   ├── auth.js               # JWT protect + restrictTo()
│   │   ├── validate.js           # Joi validation middleware
│   │   ├── errorHandler.js       # Global error handler
│   │   └── notFound.js
│   ├── routes/               # Route definitions
│   ├── validations/
│   │   └── schemas.js            # All Joi schemas
│   ├── utils/
│   │   ├── logger.js             # Winston logger
│   │   ├── AppError.js           # Custom error + catchAsync
│   │   └── apiResponse.js        # Standardized responses
│   ├── db/
│   │   ├── pool.js               # pg connection pool
│   │   ├── schema.sql            # Database schema
│   │   ├── migrate.js            # Migration runner
│   │   └── seed.js               # Seed data
│   ├── tests/
│   │   ├── auth.test.js
│   │   └── allocation.test.js
│   └── server.js                 # Entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/           # Sidebar + Layout
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Global auth state
│   │   ├── pages/                # One file per route
│   │   ├── services/
│   │   │   └── api.js            # Axios instance
│   │   ├── App.jsx               # Router + protected routes
│   │   ├── main.jsx
│   │   └── index.css             # Design tokens + global styles
│   ├── index.html
│   ├── vite.config.js
│   ├── nginx.conf
│   └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- PostgreSQL 14+
- npm or pnpm

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/uom-room-allocation.git
cd uom-room-allocation

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
```

### 3. Set Up Database

```bash
cd backend
npm run migrate   # Creates all tables
npm run seed      # Seeds rooms, departments, and default users
```

### 4. Run Development Servers

```bash
# Terminal 1 — Backend
cd backend
npm run dev       # http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm run dev       # http://localhost:5173
```

---

## Environment Variables

| Variable                | Required | Default       | Description                          |
|-------------------------|----------|---------------|--------------------------------------|
| `PORT`                  | No       | `5000`        | Backend server port                  |
| `NODE_ENV`              | No       | `development` | `development` / `production` / `test`|
| `DATABASE_URL`          | **Yes**  | —             | PostgreSQL connection string         |
| `JWT_SECRET`            | **Yes**  | —             | Secret for signing JWT tokens        |
| `JWT_EXPIRES_IN`        | No       | `7d`          | Token expiry duration                |
| `CLIENT_URL`            | No       | `http://localhost:5173` | Frontend URL for CORS       |
| `RATE_LIMIT_WINDOW_MS`  | No       | `900000`      | Rate limit window (15 min)           |
| `RATE_LIMIT_MAX`        | No       | `100`         | Max requests per window              |

---

## API Reference

All endpoints are prefixed with `/api`.

### Authentication

| Method | Endpoint              | Auth     | Description              |
|--------|-----------------------|----------|--------------------------|
| POST   | `/auth/register`      | Public   | Create student account   |
| POST   | `/auth/login`         | Public   | Login, returns JWT token |
| GET    | `/auth/me`            | 🔒 Any   | Get current user         |
| PATCH  | `/auth/me`            | 🔒 Any   | Update name/department   |
| PATCH  | `/auth/me/password`   | 🔒 Any   | Change password          |

### Queue

| Method | Endpoint     | Auth      | Description                    |
|--------|--------------|-----------|--------------------------------|
| POST   | `/queue`     | 🔒 Any    | Add booking request to queue   |
| GET    | `/queue`     | 🔒 Any    | List queue (filterable by status) |
| DELETE | `/queue/:id` | 🔒 Any    | Cancel a pending request       |

### Allocations

| Method | Endpoint                   | Auth       | Description                  |
|--------|----------------------------|------------|------------------------------|
| GET    | `/allocations`             | 🔒 Any     | Paginated allocations list   |
| GET    | `/allocations/dashboard`   | 🔒 Any     | Stats + recent activity      |
| GET    | `/allocations/schedule`    | 🔒 Any     | Room schedule by date range  |
| GET    | `/allocations/usage`       | 🔒 Any     | Department usage stats       |
| GET    | `/allocations/logs`        | 🔒 Admin   | Activity logs                |

### Process (Admin Only)

| Method | Endpoint         | Auth       | Description                     |
|--------|------------------|------------|---------------------------------|
| POST   | `/process/next`  | 🔒 Admin   | Allocate next pending request   |
| POST   | `/process/all`   | 🔒 Admin   | Allocate all pending requests   |

### Rooms

| Method | Endpoint     | Auth       | Description          |
|--------|--------------|------------|----------------------|
| GET    | `/rooms`     | 🔒 Any     | List all active rooms |
| GET    | `/rooms/:id` | 🔒 Any     | Get room by ID       |
| POST   | `/rooms`     | 🔒 Admin   | Create a new room    |
| PATCH  | `/rooms/:id` | 🔒 Admin   | Update room details  |

### Admin

| Method | Endpoint                      | Auth       | Description               |
|--------|-------------------------------|------------|---------------------------|
| GET    | `/admin/users`                | 🔒 Admin   | List all users            |
| PATCH  | `/admin/users/:id/role`       | 🔒 Admin   | Change user role          |
| PATCH  | `/admin/users/:id/status`     | 🔒 Admin   | Toggle active/inactive    |
| DELETE | `/admin/allocations/:id`      | 🔒 Admin   | Delete an allocation      |

### API Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "pagination": { "total": 50, "page": 1, "pages": 3, "limit": 20 }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [
    { "field": "department", "message": "department is required" }
  ]
}
```

---

## Authentication

This app uses **JWT (JSON Web Tokens)** for stateless authentication.

1. Login via `POST /api/auth/login` → receive `token`
2. Include on every protected request:
   ```
   Authorization: Bearer <token>
   ```
3. Token expires after 7 days (configurable via `JWT_EXPIRES_IN`)

### Roles

| Role    | Permissions                                                    |
|---------|----------------------------------------------------------------|
| student | Book rooms, view own allocations, cancel own pending requests  |
| admin   | All student permissions + process queue, manage users, delete allocations, view logs |

---

## Testing

```bash
cd backend
npm test               # Run all tests
npm run test:watch     # Watch mode
```

Test coverage includes:
- Auth endpoint validation (missing fields, weak password, invalid email)
- JWT protection (missing/invalid/expired token)
- Allocation service unit tests (mocked DB)
- Joi schema validation edge cases
- Health check and 404 handling

---

## Database Schema

### Key Tables

```sql
users              -- accounts with role (admin/student)
rooms              -- 52 rooms with capacity, building, floor
booking_queue      -- FIFO pending/allocated/failed requests
allocations        -- confirmed room allocations
semesters          -- year + semester_number (1–8)
department_semester_usage  -- tracks 16-booking limit
activity_logs      -- full audit trail with JSONB metadata
```

### Indexes

- `idx_bq_status`, `idx_bq_queued_at` — fast queue processing
- `idx_alloc_room_date` — conflict detection
- `idx_alloc_dept`, `idx_alloc_user` — filtered queries
- `idx_logs_ts` — recent logs
- `idx_users_email` — login lookup

---

## Deployment Guide

### Docker (Recommended)

```bash
# 1. Copy and configure environment
cp backend/.env.example .env
# Edit .env: set JWT_SECRET and POSTGRES_PASSWORD

# 2. Start everything
docker-compose up --build -d

# 3. Run migrations and seed
docker-compose exec backend node db/migrate.js
docker-compose exec backend node db/seed.js

# 4. Visit http://localhost
```

### Deploy to Render (Backend)

1. Create a **New Web Service** → connect your GitHub repo
2. Set **Root Directory** to `backend`
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `node server.js`
5. Add environment variables from `.env.example`
6. Add a **PostgreSQL** database service and copy the connection string to `DATABASE_URL`

### Deploy to Vercel (Frontend)

1. Import your repo to Vercel
2. Set **Root Directory** to `frontend`
3. Set **Framework Preset** to `Vite`
4. Add environment variable:
   ```
   VITE_API_URL=https://your-render-backend.onrender.com/api
   ```
5. Update `vite.config.js` proxy if needed

### Deploy to Railway

1. Create new project → Deploy from GitHub
2. Add a PostgreSQL plugin
3. Set environment variables
4. Railway auto-detects Node.js and runs `npm start`

---

## Code Quality Highlights

- **`catchAsync`** wrapper eliminates try/catch boilerplate in every controller
- **Centralized error handler** maps PostgreSQL error codes (unique violation → 409, FK violation → 400)
- **`stripUnknown: true`** on all Joi validation — protects against mass assignment
- **`bcrypt` cost factor 12** — production-safe password hashing
- **Winston** with separate error.log and combined.log files
- **Rate limiting** — 100 req/15min globally, 20/15min for auth endpoints
- **Non-root Docker user** — least-privilege container execution
- **HEALTHCHECK** in Dockerfile for container orchestration

---

## License

MIT — free to use for academic projects and portfolios.

---

*Built with Node.js, Express, PostgreSQL, and React · UOM Room Allocation System v2.0*
