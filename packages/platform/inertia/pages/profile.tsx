import ProfilesController from '#controllers/profiles_controller';
import { InferPageProps } from '@adonisjs/inertia/types';
import { Head, router } from '@inertiajs/react';

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

      <div className="min-h-screen bg-sand-2">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-sand-12">Fitness Platform</h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sand-11">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-sand-12 hover:text-sand-11"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {flash?.success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{flash.success}</p>
            </div>
          )}

          {flash?.error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{flash.error}</p>
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-sand-12 mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-sand-11">Full Name</label>
                <p className="mt-1 text-sand-12">{user.fullName || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-sand-11">Email</label>
                <p className="mt-1 text-sand-12">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-sand-12 mb-4">Connected Accounts</h2>

            <div className="space-y-4">
              <div className="border border-sand-7 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#00B0B9] rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sand-12">Fitbit</h3>
                    {fitbitAccount ? (
                      <p className="text-sm text-sand-11">
                        Connected • User ID: {fitbitAccount.providerId}
                      </p>
                    ) : (
                      <p className="text-sm text-sand-11">Not connected</p>
                    )}
                  </div>
                </div>

                {fitbitAccount ? (
                  <button
                    onClick={() => handleUnlinkAccount(fitbitAccount.id)}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 hover:border-red-400 rounded-md"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={handleLinkFitbit}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:opacity-90 rounded-md"
                  >
                    Connect
                  </button>
                )}
              </div>

              {fitbitAccount && (
                <div className="mt-4 p-4 bg-sand-2 rounded-lg">
                  <h4 className="font-semibold text-sand-12 mb-2">Account Details</h4>
                  <dl className="grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <dt className="text-sand-11">Provider ID:</dt>
                      <dd className="text-sand-12 font-mono">{fitbitAccount.providerId}</dd>
                    </div>
                    <div>
                      <dt className="text-sand-11">Connected on:</dt>
                      <dd className="text-sand-12">{fitbitAccount.createdAtFormatted}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </div>

          {fitbitUserData && (
            <div className="bg-white shadow rounded-lg p-6 mt-6">
              <h2 className="text-2xl font-bold text-sand-12 mb-4">Fitbit Stats</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Profile Info */}
                {fitbitUserData.displayName && (
                  <div className="p-4 bg-sand-2 rounded-lg">
                    <div className="text-sm text-sand-11 mb-1">Display Name</div>
                    <div className="text-lg font-semibold text-sand-12">
                      {fitbitUserData.displayName}
                    </div>
                  </div>
                )}

                {fitbitUserData.age && (
                  <div className="p-4 bg-sand-2 rounded-lg">
                    <div className="text-sm text-sand-11 mb-1">Age</div>
                    <div className="text-lg font-semibold text-sand-12">{fitbitUserData.age}</div>
                  </div>
                )}

                {fitbitUserData.gender && (
                  <div className="p-4 bg-sand-2 rounded-lg">
                    <div className="text-sm text-sand-11 mb-1">Gender</div>
                    <div className="text-lg font-semibold text-sand-12">
                      {fitbitUserData.gender.charAt(0) +
                        fitbitUserData.gender.slice(1).toLowerCase()}
                    </div>
                  </div>
                )}

                {fitbitUserData.averageDailySteps !== undefined && (
                  <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                    <div className="text-sm text-sand-11 mb-1">Average Daily Steps</div>
                    <div className="text-2xl font-bold text-primary">
                      {fitbitUserData.averageDailySteps.toLocaleString()}
                    </div>
                  </div>
                )}

                {fitbitUserData.height && (
                  <div className="p-4 bg-sand-2 rounded-lg">
                    <div className="text-sm text-sand-11 mb-1">Height</div>
                    <div className="text-lg font-semibold text-sand-12">
                      {fitbitUserData.height} cm
                    </div>
                  </div>
                )}

                {fitbitUserData.memberSinceFormatted && (
                  <div className="p-4 bg-sand-2 rounded-lg">
                    <div className="text-sm text-sand-11 mb-1">Member Since</div>
                    <div className="text-lg font-semibold text-sand-12">
                      {fitbitUserData.memberSinceFormatted}
                    </div>
                  </div>
                )}
              </div>

              {/* Top Badges */}
              {fitbitUserData.topBadges && fitbitUserData.topBadges.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-sand-12 mb-3">Top Badges</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {fitbitUserData.topBadges.map((badge, index) => (
                      <div
                        key={index}
                        className="p-4 bg-sand-2 rounded-lg flex flex-col items-center text-center"
                      >
                        <img
                          src={badge.image100px}
                          alt={badge.shortName}
                          className="w-20 h-20 mb-2"
                        />
                        <div className="font-semibold text-sm text-sand-12">{badge.shortName}</div>
                        <div className="text-xs text-sand-11 mt-1">{badge.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
