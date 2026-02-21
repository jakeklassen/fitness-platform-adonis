import type { PageProps } from '@adonisjs/inertia/types';
import { Head, Link, router } from '@inertiajs/react';
import { Calendar, Compass, Search, Target, User, Users } from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import AuthenticatedLayout from '~/layouts/authenticated-layout';

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

interface DiscoveredCompetition {
  competition: Competition;
  memberCount: number;
  userMembershipStatus: 'accepted' | 'invited' | 'declined' | null;
}

interface Filters {
  search: string;
  status: string;
  source: string;
}

interface Props extends PageProps {
  competitions: DiscoveredCompetition[];
  filters: Filters;
}

export default function DiscoverCompetitions({ competitions, filters }: Props) {
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyFilters = (newFilters: Partial<Filters>) => {
    const merged = { ...filters, ...newFilters };

    router.get(
      '/competitions/discover',
      {
        search: merged.search || undefined,
        status: merged.status || undefined,
        source: merged.source === 'all' ? undefined : merged.source,
      },
      { preserveState: true, replace: true },
    );
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      applyFilters({ search: value });
    }, 300);
  };

  const handleStatusChange = (value: string) => {
    applyFilters({ status: value === 'all' ? '' : value });
  };

  const handleSourceChange = (value: string) => {
    applyFilters({ source: value });
  };

  const handleJoin = (competitionId: number) => {
    router.post(`/competitions/${competitionId}/join`);
  };

  const getStatusVariant = (
    status: string,
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

  const getMembershipAction = (item: DiscoveredCompetition) => {
    if (item.userMembershipStatus === 'accepted') {
      return (
        <Badge variant="secondary" className="shrink-0">
          Joined
        </Badge>
      );
    }

    if (item.userMembershipStatus === 'invited') {
      return (
        <Badge variant="outline" className="shrink-0">
          Invited
        </Badge>
      );
    }

    if (item.competition.status === 'ended') {
      return null;
    }

    return (
      <Button
        size="sm"
        className="shrink-0"
        onClick={(e) => {
          e.preventDefault();
          handleJoin(item.competition.id);
        }}
      >
        Join
      </Button>
    );
  };

  return (
    <AuthenticatedLayout>
      <Head title="Discover Competitions" />

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Discover Competitions</h1>
            <p className="text-muted-foreground mt-1">Browse and join public fitness challenges</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/competitions">My Competitions</Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search competitions..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.source || 'all'} onValueChange={handleSourceChange}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Competitions</SelectItem>
              <SelectItem value="friends">From Friends</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {competitions.length === 0 ? (
          <Card className="p-12 text-center">
            <CardContent>
              <Compass className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No public competitions found.</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or create your own competition.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitions.map((item) => (
              <Card
                key={item.competition.id}
                className="h-full transition-all hover:shadow-lg hover:border-primary/50"
              >
                <CardHeader>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <CardTitle className="line-clamp-2">{item.competition.name}</CardTitle>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={getStatusVariant(item.competition.status)}>
                        {item.competition.status}
                      </Badge>
                    </div>
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
                  <p className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
                  </p>
                  <div className="pt-2">{getMembershipAction(item)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
