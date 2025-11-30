import { Head, Link, router } from '@inertiajs/react';
import type { PageProps } from '@adonisjs/inertia/types';
import { Activity, Calendar, Plus, Target, User } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription } from '~/components/ui/alert';

interface Competition {
  id: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  goalType: 'total_steps' | 'goal_based';
  goalValue: number | null;
  status: 'draft' | 'active' | 'ended';
  createdBy: number;
  creator: {
    id: number;
    fullName: string | null;
    email: string;
  };
}

interface CompetitionItem {
  competition: Competition;
  membership: {
    status: 'invited' | 'accepted' | 'declined';
  } | null;
  isCreator: boolean;
}

interface Props extends PageProps {
  competitions: CompetitionItem[];
  flash?: {
    success?: string;
    error?: string;
  };
}

export default function CompetitionsIndex({ competitions, flash }: Props) {
  const acceptedCompetitions = competitions.filter(
    (item) => item.membership?.status === 'accepted' || item.isCreator
  );
  const pendingInvitations = competitions.filter(
    (item) => item.membership?.status === 'invited'
  );

  const getStatusVariant = (
    status: string
  ): 'default' | 'secondary' | 'outline' | 'destructive' => {
    const variants = {
      draft: 'secondary' as const,
      active: 'default' as const,
      ended: 'outline' as const,
    };
    return variants[status as keyof typeof variants] || 'secondary';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC',
    }).format(date);
  };

  const handleAccept = (competitionId: number) => {
    router.post(`/competitions/${competitionId}/accept`);
  };

  const handleDecline = (competitionId: number) => {
    router.post(`/competitions/${competitionId}/decline`);
  };

  const handleLogout = () => {
    router.post('/logout');
  };

  return (
    <>
      <Head title="Competitions" />

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
              <h1 className="text-3xl font-bold tracking-tight">Competitions</h1>
              <p className="text-muted-foreground mt-1">
                Create and join fitness challenges with friends
              </p>
            </div>
            <Button asChild>
              <Link href="/competitions/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Competition
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

          {/* Pending Invitations */}
          {pendingInvitations.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Pending Invitations</h2>
              <div className="space-y-4">
                {pendingInvitations.map((item) => (
                  <Card key={item.competition.id} className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle>{item.competition.name}</CardTitle>
                          <CardDescription className="mt-2">
                            <div className="flex flex-wrap gap-3 text-sm">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                {formatDate(item.competition.startDate)} -{' '}
                                {formatDate(item.competition.endDate)}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <User className="w-4 h-4" />
                                {item.competition.creator.fullName ||
                                  item.competition.creator.email}
                              </span>
                            </div>
                          </CardDescription>
                          {item.competition.description && (
                            <p className="text-sm mt-2">{item.competition.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button size="sm" onClick={() => handleAccept(item.competition.id)}>
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDecline(item.competition.id)}
                          >
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

          {/* My Competitions */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              My Competitions ({acceptedCompetitions.length})
            </h2>
            {acceptedCompetitions.length === 0 ? (
              <Card className="p-12 text-center">
                <CardContent>
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    You haven't joined any competitions yet.
                  </p>
                  <Button asChild>
                    <Link href="/competitions/create">Create Your First Competition</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {acceptedCompetitions.map((item) => (
                  <Link key={item.competition.id} href={`/competitions/${item.competition.id}`}>
                    <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                      <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                          <CardTitle className="line-clamp-2">
                            {item.competition.name}
                          </CardTitle>
                          <Badge variant={getStatusVariant(item.competition.status)}>
                            {item.competition.status}
                          </Badge>
                        </div>
                        {item.competition.description && (
                          <CardDescription className="line-clamp-2">
                            {item.competition.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {formatDate(item.competition.startDate)} -{' '}
                          {formatDate(item.competition.endDate)}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Target className="w-4 h-4" />
                          {item.competition.goalType === 'total_steps'
                            ? 'Total Steps'
                            : `Goal: ${item.competition.goalValue?.toLocaleString()} steps`}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <User className="w-4 h-4" />
                          {item.competition.creator.fullName || item.competition.creator.email}
                        </p>
                        {item.isCreator && (
                          <Badge variant="outline" className="mt-2">
                            You created this
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
