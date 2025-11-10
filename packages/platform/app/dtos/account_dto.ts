import Account from '#models/account';

export class AccountDto {
  constructor(private account: Account) {}

  toJson() {
    return {
      id: this.account.id,
      provider: this.account.provider,
      providerId: this.account.providerId,
      createdAt: this.account.createdAt.toISO()!,
      createdAtFormatted: this.account.createdAt.toFormat('MM/dd/yyyy'),
    };
  }
}
