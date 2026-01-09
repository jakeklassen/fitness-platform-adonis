import { BaseModel, column } from '@adonisjs/lucid/orm';
import { DateTime } from 'luxon';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type JobType = 'fitbit_notification';

export default class WebhookJob extends BaseModel {
  static table = 'webhook_queue';

  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare jobType: JobType;

  @column()
  declare payload: any;

  @column()
  declare status: JobStatus;

  @column()
  declare retries: number;

  @column()
  declare error: string | null;

  @column.dateTime()
  declare processedAt: DateTime | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;
}
