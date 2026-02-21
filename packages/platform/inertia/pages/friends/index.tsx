import type { PageProps } from '@adonisjs/inertia/types';
import { Head, Link, router } from '@inertiajs/react';
import { Check, Clock, UserPlus, Users, X } from 'lucide-react';
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
import AuthenticatedLayout from '~/layouts/authenticated-layout';

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
}

export default function FriendsIndex({ friends, pendingRequests, sentRequests }: Props) {
  const handleAccept = (friendshipId: number) => {
    router.post(`/friends/${friendshipId}/accept`);
  };

  const handleDecline = (friendshipId: number) => {
    router.post(`/friends/${friendshipId}/decline`);
  };

  return (
    <AuthenticatedLayout>
      <Head title="Friends" />

      <div className="container mx-auto max-w-7xl px-4 py-8">
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
                <p className="text-muted-foreground mb-4">You haven't added any friends yet.</p>
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
                    <CardTitle className="text-lg">{friend.fullName || friend.email}</CardTitle>
                    {friend.fullName && (
                      <CardDescription className="text-sm">{friend.email}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/friends/${friend.id}`}>View Profile</Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            Remove Friend
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove friend?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove this friend? You will no longer be
                              able to see each other's activity or compete together.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => router.delete(`/friends/${friend.friendshipId}`)}
                            >
                              Remove Friend
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
