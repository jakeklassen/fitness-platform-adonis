import { Head, Link, useForm } from '@inertiajs/react';
import { Activity } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import GuestLayout from '~/layouts/guest-layout';

export default function Register() {
  const { data, setData, post, processing, errors } = useForm({
    fullName: '',
    email: '',
    password: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    post('/register');
  }

  return (
    <GuestLayout>
      <Head title="Register" />

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo/Brand */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <Activity className="h-8 w-8" />
            <span className="text-2xl font-bold">Fitness Platform</span>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Create your account</CardTitle>
              <CardDescription className="text-center">
                Get started with your free account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">
                    Full Name <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={data.fullName}
                    onChange={(e) => setData('fullName', e.target.value)}
                    placeholder="John Doe"
                  />
                  {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    placeholder="you@example.com"
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    placeholder="Create a strong password"
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <Button type="submit" disabled={processing} className="w-full">
                  {processing ? 'Creating account...' : 'Create account'}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </GuestLayout>
  );
}
