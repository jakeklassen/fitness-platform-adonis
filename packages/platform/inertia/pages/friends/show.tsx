import type { PageProps } from '@adonisjs/inertia/types';
import { Head, Link } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Footprints, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '~/components/ui/chart';
import AuthenticatedLayout from '~/layouts/authenticated-layout';

interface DaySteps {
  date: string;
  steps: number;
}

interface Props extends PageProps {
  friend: {
    id: number;
    fullName: string | null;
  };
  stats: {
    todaySteps: number;
    total30Days: number;
    dailyAverage: number;
    last7Days: DaySteps[];
  };
}

const chartConfig = {
  steps: {
    label: 'Steps',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

export default function FriendShow({ friend, stats }: Props) {
  const chartData = stats.last7Days.map((day) => ({
    date: format(parseISO(day.date), 'EEE'),
    steps: day.steps,
  }));

  return (
    <AuthenticatedLayout>
      <Head title={`${friend.fullName ?? 'Friend'}'s Profile`} />

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Back button */}
        <Button variant="ghost" size="sm" className="mb-6" asChild>
          <Link href="/friends">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Friends
          </Link>
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{friend.fullName ?? 'Friend'}</h1>
          <p className="text-muted-foreground mt-1">Step activity overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Steps</CardTitle>
              <Footprints className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todaySteps.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
              <Footprints className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total30Days.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Average (30d)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.dailyAverage.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* 7-Day Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="steps" fill="var(--color-steps)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
