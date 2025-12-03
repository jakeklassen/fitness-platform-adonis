import type { PageProps } from '@adonisjs/inertia/types';
import { Head, Link, router } from '@inertiajs/react';
import { Activity, Mail, Search, UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

interface User {
  id: number;
  fullName: string | null;
  email: string;
}

interface Props extends PageProps {
  flash?: {
    success?: string;
    error?: string;
  };
}

export default function FriendsCreate({ flash }: Props) {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setSearchMessage('Please enter an email address');
      return;
    }

    setSearching(true);
    setFoundUser(null);
    setSearchMessage(null);

    try {
      // Get CSRF token from cookie (AdonisJS uses XSRF-TOKEN cookie)
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return '';
      };

      const csrfToken = getCookie('XSRF-TOKEN');

      const response = await fetch('/friends/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-XSRF-TOKEN': csrfToken || '',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (data.user) {
        setFoundUser(data.user);
        setSearchMessage(null);
      } else {
        setFoundUser(null);
        setSearchMessage(data.message || 'User not found');
      }
    } catch (error) {
      setSearchMessage('An error occurred while searching');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = (userId: number) => {
    router.post(`/friends/${userId}`);
  };

  const handleLogout = () => {
    router.post('/logout');
  };

  return (
    <>
      <Head title="Add Friends" />

      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="container mx-auto flex h-16 max-w-7xl items-center px-4">
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

        <div className="container mx-auto max-w-2xl px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Add Friends</h1>
            <p className="text-muted-foreground mt-1">
              Enter the email address of the person you'd like to add as a friend.
            </p>
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

          {/* Search Form */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Search by Email</CardTitle>
              <CardDescription>Find a user by their email address</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={searching} className="w-full">
                  <Search className="mr-2 h-4 w-4" />
                  {searching ? 'Searching...' : 'Search'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Search Message */}
          {searchMessage && (
            <Alert className="mb-6 border-warning/50 bg-warning/10">
              <AlertDescription>{searchMessage}</AlertDescription>
            </Alert>
          )}

          {/* Found User */}
          {foundUser && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle>{foundUser.fullName || foundUser.email}</CardTitle>
                    {foundUser.fullName && (
                      <CardDescription className="mt-1">{foundUser.email}</CardDescription>
                    )}
                  </div>
                  <Button onClick={() => handleSendRequest(foundUser.id)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Send Request
                  </Button>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Privacy Notice */}
          <Alert className="mb-6 border-info/50 bg-info/10">
            <AlertDescription>
              <strong className="font-semibold">Privacy Notice:</strong> For privacy reasons, you
              can only add friends by their email address. Make sure you have the correct email
              address of the person you want to connect with.
            </AlertDescription>
          </Alert>

          {/* Back Link */}
          <div className="mt-8">
            <Button variant="ghost" asChild>
              <Link href="/friends">← Back to Friends</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
