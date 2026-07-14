'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LockSecureIcon, NetworkIcon, ServerIcon, SparkIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell flex min-h-screen items-center">
      <div className="grid w-full gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="masthead relative overflow-hidden">
          <div className="relative grid gap-10 lg:min-h-[620px] lg:grid-rows-[auto_1fr_auto]">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--muted-text)]">InfraDash</p>
                <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em] text-[var(--text-color)]">
                  Infrastructure made legible.
                </h1>
              </div>
              <div className="topbar-chip">
                Private deployment
              </div>
            </div>

            <div className="grid gap-4 self-center md:grid-cols-3">
              {[
                {
                  icon: ServerIcon,
                  title: 'Asset inventory',
                  copy: 'Servers, guests, disks, and addresses in one structured control surface.',
                },
                {
                  icon: NetworkIcon,
                  title: 'Topology workspace',
                  copy: 'View your infrastructure on a canvas.',
                },
                {
                  icon: SparkIcon,
                  title: 'Operator clarity',
                  copy: 'Clean enough to use every day.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[1.75rem] border bg-[var(--surface-soft)] p-5">
                  <item.icon className="h-6 w-6 text-[var(--accent-color)]" />
                  <h2 className="mt-5 text-lg font-semibold text-[var(--text-color)]">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-text)]">{item.copy}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        <Card>
          <CardContent className="flex h-full flex-col justify-center p-8 lg:p-10">
            <div className="mb-8">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--muted-text)]">Sign in</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[var(--text-color)]">
                Enter the control panel
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted-text)]">
                Sign in to access the dashboard.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--muted-text)]">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--muted-text)]">Password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              {error ? (
                <div className="rounded-2xl border px-4 py-3 text-sm text-[var(--danger-color)]" style={{ background: 'var(--danger-soft)' }}>
                  {error}
                </div>
              ) : null}

              <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
                <LockSecureIcon className="mr-2 h-4 w-4" />
                {loading ? 'Signing in…' : 'Unlock dashboard'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
