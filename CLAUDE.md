# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fitness Platform is an AdonisJS v6 application for workplace step challenges. Users create accounts, link fitness providers (FitBit), add friends, and compete in monthly step competitions. The platform uses FitBit subscriptions to receive notifications, then fetches and stores time-series fitness metrics from potentially multiple providers per user.

## Monorepo Structure

pnpm workspace monorepo (pnpm 10.30.0, Node 24.13.1 — pinned in `mise.toml`):

- `packages/platform` — Main AdonisJS application
- `packages/adonis-ally-fitbit` — Custom AdonisJS Ally driver for FitBit OAuth2 with PKCE

## Development Commands

All commands run from `packages/platform/`:

```bash
pnpm dev                          # Dev server with HMR
pnpm build                        # Production build
pnpm start                        # Run production server
pnpm test                         # Run all tests (Japa runner)
node ace test --files "tests/unit/my_test.spec.ts"  # Run single test
pnpm lint                         # ESLint
pnpm format                       # Prettier
pnpm typecheck                    # Runs tsc twice: server + inertia/tsconfig.json

# Database
node ace migration:run
node ace migration:rollback
node ace migration:fresh
node ace make:migration <name>
node ace db:seed                  # Creates 6 test users with step data and competitions

# Custom ace commands
node ace sync:fitbit-steps        # Fetch today's steps for all linked accounts
node ace change:user-password <email>  # Interactive password reset
```

Infrastructure services via Docker Compose (from repo root):

```bash
docker compose up -d              # PostgreSQL 17.4 on :5432, Jaeger UI on :16686
```

## Architecture

### Data Flow: Two-Tier Step Storage

This is the most important architectural pattern to understand:

1. **Raw data** — `activity_steps` table stores per-provider step data (keyed by `account_id`), with `daily` or `intraday` granularity
2. **Aggregated data** — `daily_steps` table stores the canonical step count per user per day (keyed by `user_id`)
3. **Flow**: FitBit API → `activity_steps` → `StepsAggregationService` → `daily_steps`
4. **Competitions read from `daily_steps` only**

When multiple providers have data for the same day, conflict resolution priority: (1) user's `preferredStepsProviderId`, (2) most recent `synced_at`, (3) first in list.

### Database Models

PostgreSQL with Lucid ORM. 8 models in `app/models/`:

| Model | Purpose |
|---|---|
| `User` | Auth (Scrypt), relationships to everything. Has `preferredStepsProviderId` |
| `Provider` | Lookup table (`fitbit`, etc.) — seeded inside the migration file via `this.defer()`, not a seeder |
| `ProviderAccount` | Per-user per-provider OAuth tokens. Unique on `(user_id, provider_id)` and `(provider_id, provider_user_id)` |
| `ActivityStep` | Raw step data from provider. Unique on `(account_id, date, time)`. `time` is null for daily granularity |
| `DailyStep` | Aggregated canonical steps per user per day |
| `Competition` | Step competitions with `draft`/`active`/`ended` status, soft-delete via `deleted_at` |
| `CompetitionMember` | Join table with invitation workflow (`invited`/`accepted`/`declined`) |
| `Friendship` | Bidirectional friend requests (`pending`/`accepted`/`declined`). Single row per relationship |

**Critical**: `ProviderAccount` access/refresh tokens are encrypted at rest via `prepare`/`consume` callbacks on the `@column()` decorator using `@adonisjs/core/services/encryption`. The `APP_KEY` env var is the master encryption key — loss makes encrypted data unrecoverable.

### Services (`app/services/`)

| Service | Purpose |
|---|---|
| `FitbitService` | FitBit API interactions. Accepts optional `AllyService` param (required for `getUserData()`, not needed for background commands) |
| `FitbitTokenRefreshService` | Refreshes expired tokens (5-minute safety buffer) |
| `StepsAggregationService` | Merges `activity_steps` → `daily_steps` with multi-provider conflict resolution |
| `StepsBackfillService` | Fetches historical steps for a date range. Chunks in 30-day batches with 1s delay for rate limiting |
| `CompetitionService` | Leaderboard, invitations, status transitions, triggers backfills on invitation acceptance |

### Controllers & Routes

Routes in `start/routes.ts`, organized by auth status (`middleware.guest()` vs `middleware.auth()`):

- `AuthController` — Register, login, logout (session-based auth with remember-me tokens)
- `ProfilesController` — View profile, unlink provider accounts, set preferred provider
- `FitbitController` — OAuth redirect/callback
- `FriendsController` — Friend CRUD, email search (JSON endpoint), accept/decline
- `CompetitionsController` — Competition CRUD, invitation workflow (only accepted friends can be invited)

### Frontend Stack

- **Inertia.js** with **React 19**, **SSR enabled** (client: `inertia/app/app.tsx`, server: `inertia/app/ssr.tsx`)
- **shadcn/ui** component library (53 components in `inertia/components/ui/`, "new-york" style)
- **Tailwind CSS v4** with `@tailwindcss/vite` and `@tailwindcss/postcss`
- **Vite** for bundling
- Pages in `inertia/pages/`, custom error pages in `inertia/pages/errors/`
- Frontend path alias: `~/` → `inertia/` (configured in `inertia/tsconfig.json` and Vite)
- Forms: `react-hook-form` + `zod` v4 + `@hookform/resolvers`
- Charts: `recharts`; Toasts: `sonner`; Dark mode: `next-themes`
- Date handling: `luxon` (backend), `date-fns` (frontend)

**Shared Inertia props** (available on every page): `user` (authenticated user or null), `flash` (with `success`/`error` keys).

### Path Aliases (Backend)

Configured in `packages/platform/package.json` `imports` field:

```
#controllers/*  #models/*  #services/*  #dtos/*  #validators/*
#middleware/*  #exceptions/*  #providers/*  #config/*  #start/*
#database/*  #tests/*  #mails/*  #listeners/*  #events/*
#policies/*  #abilities/*
```

All resolve to `.js` extensions (ESM).

### Scheduled Tasks & Custom Commands

- `SyncFitbitSteps` (`commands/sync_fitbit_steps.ts`) — Uses `@schedule` decorator from `adonisjs-scheduler` (currently set to `everyMinute()`). Fetches steps, stores to `activity_steps`, aggregates to `daily_steps`.
- Scheduler preload and provider are `console` environment only (see `adonisrc.ts`)
- `ChangeUserPassword` — Admin CLI utility
- `RefreshFitbitTokens` — Stub, not yet implemented

### Observability

OpenTelemetry via `@adonisjs/otel`. The `otel.ts` bootstrap file is imported in `bin/server.ts`. Jaeger container in Docker Compose receives traces on ports 4317 (gRPC) / 4318 (HTTP), UI at port 16686.

### HMR Boundaries

`hot-hook` only watches `app/controllers/**/*.ts` and `app/middleware/*.ts`. Changes to models, services, or other files require a full server restart.

## Security Considerations

1. **Token encryption** is automatic via `ProviderAccount` column decorators — never bypass with raw SQL
2. **APP_KEY** is the master encryption key — never commit `.env`
3. Both access and refresh tokens are stored for offline/background API access

## Key Patterns

### Adding a New OAuth Provider

1. Create custom Ally driver package in `packages/`
2. Configure in `config/ally.ts` and `start/env.ts`
3. Create service class for API interactions and token refresh
4. Create controller for redirect/callback routes
5. Add routes to the authenticated group in `start/routes.ts`

### Working with Encrypted Tokens

```typescript
// Automatic — just read/write normally through the model
const token = account.accessToken;  // decrypted
account.accessToken = 'new_token';  // encrypted on save
await account.save();
```

### Token Refresh

```typescript
const refreshService = new FitbitTokenRefreshService();
const validToken = await refreshService.getValidAccessToken(account);
// Returns null if refresh fails
```

## Development Practices

### Workflow

All development work goes through GitHub issues, feature branches, and pull requests. Do not push directly to `main` unless explicitly granted permission. The flow is: issue → branch → PR → review → merge.

### Test-Driven Development

We follow TDD. Tests are required for feature development — write tests first, then implement. Use PGlite or Testcontainers for PostgreSQL in integration tests (no mocking the database).

### TypeScript

Lean into the type system. `any`, non-null assertions (`!`), and `@ts-ignore` are a last resort — there should almost always be a better way. Prefer `unknown` over `any`, narrow with type guards, and let inference do the work where types are obvious.

### Code Style

Write clean, non-claustrophobic code:

```typescript
// Good — breathing room, scannable
if (!account) {
  throw new Error('Account not found')
}

const token = await refreshService.getValidAccessToken(account)

if (!token) {
  return null
}

// Bad — cramped, hard to scan
if (!account) throw new Error('Account not found')
const token = await refreshService.getValidAccessToken(account)
if (!token) return null
```

- No single-line if/throw/return — give control flow its own block
- `return` and `throw` get their own line within a block for easy visual scanning
- Blank lines between logical sections
- Let the code breathe
