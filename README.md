# Fitness Platform

The Fitness Platform project allows users to create accounts and link their fitness provider accounts for stat syncing. We start with FitBit only for now.

Afterwards, users are able to creat and host simple competitions. As an example, at your job you may create a monthly steps challenge where the employee at the end of the month with the most steps wins. You would need to invite your colleagues to the competition. Simple, friendly competition to promote health.

## Time Series Data

We'll use steps for context.

We'll need to store fitness provider information in such a way that we can intermingle metric (steps, etc.) data from a users potentially multiple providers to give reasonably accurate data.

## Providers

### FitBit

FitBit stat syncing could be done with subscriptions on FitBit so we can be told when new data is available for the user, fetch, and store it. However, if subscriptions do not respond consistently this can disble the subscription and we would have to manually resolve them. That's annoying for local development if we don't have something like ngrok.

Locally we can poll every 10 minutes from the https://dev.fitbit.com/build/reference/web-api/activity-timeseries/get-activity-timeseries-by-date/ docs. We can leverage a job for this using https://packages.adonisjs.com/packages/adonisjs-scheduler.

For example, GET https://api.fitbit.com/1/user/-/activities/steps/date/2025-11-20/1d.json would get the users daily steps.

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
