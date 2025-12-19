import type { SharedProps } from '@adonisjs/inertia/types';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Toaster } from '~/components/ui/sonner';

interface GuestLayoutProps {
  children: React.ReactNode;
}

export default function GuestLayout({ children }: GuestLayoutProps) {
  const { flash } = usePage<SharedProps>().props;

  // Automatically display flash messages as toasts
  useEffect(() => {
    if (flash?.success) {
      toast.success(flash.success);
    }
    if (flash?.error) {
      toast.error(flash.error);
    }
  }, [flash]);

  return (
    <>
      {/* Toast Notifications */}
      <Toaster />

      {/* Page Content */}
      {children}
    </>
  );
}
