import ProfilesController from '#controllers/profiles_controller';
import { InferPageProps } from '@adonisjs/inertia/types';
import { Head, Link, router } from '@inertiajs/react';
import { Activity, Link as LinkIcon, Unlink, User } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';

export default function Profile(props: InferPageProps<ProfilesController, 'show'>) {
  const { user, accounts, flash, fitbitUserData } = props;

  const handleLogout = () => {
    router.post('/logout');
  };

  const handleLinkFitbit = () => {
    window.location.href = '/auth/fitbit';
  };

  const handleUnlinkAccount = (accountId: number) => {
    if (confirm('Are you sure you want to unlink this account?')) {
      router.delete(`/profile/accounts/${accountId}`);
    }
  };

  const fitbitAccount = accounts.find((account) => account.provider === 'fitbit');

  return (
    <>
      <Head title="Profile" />

      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 max-w-screen-xl items-center px-4">
            <div className="mr-auto flex items-center gap-2">
              <Activity className="h-6 w-6" />
              <Link href="/" className="text-xl font-bold">
                Fitness Platform
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/profile">Profile</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/friends">Friends</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/competitions">Competitions</Link>
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                Log Out
              </Button>
            </div>
          </div>
        </nav>

        <div className="container mx-auto max-w-screen-xl px-4 py-8">
          {/* Flash Messages */}
          {flash?.success && (
            <Alert className="mb-6 border-success/50 bg-success/10">
              <AlertDescription>{flash.success}</AlertDescription>
            </Alert>
          )}
          {flash?.error && (
            <Alert className="mb-6 bg-destructive/10 border-destructive/20">
              <AlertDescription className="text-destructive">{flash.error}</AlertDescription>
            </Alert>
          )}

          {/* Profile Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="text-lg mt-1">{user.fullName || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-lg mt-1">{user.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Connected Accounts */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">Connected Accounts</CardTitle>
              <CardDescription>Manage your connected fitness tracker accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#00B0B9] rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Fitbit</h3>
                    {fitbitAccount ? (
                      <p className="text-sm text-muted-foreground">
                        Connected • User ID: {fitbitAccount.providerId}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not connected</p>
                    )}
                  </div>
                </div>

                {fitbitAccount ? (
                  <Button variant="destructive" onClick={() => handleUnlinkAccount(fitbitAccount.id)}>
                    <Unlink className="mr-2 h-4 w-4" />
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={handleLinkFitbit}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Connect
                  </Button>
                )}
              </div>

              {fitbitAccount && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Account Details</h4>
                  <dl className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Provider ID:</dt>
                      <dd className="font-mono">{fitbitAccount.providerId}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Connected on:</dt>
                      <dd>{fitbitAccount.createdAtFormatted}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fitbit Stats */}
          {fitbitUserData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Fitbit Stats</CardTitle>
                <CardDescription>Your fitness tracker statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Profile Info */}
                  {fitbitUserData.displayName && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Display Name</div>
                      <div className="text-lg font-semibold">{fitbitUserData.displayName}</div>
                    </div>
                  )}

                  {fitbitUserData.age && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Age</div>
                      <div className="text-lg font-semibold">{fitbitUserData.age}</div>
                    </div>
                  )}

                  {fitbitUserData.gender && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Gender</div>
                      <div className="text-lg font-semibold">
                        {fitbitUserData.gender.charAt(0) +
                          fitbitUserData.gender.slice(1).toLowerCase()}
                      </div>
                    </div>
                  )}

                  {fitbitUserData.averageDailySteps !== undefined && (
                    <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                      <div className="text-sm text-muted-foreground mb-1">Average Daily Steps</div>
                      <div className="text-2xl font-bold text-primary">
                        {fitbitUserData.averageDailySteps.toLocaleString()}
                      </div>
                    </div>
                  )}

                  {fitbitUserData.height && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Height</div>
                      <div className="text-lg font-semibold">{fitbitUserData.height} cm</div>
                    </div>
                  )}

                  {fitbitUserData.memberSinceFormatted && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Member Since</div>
                      <div className="text-lg font-semibold">
                        {fitbitUserData.memberSinceFormatted}
                      </div>
                    </div>
                  )}
                </div>

                {/* Top Badges */}
                {fitbitUserData.topBadges && fitbitUserData.topBadges.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Top Badges</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {fitbitUserData.topBadges.map((badge, index) => (
                        <div
                          key={index}
                          className="p-4 bg-muted rounded-lg flex flex-col items-center text-center"
                        >
                          <img
                            src={badge.image100px}
                            alt={badge.shortName}
                            className="w-20 h-20 mb-2"
                          />
                          <div className="font-semibold text-sm">{badge.shortName}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {badge.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
