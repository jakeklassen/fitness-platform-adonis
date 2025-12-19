import ProfilesController from '#controllers/profiles_controller';
import { InferPageProps } from '@adonisjs/inertia/types';
import { Head, router } from '@inertiajs/react';
import {
  Activity,
  Battery,
  Check,
  HelpCircle,
  Link as LinkIcon,
  Star,
  Unlink,
  Watch,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import AuthenticatedLayout from '~/layouts/authenticated-layout';

export default function Profile(props: InferPageProps<ProfilesController, 'show'>) {
  const { user, accounts, fitbitUserData, preferredProvider } = props;

  const handleLinkFitbit = () => {
    window.location.href = '/auth/fitbit';
  };

  const handleUnlinkAccount = (accountId: number) => {
    router.delete(`/profile/accounts/${accountId}`);
  };

  const handleSetPreferredProvider = (provider: string) => {
    router.post('/profile/set-preferred-provider', { provider });
  };

  const fitbitAccount = accounts.find((account) => account.provider === 'fitbit');

  return (
    <AuthenticatedLayout>
      <Head title="Profile" />

      <div className="container mx-auto max-w-7xl px-4 py-8">
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
            <CardHeader className="relative">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <CardTitle className="text-2xl">Connected Accounts</CardTitle>
                  <CardDescription>Manage your connected fitness tracker accounts</CardDescription>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="cursor-pointer rounded-full p-1 hover:bg-accent transition-colors">
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="max-w-xs">
                    <p className="text-sm">
                      Your preferred provider is used when you have multiple fitness tracker
                      providers connected.
                    </p>
                    <br />
                    <p className="text-sm">
                      Activity data from your preferred provider will be used whenever there is
                      overlap with other connected providers.
                    </p>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accounts.map((account) => {
                  const isPreferredProvider =
                    account.provider === preferredProvider || accounts.length === 1;
                  const providerName =
                    account.provider.charAt(0).toUpperCase() + account.provider.slice(1);

                  return (
                    <div key={account.id} className="border rounded-lg overflow-hidden">
                      {/* Account Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-4 bg-muted/30">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Activity className="w-8 h-8 text-cyan-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium flex flex-wrap items-center gap-2">
                              {providerName}
                              <Check className="w-4 h-4 text-green-600 shrink-0" />
                              {isPreferredProvider && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300">
                                  <Star className="w-3 h-3 fill-current" />
                                  Preferred
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Connected since {account.createdAtFormatted}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!isPreferredProvider && accounts.length > 1 && (
                            <Button
                              variant="outline"
                              onClick={() => handleSetPreferredProvider(account.provider)}
                              className="whitespace-nowrap"
                            >
                              Set Preferred
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button className="bg-destructive/60 text-white hover:bg-destructive/80">
                                <Unlink className="mr-2 h-4 w-4" />
                                Disconnect
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Disconnect {providerName}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to disconnect your {providerName} account?
                                  You will no longer be able to sync fitness data from this account.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleUnlinkAccount(account.id)}
                                  className="bg-destructive/60 text-white hover:bg-destructive/80"
                                >
                                  <Unlink className="mr-2 h-4 w-4" />
                                  Disconnect
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {/* Devices List */}
                      {account.devices && account.devices.length > 0 && (
                        <div className="p-4 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                            Connected Devices ({account.devices.length})
                          </p>
                          {account.devices.map((device: any) => (
                            <div
                              key={device.id}
                              className="flex items-center gap-3 p-3 rounded-md bg-muted/20 border"
                            >
                              <Watch className="w-5 h-5 text-muted-foreground shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium flex flex-wrap items-center gap-2">
                                  {device.deviceVersion}
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                      device.battery === 'Empty' || !device.battery
                                        ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                        : device.battery === 'High'
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                          : device.battery === 'Medium'
                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                    }`}
                                  >
                                    <Battery className="w-3 h-3" />
                                    {device.battery === 'Empty' || !device.battery
                                      ? 'N/A'
                                      : device.battery}
                                  </span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Last synced: {new Date(device.lastSyncTime).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Show link button if no Fitbit connected */}
                {!fitbitAccount && (
                  <div className="flex items-center justify-between p-4 border rounded-lg border-dashed">
                    <div className="flex items-center gap-3">
                      <Activity className="w-8 h-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Fitbit</p>
                        <p className="text-sm text-muted-foreground">
                          Track your activity, heart rate, and sleep data.
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleLinkFitbit}
                      className="bg-emerald-600/60 text-white hover:bg-emerald-600/80"
                    >
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Connect
                    </Button>
                  </div>
                )}
              </div>
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
                    <div className="p-4 bg-linear-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
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
    </AuthenticatedLayout>
  );
}
