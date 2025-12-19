import User from '#models/user';
import type { PageProps } from '@adonisjs/inertia/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Activity, TrendingUp, Users, Zap } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import AuthenticatedLayout from '~/layouts/authenticated-layout';
import GuestLayout from '~/layouts/guest-layout';

interface HomeProps extends PageProps {
  user?: User;
}

export default function Home() {
  const { user } = usePage<HomeProps>().props;

  // Guest navigation
  const guestNav = (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center px-4">
        <div className="mr-auto flex items-center gap-2">
          <Activity className="h-6 w-6" />
          <span className="text-xl font-bold">Fitness Platform</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Sign Up Free</Link>
          </Button>
        </div>
      </div>
    </nav>
  );

  const pageContent = (
    <div>
      {/* Hero Section */}
      <div className="container mx-auto max-w-7xl px-4 py-24 lg:py-32">
          {user ? (
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                Welcome Back{user.fullName ? `, ${user.fullName}` : ''}
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Ready to track your progress and compete with your team?
              </p>
              <div className="mt-10 flex items-center justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/competitions">View Competitions</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/profile">Manage Profile</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                Turn Fitness Into{' '}
                <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Friendly Competition
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Connect your fitness tracker, create challenges with colleagues, and make staying
                active fun. Track steps, compete in monthly challenges, and celebrate wins together.
              </p>
              <div className="mt-10 flex items-center justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/register">Get Started Free</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">Log In</Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Free forever • No credit card required • Start competing in minutes
              </p>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="border-t bg-muted/50">
          <div className="container mx-auto max-w-7xl px-4 py-24">
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Zap className="h-6 w-6" />
                  </div>
                  <CardTitle>Connect Your Tracker</CardTitle>
                  <CardDescription>
                    Link your FitBit account securely. Your fitness data syncs automatically so you
                    can focus on moving, not manual entry.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Users className="h-6 w-6" />
                  </div>
                  <CardTitle>Create Challenges</CardTitle>
                  <CardDescription>
                    Set up step challenges for your team. Invite colleagues and compete monthly.
                    Simple, friendly competition that promotes health.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <CardTitle>Track Progress</CardTitle>
                  <CardDescription>
                    See your stats and rankings in real-time. Celebrate milestones and watch your
                    team stay motivated together.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="container mx-auto max-w-7xl px-4 py-24">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              How It Works
            </h2>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  1
                </div>
                <h3 className="text-xl font-semibold">Sign Up</h3>
                <p className="mt-2 text-muted-foreground">
                  Create your free account in seconds. No credit card needed.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  2
                </div>
                <h3 className="text-xl font-semibold">Link FitBit</h3>
                <p className="mt-2 text-muted-foreground">
                  Connect your FitBit account to automatically sync your activity data.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  3
                </div>
                <h3 className="text-xl font-semibold">Start Competing</h3>
                <p className="mt-2 text-muted-foreground">
                  Create or join challenges with your team and start moving!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        {!user && (
          <div className="border-t bg-muted/50">
            <div className="container mx-auto max-w-7xl px-4 py-24">
              <div className="mx-auto max-w-4xl text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Ready to Get Moving?
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Join teams already using Fitness Platform to stay active and connected.
                </p>
                <div className="mt-8 flex items-center justify-center gap-4">
                  <Button size="lg" asChild>
                    <Link href="/register">Create Free Account</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/login">Log In</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto max-w-7xl px-4 py-8 text-center text-sm text-muted-foreground">
          <p>Built with AdonisJS</p>
        </div>
      </footer>
    </div>
  );

  if (user) {
    return (
      <AuthenticatedLayout>
        <Head title="Welcome to Fitness Platform" />
        {pageContent}
      </AuthenticatedLayout>
    );
  }

  return (
    <GuestLayout>
      <Head title="Welcome to Fitness Platform" />
      <div className="min-h-screen bg-background">
        {guestNav}
        {pageContent}
      </div>
    </GuestLayout>
  );
}
