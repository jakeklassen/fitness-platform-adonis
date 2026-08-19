# Google Health Webhooks Guide

How the Google Health push-notification pipeline works, and how to (re)register the
subscriber for local development and production.

## Overview

Google Health notifies us when a linked user's data changes; we then read the
changed range from the Health API.

```
Google → POST /webhooks/google → verify Authorization + X-HEALTHAPI-SIGNATURE
       → ProcessGoogleHealthNotificationJob (queue: google)
       → map healthUserId → ProviderAccount → GoogleHealthService reads steps
```

| Piece | File |
|---|---|
| Receiver route (CSRF-exempt) | `start/routes.ts` → `POST /webhooks/google` |
| Controller (handshake, auth, signature, dispatch) | `app/controllers/google_webhook_controller.ts` |
| Signature verifier (Tink, `node:crypto`) | `app/services/google_health_webhook_verifier.ts` |
| Notification job | `app/jobs/process_google_health_notification_job.ts` |
| Read service | `app/services/google_health_service.ts` |
| Subscriber registration command | `commands/google_create_subscriber.ts` |

## The subscriber model

- A **subscriber** is a **project-level singleton** (one per environment) that registers
  our endpoint URL + auth secret with Google. We always use the fixed id `fitness-platform`.
- **Subscriptions** are per-user and created automatically (the subscriber uses the
  `AUTOMATIC` policy) when a user consents by connecting Google.
- Registration is **not** implicit — you must call `google:create-subscriber` once per
  environment (and again if the endpoint URL changes). It is **idempotent**: it lists
  existing subscribers, creates if missing, and patches on drift. Re-running with the same
  URL is a no-op; there is nothing to clean up (it patches the one subscriber in place).

## Prerequisites

1. **`GOOGLE_WEBHOOK_SECRET`** — a secret *you* choose (full `Authorization` header value,
   e.g. `Bearer <random>`). Google echoes it back on every webhook; the receiver checks it.
2. **Service-account credentials** for subscriber management (cloud-platform scope). The
   service account needs the **`Health Editor`** (`roles/health.editor`) IAM role (least
   privilege that can create subscribers). Provide it either as:
   - `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`, or
   - `GOOGLE_SERVICE_ACCOUNT_KEY` = the key JSON inline (e.g. injected by `op run`, so no
     file touches disk).
3. The user must have granted the **`activity_and_fitness.readonly`** scope (reconnect
   Google) so `getIdentity` + reads work; the callback stores the Health user id as
   the account's `provider_user_id`.

## Local development / testing

Google POSTs to a **public HTTPS URL**, so `localhost` alone won't receive anything — you
need a tunnel.

```bash
# 1. app (server + worker) — `dev` runs both via concurrently
cd packages/platform
node ace migration:run          # once, to set up the schema
pnpm dev                        # server (HMR) + worker on queues fitbit,google

# 2. tunnel to the dev server (separate terminal)
cloudflared tunnel --url http://localhost:3333   # prints https://<random>.trycloudflare.com
```

Then register the subscriber and connect:

```bash
# 3. register (or re-register) the subscriber for the current tunnel URL
GOOGLE_SERVICE_ACCOUNT_KEY="op://Private/health-webhook-sa/credential" \
  op run -- node ace google:create-subscriber \
  https://<random>.trycloudflare.com/webhooks/google
```

4. Reconnect Google at `/profile` (stores `healthUserId`, and `AUTOMATIC` policy attaches
   your subscription).
5. Sync steps in the Google Health / Fitbit app → watch the worker log
   `[Google Webhook] Fetched steps for changed range`.

### Re-registering (quick tunnels rotate)

`cloudflared tunnel --url …` mints a **new random URL every restart**. When it changes,
just re-run step 3 with the new URL — the idempotent command `patch`es the existing
subscriber's `endpointUri` (Google re-verifies the endpoint, so the server + tunnel must be
up). Use `--force` to re-apply / rotate the secret when nothing else changed.

A **named tunnel** (requires a domain on your Cloudflare account) gives a stable hostname, so
you register once and never re-run. Restrict its ingress to `/webhooks/*` and rely on the
secret + signature (do **not** put Cloudflare Access in front of the webhook path — Google
can't authenticate through it).

## Production

Treat `google:create-subscriber <stable-https-url>` like a migration: run it as a **deploy
step** (it's idempotent, so it no-ops when unchanged, patches on drift). Don't run it on web
boot — Google verifies the endpoint by calling back during the request, and the web tier
shouldn't hold subscriber-admin credentials.

## Gotchas (learned the hard way)

- **Signature header is `X-HEALTHAPI-SIGNATURE`**, not the `GOOGLE-HEALTH-API-SIGNATURE` the
  docs page states. The live request is the source of truth.
- **The notification body is a JSON array** of `{ data: {...} }` envelopes (like Fitbit),
  not a single object. Each element is dispatched as its own job.
- **`intervals[]` vary in shape** (physical/civil/…); `physicalTimeInterval` is optional, so
  one odd interval doesn't fail validation for the whole batch.
- **The worker does not hot-reload.** HMR only watches controllers + middleware. After
  editing a **job or service**, restart `pnpm dev` or the worker keeps running stale code.
- **`healthUserId` ≠ the OAuth `sub`.** It comes from `getIdentity` and is stored as the
  account's `provider_user_id` (the generic per-provider id — no Google-specific column),
  so notifications map to accounts the same way FitBit's do.
