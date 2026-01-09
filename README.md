# Fitness Platform

The Fitness Platform project allows users to create accounts and link their fitness provider accounts for stat syncing. We only support Fitbit for now.

Afterwards, users are able to create and host simple competitions. As an example, at your job you may create a monthly steps challenge where the employee at the end of the month with the most steps wins. You would need to invite your colleagues to the competition. Simple, friendly competition to promote health.

## Time Series Data

We'll use steps for context.

We'll need to store fitness provider information in such a way that we can intermingle metric (steps, etc.) data from a users potentially multiple providers to give reasonably accurate data.

## Providers

### Fitbit

A Fitbit subscription is created for a user whenever they link their account (or updated if it already exists). This will periodically hit our webhook endpoint to notify us
that new data is available. Users can trigger this by manually syncing their devices, or it will happen roughly every 20~ minutes.

When the webhook is pinged, a queued job is created in the `webhook_queue` table. Steps are synced when that job runs.

For local testing you will need something like `Ngrok`. Add your URL to the `allowedHosts` array in `vite.config.ts`.

Example (you can omit the `https://` part):

```typescript
server: {
  allowedHosts: ['8c7c674bc069.ngrok-free.app'],
},
```

You will of course also need to register the endpoint with your local Fitbit app. On the dev website, edit your app settings and add a new
subscriber endpoint. The URL should be something like (using Ngrok for example):

```
https://0123456789.ngrok-free.app/webhooks/fitbit
```

Save your settings. You will see a verification code on your endpoint. Copy that and update the `FITBIT_SUBSCRIBER_VERIFICATION_CODE` value
in the `.env` file. Then click the `verify` button on the endpoint.

Don't forget to run the queue:

```shell
node ace process:webhook:queue
```

You should have the local app running, Ngrok or something like it exposing the app, and the webhook job queue running. Sync your device manually and you
should see the database update.

## Open Telemetry

We use [Adonis' native otel](https://docs.adonisjs.com/guides/digging-deeper/open-telemetry) support.

During development we use Jaeger UI to show the trace reporting.

The Jaeger UI can be accessed from http://localhost:16686

### Dark Mode Issue

There is currently an annoying [bug](https://github.com/jaegertracing/jaeger-ui/issues/3203) with Jaeger UI mixing light and dark mode. If you open the dev tools and enter:

```js
localStorage.setItem("jaeger-ui-theme", "light");
location.reload();
```

This will get rid of it.
