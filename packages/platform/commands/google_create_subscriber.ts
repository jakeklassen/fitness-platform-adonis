import env from '#start/env';
import { args, BaseCommand, flags } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';
import { auth, health } from '@googleapis/health';

/**
 * Registers a Google Health API webhook subscriber pointing at a public HTTPS
 * endpoint (e.g. a cloudflared/ngrok tunnel to /webhooks/google). Google verifies
 * the endpoint during creation, so the dev server + tunnel must be running.
 *
 * Auth: subscriber management runs as a service account via Application Default
 * Credentials — either GOOGLE_APPLICATION_CREDENTIALS (a key file) or
 * `gcloud auth application-default login` — with the cloud-platform scope.
 */
export default class GoogleCreateSubscriber extends BaseCommand {
  static commandName = 'google:create-subscriber';
  static description = 'Create a Google Health API webhook subscriber for a public HTTPS endpoint';

  static options: CommandOptions = {
    startApp: true,
  };

  @args.string({
    description: 'Public HTTPS endpoint, e.g. https://xxx.trycloudflare.com/webhooks/google',
  })
  declare endpoint: string;

  @flags.string({
    description: 'Google Cloud project id or number (defaults to the project in GOOGLE_CLIENT_ID)',
  })
  declare project: string;

  @flags.string({
    description: 'Subscriber id (4-36 chars: lowercase letters, digits, hyphens)',
    default: 'fitness-platform',
  })
  declare subscriberId: string;

  @flags.string({
    description: 'Subscription create policy: AUTOMATIC or MANUAL',
    default: 'AUTOMATIC',
  })
  declare policy: string;

  @flags.array({ description: 'Data types to subscribe to (kebab-case)', default: ['steps'] })
  declare dataTypes: string[];

  async run() {
    if (!this.endpoint.startsWith('https://')) {
      this.logger.error('The endpoint must be a public HTTPS URL (Google requires HTTPS).');
      this.exitCode = 1;
      return;
    }

    // The project number is the leading segment of the OAuth client id
    // (<projectNumber>-<hash>.apps.googleusercontent.com).
    const project = this.project || env.get('GOOGLE_CLIENT_ID').split('-')[0];

    if (!project) {
      this.logger.error('Could not determine the project — pass --project=<id-or-number>.');
      this.exitCode = 1;
      return;
    }

    this.logger.info(`Project:    ${project}`);
    this.logger.info(`Subscriber: ${this.subscriberId}`);
    this.logger.info(`Endpoint:   ${this.endpoint}`);
    this.logger.info(`Data types: ${this.dataTypes.join(', ')} (policy: ${this.policy})`);

    // Prefer inline credentials (e.g. injected by `op run`) so no key file
    // needs to touch disk; otherwise fall back to Application Default Credentials
    // (GOOGLE_APPLICATION_CREDENTIALS path or `gcloud auth application-default login`).
    const inlineKey = env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    let credentials: { client_email: string; private_key: string } | undefined;

    if (inlineKey) {
      try {
        credentials = JSON.parse(inlineKey) as { client_email: string; private_key: string };
      } catch {
        this.logger.error('GOOGLE_SERVICE_ACCOUNT_KEY is set but is not valid JSON.');
        this.exitCode = 1;
        return;
      }
    }

    const googleAuth = new auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      ...(credentials ? { credentials } : {}),
    });

    const client = health({ version: 'v4', auth: googleAuth });

    try {
      const response = await client.projects.subscribers.create({
        parent: `projects/${project}`,
        subscriberId: this.subscriberId,
        requestBody: {
          endpointUri: this.endpoint,
          endpointAuthorization: { secret: env.get('GOOGLE_WEBHOOK_SECRET') },
          subscriberConfigs: [{ dataTypes: this.dataTypes, subscriptionCreatePolicy: this.policy }],
        },
      });

      const operation = response.data;

      if (operation.error) {
        this.logger.error(`Endpoint verification failed: ${JSON.stringify(operation.error)}`);
        this.exitCode = 1;
        return;
      }

      this.logger.success('Subscriber created.');
      this.logger.info(`Operation: ${operation.name ?? 'n/a'} (done: ${operation.done ?? false})`);
    } catch (error) {
      this.logger.error(
        'Failed to create subscriber. Google verifies the endpoint during creation — is the dev server + tunnel up, and does GOOGLE_WEBHOOK_SECRET match?',
      );
      this.logger.error(error instanceof Error ? error.message : String(error));
      this.exitCode = 1;
    }
  }
}
