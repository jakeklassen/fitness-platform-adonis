import FitbitSubscription from '#models/fitbit_subscription';
import ProviderAccount from '#models/provider_account';
import env from '#start/env';
import { FitbitTokenRefreshService } from '#services/fitbit_token_refresh_service';
import logger from '@adonisjs/core/services/logger';

interface FitbitSubscriptionResponse {
  collectionType: string;
  ownerId: string;
  ownerType: string;
  subscriberId: string;
  subscriptionId: string;
}

export class FitbitSubscriptionService {
  private tokenRefreshService: FitbitTokenRefreshService;

  constructor() {
    this.tokenRefreshService = new FitbitTokenRefreshService();
  }

  /**
   * Create a subscription for a specific collection type
   */
  async createSubscription(
    account: ProviderAccount,
    collectionType: 'activities' | 'body' | 'foods' | 'sleep' = 'activities',
  ): Promise<FitbitSubscription | null> {
    try {
      const accessToken = await this.tokenRefreshService.getValidAccessToken(account);

      if (!accessToken) {
        logger.error('Failed to get valid access token for subscription');
        return null;
      }

      const subscriptionId = `${account.userId}-${collectionType}-${Date.now()}`;

      const url = `https://api.fitbit.com/1/user/-/${collectionType}/apiSubscriptions/${subscriptionId}.json`;

      const subscriberId = env.get('FITBIT_SUBSCRIBER_ID');
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Length': '0',
        Accept: 'application/json',
      };

      if (subscriberId) {
        headers['X-Fitbit-Subscriber-Id'] = subscriberId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
      });

      if (!response.ok && response.status !== 409) {
        const errorText = await response.text();
        logger.error(`Failed to create FitBit subscription: ${response.status} ${errorText}`);
        return null;
      }

      const data = (await response.json()) as FitbitSubscriptionResponse;

      if (response.status === 409) {
        logger.info(
          `FitBit subscription already exists for account ${account.id}, saving to database`,
        );
      }

      const subscription = await FitbitSubscription.updateOrCreate(
        {
          subscriptionId: data.subscriptionId,
        },
        {
          userId: account.userId,
          providerAccountId: account.id,
          collectionType: data.collectionType,
          fitbitSubscriberId: data.subscriberId,
          isActive: true,
        },
      );

      logger.info(`Saved FitBit subscription ${data.subscriptionId} for account ${account.id}`);

      return subscription;
    } catch (error) {
      logger.error('Error creating FitBit subscription:', error);
      return null;
    }
  }

  /**
   * Delete a subscription
   */
  async deleteSubscription(
    account: ProviderAccount,
    subscription: FitbitSubscription,
  ): Promise<boolean> {
    try {
      const accessToken = await this.tokenRefreshService.getValidAccessToken(account);

      if (!accessToken) {
        logger.error('Failed to get valid access token for deleting subscription');
        return false;
      }

      const url = `https://api.fitbit.com/1/user/-/${subscription.collectionType}/apiSubscriptions/${subscription.subscriptionId}.json`;
      const subscriberId = env.get('FITBIT_SUBSCRIBER_ID');
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      };

      if (subscriberId) {
        headers['X-Fitbit-Subscriber-Id'] = subscriberId;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok && response.status !== 404) {
        const errorText = await response.text();
        logger.error(`Failed to delete FitBit subscription: ${response.status} ${errorText}`);
        return false;
      }

      await subscription.delete();

      logger.info(`Deleted FitBit subscription ${subscription.subscriptionId}`);

      return true;
    } catch (error) {
      logger.error('Error deleting FitBit subscription:', error);
      return false;
    }
  }

  /**
   * List all subscriptions for an account from the FitBit API
   */
  async listSubscriptions(account: ProviderAccount): Promise<FitbitSubscriptionResponse[]> {
    try {
      const accessToken = await this.tokenRefreshService.getValidAccessToken(account);

      if (!accessToken) {
        logger.error('Failed to get valid access token for listing subscriptions');
        return [];
      }

      const url = `https://api.fitbit.com/1/user/-/apiSubscriptions.json`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Failed to list FitBit subscriptions: ${response.status} ${errorText}`);
        return [];
      }

      const data = (await response.json()) as { apiSubscriptions: FitbitSubscriptionResponse[] };

      return data.apiSubscriptions || [];
    } catch (error) {
      logger.error('Error listing FitBit subscriptions:', error);
      return [];
    }
  }

  /**
   * Sync subscriptions from FitBit API to database.
   * Marks subscriptions that no longer exist on FitBit's side as inactive.
   */
  async syncSubscriptions(account: ProviderAccount): Promise<void> {
    try {
      const apiSubscriptions = await this.listSubscriptions(account);
      const dbSubscriptions = await FitbitSubscription.query()
        .where('provider_account_id', account.id)
        .where('is_active', true);

      for (const dbSub of dbSubscriptions) {
        const existsInApi = apiSubscriptions.some(
          (apiSub) => apiSub.subscriptionId === dbSub.subscriptionId,
        );

        if (!existsInApi) {
          dbSub.isActive = false;
          await dbSub.save();
          logger.info(
            `Marked subscription ${dbSub.subscriptionId} as inactive (not found in FitBit)`,
          );
        }
      }
    } catch (error) {
      logger.error('Error syncing subscriptions:', error);
    }
  }
}
