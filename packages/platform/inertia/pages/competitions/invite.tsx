import type { PageProps } from '@adonisjs/inertia/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import AuthenticatedLayout from '~/layouts/authenticated-layout';

interface User {
  id: number;
  email: string;
  fullName: string | null;
}

interface Competition {
  id: number;
  name: string;
  description: string | null;
}

interface Props extends PageProps {
  competition: Competition;
  availableUsers: User[];
}

export default function CompetitionInvite({ competition, availableUsers }: Props) {
  const { data, setData, post, processing, errors } = useForm({
    userId: '',
  });

  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = availableUsers.filter((user) => {
    const search = searchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(search) ||
      user.fullName?.toLowerCase().includes(search) ||
      false
    );
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    post(`/competitions/${competition.id}/invite`);
  };

  return (
    <AuthenticatedLayout>
      <Head title={`Invite Users - ${competition.name}`} />

      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Invite Users</CardTitle>
            <CardDescription>
              Competition: <span className="font-semibold">{competition.name}</span>
            </CardDescription>
            {competition.description && (
              <p className="text-sm text-muted-foreground mt-1">{competition.description}</p>
            )}
          </CardHeader>
        </Card>

        {/* Invite Form */}
        <Card>
          <CardContent className="pt-6">
            {availableUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  All your friends have already been invited to this competition.
                </p>
                <Button asChild>
                  <Link href={`/competitions/${competition.id}`}>Back to Competition</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Search Filter */}
                <div className="space-y-2">
                  <Label htmlFor="search">Search Friends</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name or email..."
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* User Selection */}
                <div className="space-y-2">
                  <Label>Select Friend to Invite *</Label>

                  {filteredUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      No friends match your search.
                    </p>
                  ) : (
                    <RadioGroup
                      value={data.userId}
                      onValueChange={(value) => setData('userId', value)}
                    >
                      <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                        {filteredUsers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center p-4 hover:bg-muted/50 cursor-pointer transition"
                          >
                            <RadioGroupItem
                              value={String(user.id)}
                              id={`user-${user.id}`}
                              className="mr-3"
                            />
                            <Label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                              <div className="font-medium">{user.fullName || user.email}</div>
                              {user.fullName && (
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  )}

                  {errors.userId && <p className="text-sm text-destructive">{errors.userId}</p>}
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4">
                  <Button type="submit" disabled={processing || !data.userId}>
                    {processing ? 'Sending Invitation...' : 'Send Invitation'}
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/competitions/${competition.id}`}>Cancel</Link>
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="mt-8">
          <Button variant="ghost" asChild>
            <Link href={`/competitions/${competition.id}`}>← Back to Competition</Link>
          </Button>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
