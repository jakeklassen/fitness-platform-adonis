import { Head, Link, router } from '@inertiajs/react';
import type { PageProps } from '@adonisjs/inertia/types';
import { Activity, Check, Clock, UserPlus, Users, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Alert, AlertDescription } from '~/components/ui/alert';

interface User {
  id: number;
  fullName: string | null;
  email: string;
}

interface Friend extends User {
  friendshipId: number;
}

interface Friendship {
  id: number;
  userId: number;
  friendId: number;
  status: 'pending' | 'accepted' | 'declined';
  user: User;
  friend: User;
}

interface Props extends PageProps {
  friends: Friend[];
  pendingRequests: Friendship[];
  sentRequests: Friendship[];
  flash?: {
    success?: string;
    error?: string;
  };
}

export default function FriendsIndex({ friends, pendingRequests, sentRequests, flash }: Props) {
  const handleAccept = (friendshipId: number) => {
    router.post(`/friends/${friendshipId}/accept`);
  };

  const handleDecline = (friendshipId: number) => {
    router.post(`/friends/${friendshipId}/decline`);
  };

  const handleRemove = (friendshipId: number) => {
    if (confirm('Are you sure you want to remove this friend?')) {
      router.delete(`/friends/${friendshipId}`);
    }
  };

  const handleLogout = () => {
    router.post('/logout');
  };

  return (
    <>
      <Head title="Friends" />

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
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Friends</h1>
              <p className="text-muted-foreground mt-1">
                Connect with people to invite them to competitions
              </p>
            </div>
            <Button asChild>
              <Link href="/friends/add">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Friends
              </Link>
            </Button>
          </div>

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

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Friend Requests
              </h2>
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id} className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle>{request.user.fullName || request.user.email}</CardTitle>
                          {request.user.fullName && (
                            <CardDescription className="mt-1">{request.user.email}</CardDescription>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button size="sm" onClick={() => handleAccept(request.id)}>
                            <Check className="mr-2 h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDecline(request.id)}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Sent Requests */}
          {sentRequests.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Sent Friend Requests
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sentRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {request.friend.fullName || request.friend.email}
                      </CardTitle>
                      {request.friend.fullName && (
                        <CardDescription className="text-sm">{request.friend.email}</CardDescription>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">Waiting for response...</p>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              My Friends ({friends.length})
            </h2>
            {friends.length === 0 ? (
              <Card className="p-12 text-center">
                <CardContent>
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    You haven't added any friends yet.
                  </p>
                  <Button asChild>
                    <Link href="/friends/add">Add Your First Friend</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {friends.map((friend) => (
                  <Card key={friend.id} className="transition-all hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {friend.fullName || friend.email}
                      </CardTitle>
                      {friend.fullName && (
                        <CardDescription className="text-sm">{friend.email}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemove(friend.friendshipId)}
                      >
                        Remove Friend
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
