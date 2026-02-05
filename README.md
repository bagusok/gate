# Gate - API Portal Platform

A comprehensive API gateway and portal platform for selling API access.

## Architecture

```
gate/
├── apps/
│   ├── web/          # Next.js Web Portal (User + Admin)
│   └── api/          # Hono Public API Gateway
├── packages/
│   ├── database/     # Drizzle ORM + PostgreSQL
│   ├── auth/         # Better Auth configuration
│   └── types/        # Shared TypeScript types
├── biome.json        # Biome linter/formatter config
├── ecosystem.config.js # PM2 deployment config
└── turbo.json        # Turborepo configuration
```

## Tech Stack

- **Runtime**: Bun
- **Monorepo**: Turborepo
- **Web Framework**: Next.js 16 + Hono
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: Better Auth
- **Database**: PostgreSQL + Drizzle ORM
- **Cache**: Redis + ioredis
- **Queue**: BullMQ
- **Linting/Formatting**: Biome
- **Git Hooks**: Husky + lint-staged

## Prerequisites

- Bun >= 1.1.x
- PostgreSQL
- Redis
- PM2 (for production deployment)

## Getting Started

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your database and Redis credentials
```

### 3. Setup database

```bash
# Generate migrations
bun run db:generate

# Push schema to database
bun run db:push

# Seed initial data
bun run db:seed
```

### 4. Start development servers

```bash
# Start all services
bun run dev

# Or start individually:
bun run dev:web   # Web Portal on http://localhost:3000
bun run dev:api   # API Gateway on http://localhost:9995
```

## Default Credentials

After seeding:

**Admin Account:**
- Email: admin@example.com
- Password: admin123

**Test User:**
- Email: test@example.com
- Password: test123

**Test API Key:**
- `pk_test_sample_api_key_for_testing_12345`

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start all development servers |
| `bun run dev:web` | Start Next.js web portal |
| `bun run dev:api` | Start Hono API gateway |
| `bun run build` | Build all apps |
| `bun run lint` | Run Biome linter |
| `bun run lint:fix` | Fix lint issues with Biome |
| `bun run format` | Format code with Biome |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:push` | Push schema to database |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run db:seed` | Seed database with initial data |

## Production Deployment (PM2)

```bash
# Build all apps first
bun run build

# Start all services with PM2
pm2 start ecosystem.config.js --env production

# Start individual services
pm2 start ecosystem.config.js --only api --env production
pm2 start ecosystem.config.js --only web --env production

# Monitor
pm2 monit

# View logs
pm2 logs

# Stop all
pm2 stop all
```

### Production Ports

| Service | Port |
|---------|------|
| API Gateway | 9995 |
| Web Portal | 9996 |

## Project URLs

### Development

| Service | URL |
|---------|-----|
| Web Portal | http://localhost:3000 |
| API Gateway | http://localhost:9995 |
| Drizzle Studio | http://localhost:4983 |

### Production

| Service | URL |
|---------|-----|
| Web Portal | http://localhost:9996 |
| API Gateway | http://localhost:9995 |

## API Gateway Endpoints

```
GET  /health           # Health check
GET  /user/usage       # Get rate limit usage (requires API key)
ALL  /proxy/*          # Proxy to upstream API (requires API key)
```

## Web Portal Routes

**Public:**
- `/` - Landing page
- `/login` - Login
- `/register` - Register

**User Portal:**
- `/dashboard` - Usage dashboard
- `/api-keys` - API key management
- `/logs` - Request logs
- `/subscription` - Plan management
- `/settings` - Account settings

**Admin Portal:**
- `/admin/users` - User management
- `/admin/plans` - Plan management
- `/admin/analytics` - System analytics
- `/admin/system-logs` - System logs
- `/admin/request-logs` - API request logs

## Code Quality

This project uses **Biome** for linting and formatting with automatic pre-commit hooks via **Husky** and **lint-staged**.

### VSCode Setup

The project includes recommended VSCode settings. Install the recommended extensions when prompted, or manually install:

1. **Biome** (`biomejs.biome`) - Required for formatting/linting
2. **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
3. **Path Intellisense** (`christian-kohler.path-intellisense`)

### Pre-commit Hooks

When you commit, Husky will automatically:
1. Run `lint-staged` which executes Biome on staged files
2. Auto-fix formatting and lint issues where possible
3. Block commit if there are unfixable errors
