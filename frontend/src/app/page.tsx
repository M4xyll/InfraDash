'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppPreloader } from '@/components/app-preloader';
import { useAuth } from '@/hooks/use-auth';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/dashboard' : '/login');
  }, [loading, router, user]);

  return <AppPreloader mode={loading ? 'loading' : 'redirecting'} />;
}
