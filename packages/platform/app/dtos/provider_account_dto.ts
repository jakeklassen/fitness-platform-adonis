import ProviderAccount from '#models/provider_account';

export class ProviderAccountDto {
  constructor(private account: ProviderAccount) {}

  toJson() {
    return {
      id: this.account.id,
      provider: this.account.provider.name,
      providerDisplayName: this.account.provider.displayName,
      providerUserId: this.account.providerUserId,
      createdAt: this.account.createdAt.toISO()!,
      createdAtFormatted: this.account.createdAt.toFormat('MM/dd/yyyy'),
    };
  }
}
