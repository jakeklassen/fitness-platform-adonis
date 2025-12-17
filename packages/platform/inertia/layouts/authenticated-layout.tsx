import { Link, router } from '@inertiajs/react';
import { Activity, Menu } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '~/components/ui/sheet';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const handleLogout = () => {
    router.post('/logout');
  };

  return (
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

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-2 md:flex">
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

          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-8">
                <Button variant="ghost" asChild className="justify-start">
                  <Link href="/profile">Profile</Link>
                </Button>
                <Button variant="ghost" asChild className="justify-start">
                  <Link href="/friends">Friends</Link>
                </Button>
                <Button variant="ghost" asChild className="justify-start">
                  <Link href="/competitions">Competitions</Link>
                </Button>
                <Button variant="ghost" onClick={handleLogout} className="justify-start">
                  Log Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Page Content */}
      <main>{children}</main>
    </div>
  );
}
