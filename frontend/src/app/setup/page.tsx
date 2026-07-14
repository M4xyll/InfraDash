'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { LockSecureIcon, ShieldIcon, UserSingleIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AppPreloader } from '@/components/app-preloader';

export default function SetupPage() {
  const router = useRouter();
  const { user, completeSetup } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setupStatus = useQuery({
    queryKey: ['setup-status'],
    queryFn: () => authApi.getSetupStatus(),
  });

  useEffect(() => {
    if (!setupStatus.data) return;
    if (!setupStatus.data.data.needsSetup) {
      router.replace(user ? '/dashboard' : '/login');
    }
  }, [router, setupStatus.data, user]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await completeSetup({ name, email, password });
      queryClient.setQueryData(['setup-status'], {
        success: true,
        data: { needsSetup: false },
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  }

  if (setupStatus.isLoading || !setupStatus.data) {
    return <AppPreloader mode="loading" />;
  }

  if (!setupStatus.data.data.needsSetup) {
    return <AppPreloader mode="redirecting" />;
  }

  return (
    <main className="shell flex min-h-screen items-center justify-center py-6">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6 sm:p-8 lg:p-10">
          <div className="mb-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--muted-text)]">First install</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-color)] sm:text-4xl">
              Create the admin account
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted-text)]">
              This page is only available until the first admin account is created.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--muted-text)]">
                <UserSingleIcon className="h-4 w-4" />
                Name
              </label>
              <Input value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--muted-text)]">
                <ShieldIcon className="h-4 w-4" />
                Email
              </label>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--muted-text)]">
                <LockSecureIcon className="h-4 w-4" />
                Password
              </label>
              <Input type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>

            {error ? (
              <div className="rounded-2xl border px-4 py-3 text-sm text-[var(--danger-color)]" style={{ background: 'var(--danger-soft)' }}>
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating admin...' : 'Create admin'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
