'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AppPreloader } from '@/components/app-preloader';
import { useAuth } from '@/hooks/use-auth';
import { authApi } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const setupStatus = useQuery({
    queryKey: ['setup-status'],
    queryFn: () => authApi.getSetupStatus(),
  });

  useEffect(() => {
    if (loading || setupStatus.isLoading || !setupStatus.data) return;
    if (setupStatus.data.data.needsSetup) {
      router.replace('/setup');
      return;
    }

    router.replace(user ? '/dashboard' : '/login');
  }, [loading, router, setupStatus.data, setupStatus.isLoading, user]);

  return <AppPreloader mode={loading || setupStatus.isLoading ? 'loading' : 'redirecting'} />;
}
