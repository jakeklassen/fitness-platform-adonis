import type { PageProps } from '@adonisjs/inertia/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { FormEvent } from 'react';
import { DatePicker } from '~/components/date-picker';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';
import AuthenticatedLayout from '~/layouts/authenticated-layout';

interface Competition {
  id: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  goalType: 'total_steps' | 'goal_based';
  goalValue: number | null;
  visibility: 'private' | 'public';
  status: 'draft' | 'active' | 'ended';
}

interface Props extends PageProps {
  competition: Competition | null;
  isEdit: boolean;
}

export default function CompetitionForm({ competition, isEdit }: Props) {
  const parseDate = (dateString: string | undefined): Date | undefined => {
    if (!dateString) {
      return undefined;
    }

    // Parse YYYY-MM-DD as local date (not UTC)
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);

    return new Date(year, month - 1, day);
  };

  const { data, setData, post, put, processing, errors, transform } = useForm<{
    name: string;
    description: string;
    startDate: Date | undefined;
    endDate: Date | undefined;
    goalType: 'total_steps' | 'goal_based';
    goalValue: number | string;
    visibility: 'private' | 'public';
    status: string;
  }>({
    name: competition?.name || '',
    description: competition?.description || '',
    startDate: parseDate(competition?.startDate) ?? startOfMonth(new Date()),
    endDate: parseDate(competition?.endDate) ?? endOfMonth(new Date()),
    goalType: (competition?.goalType || 'total_steps') as 'total_steps' | 'goal_based',
    goalValue: competition?.goalValue || '',
    visibility: (competition?.visibility || 'private') as 'private' | 'public',
    status: competition?.status || 'draft',
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    transform((formData) => ({
      ...formData,
      startDate: formData.startDate ? format(formData.startDate, 'yyyy-MM-dd') : '',
      endDate: formData.endDate ? format(formData.endDate, 'yyyy-MM-dd') : '',
      description: formData.description || '',
      goalValue: formData.goalValue ? formData.goalValue : '',
    }));

    if (isEdit && competition) {
      put(`/competitions/${competition.id}`);
    } else {
      post('/competitions');
    }
  };

  return (
    <AuthenticatedLayout>
      <Head title={isEdit ? 'Edit Competition' : 'Create Competition'} />

      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {isEdit ? 'Edit Competition' : 'Create Competition'}
            </CardTitle>
            <CardDescription>
              {isEdit
                ? 'Update your competition details'
                : 'Set up a new fitness challenge for your team'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Competition Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  placeholder="Monthly Step Challenge"
                  required
                  minLength={3}
                  maxLength={255}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={data.description}
                  onChange={(e) => setData('description', e.target.value)}
                  rows={4}
                  placeholder="Describe the competition goals and rules..."
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
              </div>

              {/* Date Range */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <DatePicker
                    id="startDate"
                    value={data.startDate}
                    onChange={(date) => setData('startDate', date)}
                    placeholder="Select start date"
                  />
                  {errors.startDate && (
                    <p className="text-sm text-destructive">{errors.startDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <DatePicker
                    id="endDate"
                    value={data.endDate}
                    onChange={(date) => setData('endDate', date)}
                    placeholder="Select end date"
                  />
                  {errors.endDate && <p className="text-sm text-destructive">{errors.endDate}</p>}
                </div>
              </div>

              {/* Goal Type */}
              <div className="space-y-2">
                <Label htmlFor="goalType">Competition Type *</Label>
                <Select
                  value={data.goalType}
                  onValueChange={(value) =>
                    setData('goalType', value as 'total_steps' | 'goal_based')
                  }
                >
                  <SelectTrigger id="goalType">
                    <SelectValue placeholder="Select competition type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total_steps">Total Steps - Most steps wins</SelectItem>
                    <SelectItem value="goal_based">
                      Goal Based - Reach a specific step target
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.goalType && <p className="text-sm text-destructive">{errors.goalType}</p>}
              </div>

              {/* Goal Value (only for goal_based) */}
              {data.goalType === 'goal_based' && (
                <div className="space-y-2">
                  <Label htmlFor="goalValue">Step Goal *</Label>
                  <Input
                    id="goalValue"
                    type="number"
                    value={data.goalValue}
                    onChange={(e) => setData('goalValue', e.target.value)}
                    placeholder="e.g., 10000"
                    required
                    min={1}
                  />
                  {errors.goalValue && (
                    <p className="text-sm text-destructive">{errors.goalValue}</p>
                  )}
                </div>
              )}

              {/* Visibility */}
              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select
                  value={data.visibility}
                  onValueChange={(value) => setData('visibility', value as 'private' | 'public')}
                >
                  <SelectTrigger id="visibility">
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private - Invitation only</SelectItem>
                    <SelectItem value="public">Public - Anyone can join</SelectItem>
                  </SelectContent>
                </Select>
                {errors.visibility && (
                  <p className="text-sm text-destructive">{errors.visibility}</p>
                )}
              </div>

              {/* Status (only for edit) */}
              {isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={data.status}
                    onValueChange={(value) =>
                      setData('status', value as 'draft' | 'active' | 'ended')
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="ended">Ended</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={processing}>
                  {processing ? 'Saving...' : isEdit ? 'Update Competition' : 'Create Competition'}
                </Button>
                <Button variant="outline" asChild>
                  <Link
                    href={
                      isEdit && competition ? `/competitions/${competition.id}` : '/competitions'
                    }
                  >
                    Cancel
                  </Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="mt-8">
          <Button variant="ghost" asChild>
            <Link href="/competitions">← Back to Competitions</Link>
          </Button>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
