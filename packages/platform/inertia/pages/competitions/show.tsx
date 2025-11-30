import { Head, Link, router } from '@inertiajs/react';
import type { PageProps } from '@adonisjs/inertia/types';
import { Activity, Award, Calendar, Check, Edit, Medal, Target, Trash2, Trophy, User, UserPlus } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription } from '~/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';

interface User {
  id: number;
  fullName: string | null;
  email: string;
}

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
  creator: User;
}

interface LeaderboardEntry {
  userId: number;
  user: User;
  totalSteps: number;
  rank: number;
  goalReached?: boolean;
}

interface CompetitionStats {
  totalParticipants: number;
  activeParticipants: number;
  averageSteps: number;
  leaderboard: LeaderboardEntry[];
}

interface Membership {
  status: 'invited' | 'accepted' | 'declined';
}

interface Props extends PageProps {
  competition: Competition;
  leaderboard: LeaderboardEntry[] | null;
  stats: CompetitionStats | null;
  membership: Membership | null;
  isMember: boolean;
  isCreator: boolean;
  flash?: {
    success?: string;
    error?: string;
  };
}

export default function CompetitionShow({
  competition,
  leaderboard,
  stats,
  membership,
  isMember,
  isCreator,
  flash,
}: Props) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC',
    }).format(date);
  };

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

  const handleAcceptInvitation = () => {
    router.post(`/competitions/${competition.id}/accept`);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to cancel this competition? This cannot be undone.')) {
      router.delete(`/competitions/${competition.id}`);
    }
  };

  const handleLogout = () => {
    router.post('/logout');
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-muted-foreground" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (rank === 3) return <Award className="w-5 h-5 text-muted-foreground" />;
    return null;
  };

  const getRankTextSize = (rank: number) => {
    if (rank === 1) return 'text-lg';
    if (rank === 2) return 'text-base';
    if (rank === 3) return 'text-base';
    return 'text-sm';
  };

  const getNameTextSize = (rank: number) => {
    if (rank === 1) return 'text-lg font-semibold';
    if (rank === 2) return 'text-base font-semibold';
    if (rank === 3) return 'text-base font-medium';
    return 'font-medium';
  };

  const getStepsTextSize = (rank: number) => {
    if (rank === 1) return 'text-lg font-bold';
    if (rank === 2) return 'text-base font-bold';
    if (rank === 3) return 'text-base font-semibold';
    return 'font-semibold';
  };

  return (
    <>
      <Head title={competition.name} />

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

          {/* Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-3xl">{competition.name}</CardTitle>
                    <Badge variant={getStatusVariant(competition.status)}>
                      {competition.status}
                    </Badge>
                  </div>
                  {competition.description && (
                    <CardDescription className="text-base mb-4">
                      {competition.description}
                    </CardDescription>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {formatDate(competition.startDate)} - {formatDate(competition.endDate)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Target className="w-4 h-4" />
                      {competition.goalType === 'total_steps'
                        ? 'Total Steps Competition'
                        : `Goal: ${competition.goalValue?.toLocaleString()} steps`}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      {competition.creator.fullName || competition.creator.email}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {membership?.status === 'invited' && (
                    <Button onClick={handleAcceptInvitation}>Accept Invitation</Button>
                  )}
                  {isMember && (
                    <Button variant="outline" asChild>
                      <Link href={`/competitions/${competition.id}/invite`}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite Users
                      </Link>
                    </Button>
                  )}
                  {isCreator && (
                    <>
                      <Button variant="outline" asChild>
                        <Link href={`/competitions/${competition.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </Button>
                      <Button variant="destructive" onClick={handleDelete}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Stats Section */}
          {stats && (
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Participants</CardDescription>
                  <CardTitle className="text-3xl">{stats.totalParticipants}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Active Participants</CardDescription>
                  <CardTitle className="text-3xl text-success">
                    {stats.activeParticipants}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Average Steps</CardDescription>
                  <CardTitle className="text-3xl text-primary">
                    {stats.averageSteps.toLocaleString()}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard && leaderboard.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
                <CardDescription>Current standings for this competition</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Rank</TableHead>
                      <TableHead>Participant</TableHead>
                      <TableHead className="text-right">Total Steps</TableHead>
                      {competition.goalType === 'goal_based' && (
                        <TableHead className="text-center">Goal Status</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((entry) => (
                      <TableRow key={entry.userId}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {getRankIcon(entry.rank)}
                            <span className={cn('font-semibold', getRankTextSize(entry.rank))}>
                              #{entry.rank}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className={getNameTextSize(entry.rank)}>
                              {entry.user.fullName || entry.user.email}
                            </div>
                            {entry.user.fullName && (
                              <div className="text-sm text-muted-foreground">
                                {entry.user.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={cn('text-right', getStepsTextSize(entry.rank))}>
                          {entry.totalSteps.toLocaleString()}
                        </TableCell>
                        {competition.goalType === 'goal_based' && (
                          <TableCell className="text-center">
                            {entry.goalReached ? (
                              <Badge variant="default" className="bg-success text-success-foreground">
                                <Check className="mr-1 h-3 w-3" />
                                Goal Reached
                              </Badge>
                            ) : (
                              <Badge variant="secondary">In Progress</Badge>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <CardContent>
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  No participants yet or you don't have access to view the leaderboard.
                </p>
                {isMember && (
                  <Button asChild>
                    <Link href={`/competitions/${competition.id}/invite`}>
                      Invite Participants
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Back Link */}
          <div className="mt-8">
            <Button variant="ghost" asChild>
              <Link href="/competitions">← Back to Competitions</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
