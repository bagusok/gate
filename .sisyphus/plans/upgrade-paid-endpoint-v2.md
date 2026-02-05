# Rencana Upgrade: Paid Endpoint v2.0

## TL;DR

> **Ringkasan**: Upgrade proyek `paid-endpoint` dari API Gateway sederhana menjadi platform web lengkap dengan Web Portal (Next.js + Elysia + Better Auth) dan Public API Service terpisah. Migrasi dari Hono ke Elysia, integrasi Better Auth untuk autentikasi web, dan penambahan dashboard admin/user.
>
> **Deliverables**:
> - Web Portal (Next.js + Elysia + shadcn/ui)
>   - User Portal: Dashboard, API Key management, Usage stats, Account settings
>   - Admin Portal: User management, Analytics, System monitoring
> - Public API Service (Elysia standalone) - API Gateway dengan rate limiting
> - Database migration untuk Better Auth + skema baru
> - Shared packages (types, database, utilities)
>
> **Estimated Effort**: XL (2-4 minggu full-time)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Setup Monorepo → Database → Auth → Portal → API Service

---

## 1. Konteks Proyek

### 1.1 State Saat Ini

**Teknologi yang Digunakan:**
| Komponen | Teknologi | Versi |
|----------|-----------|-------|
| Runtime | Bun | latest |
| Web Framework | Hono | 4.10.5 |
| Database | PostgreSQL + Drizzle ORM | 0.44.7 |
| Cache/Queue | Redis + ioredis + BullMQ | 5.8.2 / 5.63.1 |
| Auth | Custom (SHA-256 API Key) | - |

**Struktur Database Existing:**
```
├── clients          # Data pelanggan (name, email, status)
├── plans            # Tier langganan (free, pro, ultra, enterprise)
├── api_keys         # API keys (hash, prefix, expiry, plan association)
├── request_logs     # Log detail request (3-hari retention)
└── log_summaries    # Ringkasan harian (permanent)
```

**Fitur Existing:**
- Autentikasi via API Key (`X-API-Key` header)
- Rate limiting berbasis plan (daily/hourly)
- Proxy ke upstream API
- Endpoint usage tracking (`/user/usage`)
- Background job untuk log retention (BullMQ)

### 1.2 Target State

**Arsitektur Baru:**
```
┌─────────────────────────────────────────────────────────────────┐
│                        MONOREPO (Turborepo)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────┐  ┌──────────────┐ │
│  │           apps/web (Next.js)              │  │ apps/api     │ │
│  │                                           │  │ (Elysia)     │ │
│  │  ┌─────────────────────────────────────┐ │  │              │ │
│  │  │  Frontend (React + shadcn/ui)       │ │  │ Public API   │ │
│  │  │  - User Portal                      │ │  │ Gateway      │ │
│  │  │  - Admin Portal                     │ │  │              │ │
│  │  │  - Better Auth UI Components        │ │  │ - Proxy      │ │
│  │  └─────────────────────────────────────┘ │  │ - Rate Limit │ │
│  │                                           │  │ - API Keys   │ │
│  │  ┌─────────────────────────────────────┐ │  │              │ │
│  │  │  Backend (Elysia in Next.js)        │ │  └──────────────┘ │
│  │  │  /api/[[...slugs]]/route.ts         │ │                   │
│  │  │  - Better Auth handlers             │ │                   │
│  │  │  - Dashboard API                    │ │                   │
│  │  │  - Admin API                        │ │                   │
│  │  └─────────────────────────────────────┘ │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┤
│  │                    packages/                                  │
│  │  ├── @repo/database    # Drizzle schema & client             │
│  │  ├── @repo/types       # Shared TypeScript types             │
│  │  ├── @repo/auth        # Better Auth configuration           │
│  │  └── @repo/ui          # Shared shadcn components (opsional) │
│  └──────────────────────────────────────────────────────────────┘
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                              │
                              ▼
              ┌───────────────────────────────┐
              │     PostgreSQL Database       │
              │  ┌─────────────────────────┐  │
              │  │ Existing Tables         │  │
              │  │ + Better Auth Tables    │  │
              │  │ + New Portal Tables     │  │
              │  └─────────────────────────┘  │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │          Redis               │
              │  - Rate limiting counters    │
              │  - Session cache (opsional)  │
              │  - BullMQ queues             │
              └───────────────────────────────┘
```

---

## 2. Keputusan Teknologi

### 2.1 Monorepo Structure

**Pilihan: Turborepo**

| Aspek | Alasan |
|-------|--------|
| Build System | Turborepo - incremental builds, caching |
| Package Manager | bun workspaces (native support) |
| Struktur | `apps/` untuk deployable apps, `packages/` untuk shared code |

### 2.2 UI Library

**Pilihan: shadcn/ui**

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **shadcn/ui** | Full control, copy-paste, Radix-based, Tailwind native | More setup awal | **DIPILIH** |
| NextUI | Beautiful default, easy | Less customizable, larger bundle | - |
| Mantine | Feature-rich, hooks | Not Tailwind-first | - |

**Alasan Memilih shadcn/ui:**
1. **Full Ownership** - Kode component di-copy ke project, bukan dependency
2. **Radix UI Foundation** - Accessibility bawaan, headless primitives
3. **Tailwind Native** - Seamless dengan Tailwind CSS
4. **Better Auth UI** - Ada official `better-auth-ui` yang menggunakan shadcn/ui
5. **Dashboard Ready** - Sidebar, DataTable, Charts sudah tersedia

### 2.3 Authentication

**Pilihan: Better Auth**

| Aspek | Detail |
|-------|--------|
| Web Portal Auth | Better Auth (email/password, social login) |
| Public API Auth | API Keys (existing, dipertahankan) |
| Session | Database sessions (Drizzle adapter) |
| UI | better-auth-ui (shadcn/ui based) |

**Database Tables Required by Better Auth:**
```sql
-- Core tables yang akan di-generate
user          -- User accounts
session       -- Active sessions
account       -- OAuth providers
verification  -- Email verification tokens
```

### 2.4 Backend Architecture

**Pilihan: Elysia Embedded in Next.js + Standalone Elysia**

```typescript
// apps/web/app/api/[[...slugs]]/route.ts
import { Elysia } from 'elysia'

const app = new Elysia({ prefix: '/api' })
  .use(betterAuthPlugin)  // Auth endpoints
  .use(dashboardRoutes)   // Dashboard API
  .use(adminRoutes)       // Admin API

export const GET = app.fetch
export const POST = app.fetch
export const PUT = app.fetch
export const DELETE = app.fetch
```

**Alasan:**
1. **Type Safety** - Eden Treaty untuk end-to-end types
2. **Performance** - Elysia lebih cepat dari Next.js API routes
3. **Consistency** - Sama framework untuk web backend dan public API
4. **Bun Native** - Optimal untuk Bun runtime

### 2.5 Final Tech Stack

| Layer | Teknologi | Versi (Recommended) |
|-------|-----------|---------------------|
| **Runtime** | Bun | 1.1.x |
| **Monorepo** | Turborepo | 2.x |
| **Frontend** | Next.js 15 (App Router) | 15.x |
| **Backend (Web)** | Elysia (embedded) | 1.1.x |
| **Backend (API)** | Elysia (standalone) | 1.1.x |
| **UI Components** | shadcn/ui + Tailwind CSS | latest |
| **Auth** | Better Auth + better-auth-ui | 1.x |
| **Database** | PostgreSQL + Drizzle ORM | Drizzle 0.44.x |
| **Cache** | Redis + ioredis | 5.x |
| **Queue** | BullMQ | 5.x |
| **Charts** | Recharts (via shadcn) | 2.x |
| **Tables** | TanStack Table | 8.x |

---

## 3. Struktur Folder Detail

```
paid-endpoint/
├── .github/
│   └── workflows/
│       └── ci.yml                    # CI/CD pipeline
│
├── apps/
│   ├── web/                          # Next.js Web Portal
│   │   ├── app/
│   │   │   ├── (auth)/               # Auth pages (login, register)
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── register/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   │
│   │   │   ├── (portal)/             # User Portal (protected)
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx      # Usage stats, charts
│   │   │   │   ├── api-keys/
│   │   │   │   │   └── page.tsx      # Manage API keys
│   │   │   │   ├── logs/
│   │   │   │   │   └── page.tsx      # Request logs viewer
│   │   │   │   ├── subscription/
│   │   │   │   │   └── page.tsx      # Plan management
│   │   │   │   ├── settings/
│   │   │   │   │   └── page.tsx      # Account settings
│   │   │   │   └── layout.tsx        # Portal layout + sidebar
│   │   │   │
│   │   │   ├── (admin)/              # Admin Portal (protected + role)
│   │   │   │   ├── users/
│   │   │   │   │   └── page.tsx      # User management
│   │   │   │   ├── plans/
│   │   │   │   │   └── page.tsx      # Plan management
│   │   │   │   ├── analytics/
│   │   │   │   │   └── page.tsx      # System analytics
│   │   │   │   ├── logs/
│   │   │   │   │   └── page.tsx      # All logs monitoring
│   │   │   │   └── layout.tsx        # Admin layout
│   │   │   │
│   │   │   ├── api/
│   │   │   │   └── [[...slugs]]/
│   │   │   │       └── route.ts      # Elysia handler
│   │   │   │
│   │   │   ├── layout.tsx            # Root layout
│   │   │   ├── page.tsx              # Landing page
│   │   │   └── globals.css           # Tailwind imports
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── data-table.tsx
│   │   │   │   └── ...
│   │   │   ├── auth/                 # Auth-related components
│   │   │   ├── dashboard/            # Dashboard widgets
│   │   │   ├── admin/                # Admin-specific components
│   │   │   └── shared/               # Shared components
│   │   │
│   │   ├── lib/
│   │   │   ├── auth-client.ts        # Better Auth client
│   │   │   ├── elysia/
│   │   │   │   ├── index.ts          # Main Elysia app
│   │   │   │   ├── routes/
│   │   │   │   │   ├── auth.ts       # Auth endpoints
│   │   │   │   │   ├── dashboard.ts  # Dashboard API
│   │   │   │   │   ├── api-keys.ts   # API key management
│   │   │   │   │   └── admin.ts      # Admin endpoints
│   │   │   │   └── middleware/
│   │   │   │       └── auth.ts       # Auth middleware
│   │   │   └── utils.ts
│   │   │
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                          # Public API Gateway
│       ├── src/
│       │   ├── index.ts              # Entry point
│       │   ├── routes/
│       │   │   ├── proxy.ts          # Proxy handler
│       │   │   └── usage.ts          # Usage endpoint
│       │   ├── middleware/
│       │   │   ├── auth.ts           # API Key auth
│       │   │   └── rate-limit.ts     # Rate limiting
│       │   └── services/
│       │       └── redis.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── database/                     # Shared database package
│   │   ├── src/
│   │   │   ├── index.ts              # Drizzle client export
│   │   │   ├── schema/
│   │   │   │   ├── index.ts          # All schema exports
│   │   │   │   ├── clients.ts        # Existing clients table
│   │   │   │   ├── plans.ts          # Existing plans table
│   │   │   │   ├── api-keys.ts       # Existing api_keys table
│   │   │   │   ├── request-logs.ts   # Existing logs tables
│   │   │   │   ├── auth.ts           # Better Auth tables
│   │   │   │   └── portal.ts         # New portal tables
│   │   │   └── migrations/
│   │   ├── drizzle.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── auth/                         # Better Auth config
│   │   ├── src/
│   │   │   ├── index.ts              # Auth instance
│   │   │   ├── client.ts             # Client-side auth
│   │   │   └── server.ts             # Server-side auth
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── types/                        # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── api.ts                # API types
│   │   │   ├── database.ts           # DB types
│   │   │   └── auth.ts               # Auth types
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── config/                       # Shared configurations
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
│
├── turbo.json                        # Turborepo config
├── package.json                      # Root package.json
├── bun.lockb
├── .env                              # Environment variables
├── .env.example
├── .gitignore
└── README.md
```

---

## 4. Skema Database Updates

### 4.1 Tabel Baru untuk Better Auth

```typescript
// packages/database/src/schema/auth.ts
import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

/**
 * Tabel user untuk Better Auth
 * Menggantikan tabel 'clients' untuk autentikasi web
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"), // 'user' | 'admin'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Session table untuk Better Auth
 */
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Account table untuk OAuth providers
 */
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(), // 'credential' | 'google' | 'github'
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"), // Untuk credential provider (hashed)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Verification tokens untuk email verification
 */
export const verifications = pgTable("verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(), // email atau userId
  value: text("value").notNull(), // verification code/token
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### 4.2 Modifikasi Tabel Existing

```typescript
// packages/database/src/schema/clients.ts (MODIFIED)

/**
 * Tabel clients sekarang ter-link ke users (untuk backward compatibility)
 * Client = User yang memiliki API keys
 */
export const clients = pgTable("clients", {
  clientId: uuid("client_id").primaryKey().defaultRandom(),
  
  // NEW: Link ke Better Auth user
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Existing fields (untuk backward compatibility)
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

### 4.3 Tabel Baru untuk Portal

```typescript
// packages/database/src/schema/portal.ts

/**
 * User preferences / settings
 */
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  theme: varchar("theme", { length: 20 }).default("system"), // 'light' | 'dark' | 'system'
  emailNotifications: boolean("email_notifications").default(true),
  webhookUrl: text("webhook_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Audit log untuk admin actions
 */
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id"),
  metadata: jsonb("metadata"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("audit_user_id_idx").on(table.userId),
  createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
}));
```

### 4.4 Migration Strategy

```
Existing Schema          Better Auth Schema          New Portal Schema
     │                         │                           │
     │    ┌────────────────────┴───────────────────┐       │
     │    │                                        │       │
     ▼    ▼                                        ▼       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Combined Schema v2                          │
│                                                                 │
│  clients (modified: +userId FK) ◄───────────► users (new)      │
│  plans (unchanged)                            sessions (new)    │
│  api_keys (unchanged)                         accounts (new)    │
│  request_logs (unchanged)                     verifications     │
│  log_summaries (unchanged)                    user_preferences  │
│                                               audit_logs        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. API Routes Plan

### 5.1 Web Portal Backend (Elysia in Next.js)

**Base Path:** `/api`

```typescript
// Auth Routes (via Better Auth)
POST   /api/auth/sign-up              # Register user
POST   /api/auth/sign-in/email        # Login with email
POST   /api/auth/sign-in/social       # Social login
POST   /api/auth/sign-out             # Logout
GET    /api/auth/session              # Get current session
POST   /api/auth/forgot-password      # Request password reset
POST   /api/auth/reset-password       # Reset password
POST   /api/auth/verify-email         # Verify email

// Dashboard Routes
GET    /api/dashboard/stats           # Usage statistics
GET    /api/dashboard/chart-data      # Chart data (time series)

// API Key Management
GET    /api/keys                      # List user's API keys
POST   /api/keys                      # Generate new API key
GET    /api/keys/:id                  # Get key details
DELETE /api/keys/:id                  # Revoke API key
PATCH  /api/keys/:id                  # Update key (rename, etc)

// Request Logs
GET    /api/logs                      # Get request logs (paginated)
GET    /api/logs/:id                  # Get log detail
GET    /api/logs/export               # Export logs (CSV/JSON)

// Subscription
GET    /api/subscription              # Get current subscription
GET    /api/plans                     # List available plans
POST   /api/subscription/upgrade      # Upgrade plan

// Settings
GET    /api/settings                  # Get user settings
PATCH  /api/settings                  # Update settings
DELETE /api/account                   # Delete account

// Admin Routes (role: admin)
GET    /api/admin/users               # List all users
GET    /api/admin/users/:id           # Get user detail
PATCH  /api/admin/users/:id           # Update user
DELETE /api/admin/users/:id           # Delete user
GET    /api/admin/analytics           # System-wide analytics
GET    /api/admin/logs                # All request logs
GET    /api/admin/plans               # Manage plans
POST   /api/admin/plans               # Create plan
PATCH  /api/admin/plans/:id           # Update plan
GET    /api/admin/api-keys            # All API keys
POST   /api/admin/api-keys/:id/revoke # Force revoke key
```

### 5.2 Public API Gateway (Standalone Elysia)

**Port:** 9990 (sama seperti sekarang)

```typescript
// Health check
GET    /health                        # Health check

// Usage (authenticated via API Key)
GET    /user/usage                    # Get rate limit usage

// Proxy (authenticated + rate limited)
ALL    /proxy/*                       # Proxy to upstream API
```

---

## 6. Authentication Flow

### 6.1 Web Portal (Better Auth)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │     │   Next.js   │     │   Better    │
│             │     │   + Elysia  │     │    Auth     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │  1. POST /api/auth/sign-in/email     │
       │─────────────────────────────────────►│
       │                   │                   │
       │                   │  2. Validate      │
       │                   │     credentials   │
       │                   │◄──────────────────│
       │                   │                   │
       │  3. Set session cookie               │
       │◄─────────────────────────────────────│
       │                   │                   │
       │  4. Redirect to /dashboard           │
       │◄──────────────────│                   │
       │                   │                   │
       │  5. GET /dashboard (with cookie)     │
       │──────────────────►│                   │
       │                   │                   │
       │                   │  6. Verify        │
       │                   │     session       │
       │                   │──────────────────►│
       │                   │◄──────────────────│
       │                   │                   │
       │  7. Render protected page            │
       │◄──────────────────│                   │
```

### 6.2 Public API (API Key)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Elysia    │     │  Upstream   │
│   App       │     │   Gateway   │     │    API      │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │  1. Request + X-API-Key header       │
       │──────────────────►│                   │
       │                   │                   │
       │                   │  2. Hash key,    │
       │                   │     lookup DB     │
       │                   │                   │
       │                   │  3. Check rate   │
       │                   │     limit (Redis) │
       │                   │                   │
       │                   │  4. Proxy request │
       │                   │──────────────────►│
       │                   │◄──────────────────│
       │                   │                   │
       │                   │  5. Log request  │
       │                   │     (async)       │
       │                   │                   │
       │  6. Response with rate limit headers │
       │◄──────────────────│                   │
```

### 6.3 Hubungan User ↔ Client ↔ API Keys

```
┌─────────────────────────────────────────────────────────────┐
│                        users (Better Auth)                   │
│  id: uuid                                                    │
│  email: "john@example.com"                                   │
│  role: "user"                                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:1
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          clients                             │
│  client_id: uuid                                             │
│  user_id: uuid (FK → users.id)  ← NEW COLUMN                │
│  name: "John Doe"                                            │
│  email: "john@example.com"                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         api_keys                             │
│  key_id: uuid                                                │
│  client_id: uuid (FK → clients.client_id)                   │
│  plan_id: varchar (FK → plans.plan_id)                      │
│  key_hash: varchar                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Implementasi Phase-by-Phase

### Phase 1: Foundation Setup (Wave 1)

| Task | Deskripsi | Dependencies | Est. Time |
|------|-----------|--------------|-----------|
| 1.1 | Setup Turborepo monorepo structure | None | 2 jam |
| 1.2 | Migrasi existing code ke `packages/database` | 1.1 | 2 jam |
| 1.3 | Setup `packages/types` | 1.1 | 1 jam |
| 1.4 | Setup shared Tailwind/ESLint config | 1.1 | 1 jam |

### Phase 2: Database & Auth (Wave 2)

| Task | Deskripsi | Dependencies | Est. Time |
|------|-----------|--------------|-----------|
| 2.1 | Tambah Better Auth tables ke schema | 1.2 | 2 jam |
| 2.2 | Modifikasi `clients` table (add userId) | 2.1 | 1 jam |
| 2.3 | Setup `packages/auth` dengan Better Auth | 2.1 | 3 jam |
| 2.4 | Generate dan run migrations | 2.2 | 1 jam |
| 2.5 | Data migration script (existing clients) | 2.4 | 2 jam |

### Phase 3: Web Portal - Core (Wave 3)

| Task | Deskripsi | Dependencies | Est. Time |
|------|-----------|--------------|-----------|
| 3.1 | Setup `apps/web` Next.js + Tailwind | 2.3 | 2 jam |
| 3.2 | Install & setup shadcn/ui | 3.1 | 1 jam |
| 3.3 | Setup Elysia in Next.js API routes | 3.1 | 2 jam |
| 3.4 | Integrate Better Auth dengan Elysia | 3.3 | 3 jam |
| 3.5 | Auth pages (login, register) | 3.4 | 4 jam |
| 3.6 | Auth middleware & session handling | 3.4 | 2 jam |

### Phase 4: User Portal Features (Wave 3 - Parallel)

| Task | Deskripsi | Dependencies | Est. Time |
|------|-----------|--------------|-----------|
| 4.1 | Portal layout dengan sidebar | 3.2 | 3 jam |
| 4.2 | Dashboard page (stats, charts) | 4.1, 3.3 | 4 jam |
| 4.3 | API Keys management page | 4.1, 3.3 | 4 jam |
| 4.4 | Request logs viewer | 4.1, 3.3 | 3 jam |
| 4.5 | Subscription/Plan page | 4.1, 3.3 | 3 jam |
| 4.6 | Account settings | 4.1, 3.3 | 2 jam |

### Phase 5: Admin Portal (Wave 3 - Parallel with Phase 4)

| Task | Deskripsi | Dependencies | Est. Time |
|------|-----------|--------------|-----------|
| 5.1 | Admin layout (separate sidebar) | 3.2, 3.6 | 2 jam |
| 5.2 | User management (CRUD) | 5.1, 3.3 | 4 jam |
| 5.3 | Plan management | 5.1, 3.3 | 3 jam |
| 5.4 | System analytics dashboard | 5.1, 3.3 | 4 jam |
| 5.5 | All logs monitoring | 5.1, 3.3 | 3 jam |
| 5.6 | Admin audit logging | 5.1 | 2 jam |

### Phase 6: Public API Gateway (Wave 4)

| Task | Deskripsi | Dependencies | Est. Time |
|------|-----------|--------------|-----------|
| 6.1 | Setup `apps/api` Elysia | 1.2 | 2 jam |
| 6.2 | Migrate proxy logic dari Hono | 6.1 | 2 jam |
| 6.3 | Migrate auth middleware | 6.1 | 1 jam |
| 6.4 | Migrate rate limiting | 6.1 | 1 jam |
| 6.5 | Migrate usage endpoint | 6.1 | 1 jam |
| 6.6 | Migrate log retention job | 6.1 | 2 jam |
| 6.7 | Integration testing | 6.2-6.6 | 3 jam |

### Phase 7: Integration & Polish (Wave 4 - Final)

| Task | Deskripsi | Dependencies | Est. Time |
|------|-----------|--------------|-----------|
| 7.1 | Eden Treaty setup untuk type safety | 4.*, 5.* | 2 jam |
| 7.2 | Error handling & loading states | 4.*, 5.* | 3 jam |
| 7.3 | Responsive design check | 4.*, 5.* | 2 jam |
| 7.4 | E2E testing critical flows | All | 4 jam |
| 7.5 | Documentation | All | 3 jam |
| 7.6 | Deployment configuration | All | 3 jam |

---

## 8. Execution Strategy - Parallel Waves

```
Wave 1 (Start Immediately):
├── Task 1.1: Setup Turborepo [no dependencies]
├── Task 1.2: Migrate database package [depends: 1.1]
├── Task 1.3: Setup types package [depends: 1.1]
└── Task 1.4: Setup shared configs [depends: 1.1]

Wave 2 (After Wave 1):
├── Task 2.1-2.5: Database & Auth setup [depends: 1.2]
└── Task 6.1: Setup apps/api skeleton [depends: 1.2]

Wave 3 (After Wave 2 - PARALLEL):
├── GROUP A: Web Portal Core (3.1-3.6)
├── GROUP B: User Portal Features (4.1-4.6) [after 3.2, 3.3]
├── GROUP C: Admin Portal (5.1-5.6) [after 3.2, 3.6]
└── GROUP D: Public API Migration (6.2-6.7) [after 6.1]

Wave 4 (After Wave 3):
└── Integration & Polish (7.1-7.6)

Critical Path: 1.1 → 1.2 → 2.1 → 2.4 → 3.1 → 3.3 → 4.2 → 7.4
Parallel Speedup: ~50% faster than sequential
```

---

## 9. Key Considerations

### 9.1 Security

| Area | Mitigasi |
|------|----------|
| **API Key Storage** | Tetap gunakan SHA-256 hash, jangan simpan raw key |
| **Session Security** | Better Auth handles secure cookies, httpOnly, sameSite |
| **Rate Limiting** | Redis-based, per-key limits |
| **Admin Access** | Role-based middleware, audit logging |
| **CORS** | Configure allowed origins untuk API |
| **Input Validation** | Elysia's built-in validation dengan Zod/Typebox |

### 9.2 Migration dari Current State

```typescript
// Migration script: Link existing clients ke new users
async function migrateClientsToUsers() {
  const existingClients = await db.select().from(clients);
  
  for (const client of existingClients) {
    // 1. Create user dengan email yang sama
    const [newUser] = await db.insert(users).values({
      name: client.name,
      email: client.email,
      emailVerified: true, // Existing clients dianggap verified
      role: "user",
    }).returning();
    
    // 2. Update client untuk link ke user
    await db.update(clients)
      .set({ userId: newUser.id })
      .where(eq(clients.clientId, client.clientId));
      
    // 3. Create credential account untuk Better Auth
    await db.insert(accounts).values({
      userId: newUser.id,
      accountId: newUser.id,
      providerId: "credential",
      // Password perlu di-set manual atau via forgot password
    });
  }
}
```

### 9.3 Deployment Architecture

```
Production Deployment Options:

Option A: Single VPS / Container
┌────────────────────────────────────────┐
│  VPS / Container                       │
│  ├── Web Portal (Next.js) → port 3000  │
│  ├── Public API (Elysia)  → port 9990  │
│  ├── PostgreSQL           → port 5432  │
│  └── Redis                → port 6379  │
└────────────────────────────────────────┘

Option B: Separate Services (Recommended untuk scale)
┌───────────────┐  ┌───────────────┐
│  Vercel       │  │  VPS/Railway  │
│  (Web Portal) │  │  (Public API) │
└───────┬───────┘  └───────┬───────┘
        │                  │
        └────────┬─────────┘
                 │
        ┌────────▼────────┐
        │  Managed DB     │
        │  (Neon/Supabase)│
        └─────────────────┘
                 │
        ┌────────▼────────┐
        │  Redis Cloud    │
        │  (Upstash)      │
        └─────────────────┘
```

### 9.4 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/paid_endpoint

# Redis
REDIS_URL=redis://localhost:6379

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_PUBLIC_API_URL=http://localhost:9990

# Public API
UPSTREAM_API_URL=https://your-upstream-api.com
PUBLIC_API_PORT=9990

# Optional: Social Auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

---

## 10. File Referensi untuk Migrasi

| File Saat Ini | Tujuan Migrasi | Notes |
|---------------|----------------|-------|
| `src/db/schema.ts` | `packages/database/src/schema/*` | Split ke multiple files |
| `src/db/drizzle.ts` | `packages/database/src/index.ts` | Export db instance |
| `src/middlewares/auth.ts` | `apps/api/src/middleware/auth.ts` | Adapt untuk Elysia |
| `src/middlewares/rate-limit.ts` | `apps/api/src/middleware/rate-limit.ts` | Adapt untuk Elysia |
| `src/services/redis.ts` | `packages/database/src/redis.ts` | Shared redis client |
| `src/jobs/log-retention.ts` | `apps/api/src/jobs/log-retention.ts` | Tetap di API service |
| `src/index.ts` | `apps/api/src/index.ts` | Rewrite dengan Elysia |

---

## 11. Definition of Done

### Must Have (MVP)
- [ ] User dapat register dan login via web portal
- [ ] User dapat melihat dashboard dengan usage stats
- [ ] User dapat generate, view, dan revoke API keys
- [ ] User dapat melihat request logs
- [ ] Public API tetap berfungsi dengan API key existing
- [ ] Admin dapat manage users dan melihat analytics

### Must NOT Have (Guardrails)
- [ ] JANGAN ubah format API key yang ada (backward compatible)
- [ ] JANGAN hapus data existing tanpa migration script
- [ ] JANGAN deploy tanpa testing auth flows
- [ ] JANGAN expose internal errors ke client

### Verification Commands
```bash
# Run all apps
bun run dev

# Test web portal
curl http://localhost:3000/api/auth/session

# Test public API
curl -H "X-API-Key: your-key" http://localhost:9990/user/usage

# Run migrations
bun run db:migrate

# Run tests
bun run test
```

---

## Lampiran A: Elysia Integration Code Examples

### A.1 Elysia Handler di Next.js

```typescript
// apps/web/app/api/[[...slugs]]/route.ts
import { Elysia } from 'elysia'
import { authRoutes } from '@/lib/elysia/routes/auth'
import { dashboardRoutes } from '@/lib/elysia/routes/dashboard'
import { adminRoutes } from '@/lib/elysia/routes/admin'

const app = new Elysia({ prefix: '/api' })
  .use(authRoutes)
  .use(dashboardRoutes)
  .use(adminRoutes)

export const GET = app.fetch
export const POST = app.fetch
export const PUT = app.fetch
export const DELETE = app.fetch
export const PATCH = app.fetch

// Export type untuk Eden Treaty
export type App = typeof app
```

### A.2 Better Auth dengan Elysia

```typescript
// packages/auth/src/index.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@repo/database";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});

// apps/web/lib/elysia/routes/auth.ts
import { Elysia } from 'elysia'
import { auth } from '@repo/auth'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .all('/*', async ({ request }) => {
    return auth.handler(request)
  })
```

### A.3 Protected Route Middleware

```typescript
// apps/web/lib/elysia/middleware/auth.ts
import { Elysia } from 'elysia'
import { auth } from '@repo/auth'

export const authMiddleware = new Elysia()
  .derive(async ({ request, set }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    })
    
    if (!session) {
      set.status = 401
      throw new Error('Unauthorized')
    }
    
    return { user: session.user, session: session.session }
  })

export const adminMiddleware = new Elysia()
  .use(authMiddleware)
  .derive(({ user, set }) => {
    if (user.role !== 'admin') {
      set.status = 403
      throw new Error('Forbidden')
    }
    return { user }
  })
```

---

## Lampiran B: shadcn/ui Components Needed

```bash
# Base components
bunx shadcn-ui@latest add button
bunx shadcn-ui@latest add card
bunx shadcn-ui@latest add input
bunx shadcn-ui@latest add label
bunx shadcn-ui@latest add form

# Navigation
bunx shadcn-ui@latest add sidebar
bunx shadcn-ui@latest add navigation-menu
bunx shadcn-ui@latest add breadcrumb

# Data display
bunx shadcn-ui@latest add table
bunx shadcn-ui@latest add data-table  # TanStack Table wrapper
bunx shadcn-ui@latest add badge
bunx shadcn-ui@latest add avatar

# Charts
bunx shadcn-ui@latest add chart  # Recharts wrapper

# Feedback
bunx shadcn-ui@latest add toast
bunx shadcn-ui@latest add alert
bunx shadcn-ui@latest add skeleton

# Overlay
bunx shadcn-ui@latest add dialog
bunx shadcn-ui@latest add dropdown-menu
bunx shadcn-ui@latest add sheet
bunx shadcn-ui@latest add popover

# Form elements
bunx shadcn-ui@latest add select
bunx shadcn-ui@latest add switch
bunx shadcn-ui@latest add tabs
```

---

*Plan ini dibuat oleh Prometheus pada Februari 2026*
*Untuk memulai eksekusi, jalankan: `/start-work`*
