import env from '#start/env';
import { args, BaseCommand, flags } from '@adonisjs/core/ace';
import type { CommandOptions } from '@adonisjs/core/types/ace';
import { auth, health, type health_v4 } from '@googleapis/health';

type DesiredConfig = { dataTypes: string[]; subscriptionCreatePolicy: string };

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  return sortedA.every((value, index) => value === sortedB[index]);
}

function configsMatch(
  existing: health_v4.Schema$SubscriberConfig[],
  desired: DesiredConfig[],
): boolean {
  if (existing.length !== desired.length) {
    return false;
  }

  return desired.every((want) =>
    existing.some(
      (have) =>
        have.subscriptionCreatePolicy === want.subscriptionCreatePolicy &&
        sameStringSet(have.dataTypes ?? [], want.dataTypes),
    ),
  );
}

/**
 * Idempotently ensures a Google Health API webhook subscriber points at a public
 * HTTPS endpoint (e.g. a cloudflared/ngrok tunnel to /webhooks/google). Safe to
 * run on every deploy: lists existing subscribers, creates one if missing, and
 * patches it if the endpoint or data-type config has drifted. Google verifies the
 * endpoint during create/patch, so the server + tunnel must be reachable.
 *
 * Auth: subscriber management runs as a service account via Application Default
 * Credentials — GOOGLE_APPLICATION_CREDENTIALS (a key file) or an inline
 * GOOGLE_SERVICE_ACCOUNT_KEY (e.g. injected by `op run`) — with cloud-platform scope.
 */
export default class GoogleCreateSubscriber extends BaseCommand {
  static commandName = 'google:create-subscriber';
  static description = 'Create or update (idempotent) the Google Health webhook subscriber';

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

  @flags.boolean({
    description:
      'Re-apply even if unchanged (the endpoint secret is write-only, so use this to rotate it)',
    default: false,
  })
  declare force: boolean;

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

    const parent = `projects/${project}`;
    const name = `${parent}/subscribers/${this.subscriberId}`;
    const desiredConfigs: DesiredConfig[] = [
      { dataTypes: this.dataTypes, subscriptionCreatePolicy: this.policy },
    ];
    const requestBody = {
      endpointUri: this.endpoint,
      endpointAuthorization: { secret: env.get('GOOGLE_WEBHOOK_SECRET') },
      subscriberConfigs: desiredConfigs,
    };

    try {
      const existing = await this.findSubscriber(client, parent, name);

      if (!existing) {
        const { data } = await client.projects.subscribers.create({
          parent,
          subscriberId: this.subscriberId,
          requestBody,
        });
        this.reportOperation(data, 'created');
        return;
      }

      const urlDrift = existing.endpointUri !== this.endpoint;
      const configDrift = !configsMatch(existing.subscriberConfigs ?? [], desiredConfigs);

      if (!urlDrift && !configDrift && !this.force) {
        this.logger.info(`Subscriber already matches (${existing.endpointUri}). Nothing to do.`);
        this.logger.info(
          'The endpoint secret is write-only and cannot be compared — use --force to re-apply it.',
        );
        return;
      }

      const { data } = await client.projects.subscribers.patch({
        name,
        updateMask: 'endpoint_uri,subscriber_configs,endpoint_authorization',
        requestBody,
      });
      this.reportOperation(data, 'updated');
    } catch (error) {
      this.logger.error(
        'Subscriber create/update failed. Google verifies the endpoint during the call — is the server + tunnel reachable, and does GOOGLE_WEBHOOK_SECRET match?',
      );
      this.logger.error(error instanceof Error ? error.message : String(error));
      this.exitCode = 1;
    }
  }

  /**
   * Look up an existing subscriber by resource name (there is no single-get RPC).
   */
  private async findSubscriber(
    client: health_v4.Health,
    parent: string,
    name: string,
  ): Promise<health_v4.Schema$Subscriber | null> {
    let pageToken: string | undefined;

    do {
      const { data } = await client.projects.subscribers.list({
        parent,
        pageSize: 1000,
        pageToken,
      });
      const match = data.subscribers?.find((subscriber) => subscriber.name === name);

      if (match) {
        return match;
      }

      pageToken = data.nextPageToken ?? undefined;
    } while (pageToken);

    return null;
  }

  private reportOperation(operation: health_v4.Schema$Operation, verb: string): void {
    if (operation.error) {
      this.logger.error(`Endpoint verification failed: ${JSON.stringify(operation.error)}`);
      this.exitCode = 1;
      return;
    }

    this.logger.success(`Subscriber ${verb}.`);
    this.logger.info(`Operation: ${operation.name ?? 'n/a'} (done: ${operation.done ?? false})`);
  }
}
