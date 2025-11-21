# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fitness Platform is an AdonisJS v6 application that allows users to create accounts, link fitness provider accounts (starting with FitBit), and participate in simple fitness competitions. The primary use case is workplace step challenges where employees compete monthly.

The platform uses FitBit subscriptions to receive notifications when new user data is available, then fetches and stores time-series fitness metrics (steps, etc.) from potentially multiple providers per user.

## Monorepo Structure

This is a pnpm workspace monorepo with the following packages:

- `packages/platform` - Main AdonisJS application
- `packages/adonis-ally-fitbit` - Custom AdonisJS Ally driver for FitBit OAuth2

## Development Commands

All commands should be run from `packages/platform/` unless otherwise specified:

```bash
# Development server with HMR
pnpm dev

# Build for production
pnpm build

# Run production server
pnpm start

# Run tests
pnpm test

# Linting and formatting
pnpm lint
pnpm format
pnpm typecheck

# Database migrations
node ace migration:run
node ace migration:rollback
node ace migration:fresh

# Generate new migration
node ace make:migration <name>
```

## Architecture

### Database Models

The application uses PostgreSQL with Lucid ORM. Two core models:

- **User** (`app/models/user.ts`) - Standard user with email/password auth using AdonisJS Auth with Scrypt hashing
- **Account** (`app/models/account.ts`) - Linked OAuth provider accounts (e.g., FitBit)
  - Relationship: User has many Accounts
  - **Critical**: Access and refresh tokens are automatically encrypted/decrypted using AdonisJS Encryption service via Lucid column hooks
  - The APP_KEY environment variable is the master encryption key - never commit or share production APP_KEY

### OAuth Integration & Token Management

The platform implements secure OAuth2 flow for FitBit:

1. **Custom Ally Driver** (`packages/adonis-ally-fitbit/src/driver.ts`)
   - Implements FitBit OAuth2 with PKCE (Proof Key for Code Exchange)
   - Handles PKCE code verifier/challenge generation
   - Uses Basic Auth for token exchange
   - FitBit does not provide email in profile endpoint
   - Supports multiple scopes (activity, heartrate, sleep, etc.)

2. **Token Refresh Service** (`app/services/fitbit_token_refresh_service.ts`)
   - Automatically refreshes expired access tokens using refresh tokens
   - Considers tokens expired if they expire within 5 minutes (safety buffer)
   - Updates Account model with new tokens after refresh
   - Used by FitbitService to ensure valid tokens before API calls

3. **FitBit Service** (`app/services/fitbit_service.ts`)
   - High-level service for FitBit API interactions
   - Automatically handles token refresh before making API calls
   - Gracefully handles missing or invalid accounts

### Frontend Stack

- **Inertia.js** with React 19
- **Vite** for asset bundling
- **TypeScript** throughout
- Pages located in `packages/platform/inertia/pages/`
- Hot module replacement configured via `hot-hook` package

### Path Aliases

The platform uses TypeScript path aliases (configured in package.json `imports`):

```typescript
#controllers/*  -> ./app/controllers/*.js
#models/*        -> ./app/models/*.js
#services/*      -> ./app/services/*.js
#dtos/*          -> ./app/dtos/*.js
#validators/*    -> ./app/validators/*.js
#middleware/*    -> ./app/middleware/*.js
#config/*        -> ./config/*.js
#start/*         -> ./start/*.js
#database/*      -> ./database/*.js
// ... and more
```

### Scheduled Tasks

The platform uses `adonisjs-scheduler` configured in `start/scheduler.ts`. Jobs run in the `console` environment only (see `adonisrc.ts` providers and preloads).

### Development Tools

- **Lens** (@lensjs/adonis) - Development debugging tool configured in `config/lens.ts`
  - Watchers for requests, exceptions, and database queries
  - Available at `/lens` path when enabled
  - Hides sensitive params (passwords, tokens, authorization headers)
  - Uses SQLite database (`lens.db`) for storing debug data

### Authentication & Authorization

- Session-based authentication using AdonisJS Auth
- Middleware: `auth`, `guest`, `silentAuth`
- Routes organized by authentication status in `start/routes.ts`
- VineJS validators for registration and login in `app/validators/auth/`

### Testing

Test suites configured in `adonisrc.ts`:
- **Unit tests**: `tests/unit/**/*.spec.ts` (2s timeout)
- **Functional tests**: `tests/functional/**/*.spec.ts` (30s timeout)

Use Japa test runner with AdonisJS plugin.

## Security Considerations

1. **Token Encryption**: OAuth tokens MUST be encrypted at rest. The Account model handles this automatically via column hooks. Never bypass this by writing raw SQL.

2. **APP_KEY Protection**:
   - Never commit `.env` to git
   - Use secret managers (Doppler, AWS Secrets Manager, etc.) for production
   - APP_KEY is used for encryption service - loss means encrypted data becomes unrecoverable

3. **Token Storage Strategy**:
   - Store both access and refresh tokens for offline API access
   - Refresh tokens enable background jobs to fetch user data when they're not actively logged in

## Common Patterns

### Adding a New OAuth Provider

1. Create a custom Ally driver in `packages/` similar to `adonis-ally-fitbit`
2. Configure in `config/ally.ts`
3. Add environment variables in `start/env.ts`
4. Create service class similar to `FitbitService` if token refresh logic is needed
5. Create controller for OAuth redirect/callback routes

### Working with Encrypted Tokens

The Account model automatically handles encryption/decryption:

```typescript
// Reading - automatically decrypted
const token = account.accessToken;

// Writing - automatically encrypted
account.accessToken = 'new_token';
await account.save();
```

Never access the raw encrypted values directly from the database.

### Token Refresh Pattern

```typescript
const tokenRefreshService = new FitbitTokenRefreshService();
const validToken = await tokenRefreshService.getValidAccessToken(account);
// Returns null if refresh fails, otherwise returns valid access token
```

## Configuration Files

Key configuration files in `packages/platform/config/`:
- `ally.ts` - OAuth provider configuration
- `database.ts` - PostgreSQL connection (debug mode enabled)
- `app.ts` - Core AdonisJS app config with experimental flags
- `lens.ts` - Development debugging tool
