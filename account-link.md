Here's how you should store social provider access and refresh tokens, from the most secure (and complex) to the most practical for most applications.
The short answer: Store them in your database, but always encrypt them first.1 Never store tokens in plain text.

The Core Principle

When @adonisjs/ally gives you the user's tokens, it's your responsibility to store them.2 The key is to protect the refresh token.

An Access Token is short-lived (e.g., 1 hour).3 It lets you make API calls.

A Refresh Token is long-lived (e.g., 6 months or forever).4 It's highly sensitive and is used to get a new access token when the old one expires.5

If an attacker steals a refresh token, they have long-term access to your user's account on that provider. This is why you must encrypt it.

Recommended Storage Strategy (The Practical Approach)

For most AdonisJS applications, this provides an excellent balance of high security and practicality.
Store in your accounts table: Add encrypted columns to the Account model you created for account linking.
access_token (string, nullable)
refresh_token (string, nullable)
expires_at (datetime, nullable)
Use AdonisJS's Built-in Encryption: AdonisJS has a dedicated Encryption service that is perfect for this.6 It uses aes-256-cbc by default, which is a strong standard.7

Encrypt/Decrypt in the Model: Use Lucid model hooks or setters/getters to automatically encrypt and decrypt the tokens. This keeps your controllers clean.

Example: Updating Your Account Model

This is the cleanest way to implement this. The rest of your app can just use account.refreshToken and it will be automatically decrypted on read and encrypted on write.

TypeScript

// app/models/account.ts
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { DateTime } from 'luxon'
import { app } from '@adonisjs/core/services/app'
import { Encryption } from '@adonisjs/core/services/encryption'

export default class Account extends BaseModel {
// ... other columns
@column()
declare userId: number

@column()
declare provider: string

@column()
declare providerId: string

@column({
// 1. Encrypt before saving to DB
prepare: (value: string | null) => {
const encryption = app.container.makeSingleton(Encryption)
return value ? encryption.encrypt(value) : null
},
// 2. Decrypt when reading from DB
consume: (value: string | null) => {
const encryption = app.container.makeSingleton(Encryption)
return value ? encryption.decrypt(value) : null
},
})
declare accessToken: string | null

@column({
// 3. Do the same for the refresh token
prepare: (value: string | null) => {
const encryption = app.container.makeSingleton(Encryption)
return value ? encryption.encrypt(value) : null
},
consume: (value: string | null) => {
const encryption = app.container.makeSingleton(Encryption)
return value ? encryption.decrypt(value) : null
},
})
declare refreshToken: string | null

@column.dateTime()
declare expiresAt: DateTime | null

@belongsTo(() => User)
declare user: BelongsTo<typeof User>
}

Now, in your Ally callback, you can just save them directly:

TypeScript

// Your Ally callback
const googleUser = await ally.use('google').user()

// ... logic to find or create user ...

await user.related('accounts').create({
provider: 'google',
providerId: googleUser.id,
accessToken: googleUser.token.token,
refreshToken: googleUser.token.refreshToken, // This is often null on subsequent logins
expiresAt: googleUser.token.expiresAt
? DateTime.fromJSDate(googleUser.token.expiresAt)
: null,
})

🛡️ Critical Security Considerations

APP_KEY is Everything: The AdonisJS Encryption service uses the APP_KEY from your .env file.8 This key is now your master encryption key.

Never commit your .env file to Git.
Never share your production APP_KEY.
Store your production APP_KEY in a secure secret manager (like Doppler, AWS Secrets Manager, Google Secret Manager, or HashiCorp Vault), not just a plain .env file on your server.

Do I Always Need to Store Them?

It depends on your app's needs.
Store Tokens (Access + Refresh):
YES, if you need to perform actions on the user's behalf when they are offline.
Example: A cron job that syncs their Google Calendar events every night.
Store Access Token Only:
MAYBE, if you only need to make API calls while the user is actively logged in.
Example: A "dashboard" page that immediately fetches the user's 10 most recent GitHub repos.
In this case, you could technically just store the access token in the user's secure, server-side session. But since you're already building the accounts table, it's safer and easier to just store it there.
Don't Store Tokens at All:
RARELY, if you only use the provider for authentication and never need to interact with their API again.
In this case, you just get the user's profile, find or create your local User, and log them in. You can discard the tokens.
