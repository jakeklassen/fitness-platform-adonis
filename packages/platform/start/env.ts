/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env';

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring session package
  |----------------------------------------------------------
  */
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring Fitbit OAuth
  |----------------------------------------------------------
  */
  FITBIT_CLIENT_ID: Env.schema.string(),
  FITBIT_CLIENT_SECRET: Env.schema.string(),
  FITBIT_CALLBACK_URL: Env.schema.string(),
  FITBIT_SUBSCRIBER_VERIFICATION_CODE: Env.schema.string(),
  FITBIT_SUBSCRIBER_ID: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | LensJs variables
  |----------------------------------------------------------
  */
  LENS_BASE_PATH: Env.schema.string.optional(),
  LENS_ENABLED: Env.schema.boolean.optional(),
  LENS_ENABLE_QUERY_WATCHER: Env.schema.boolean.optional(),
  LENS_ENABLE_REQUEST_WATCHER: Env.schema.boolean.optional(),
  LENS_ENABLE_CACHE_WATCHER: Env.schema.boolean.optional(),
  LENS_ENABLE_EXCEPTION_WATCHER: Env.schema.boolean.optional(),

  APP_NAME: Env.schema.string(),
  APP_VERSION: Env.schema.string(),
  APP_ENV: Env.schema.enum(['development', 'staging', 'production'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring @adonisjs/queue
  |----------------------------------------------------------
  */
  QUEUE_DRIVER: Env.schema.enum(['redis', 'database', 'sync'] as const),
});
