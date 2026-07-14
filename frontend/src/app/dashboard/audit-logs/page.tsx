'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ActivityIcon, SearchIcon, ShieldIcon, UsersIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { MetricStrip, PageIntro, Panel } from '@/components/page-kit';
import { AuditLogEntry, auditApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { formatDate } from '@/lib/utils';

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getTone(action: string) {
  if (action === 'delete') return 'danger' as const;
  if (action === 'create' || action === 'import' || action === 'export') return 'accent' as const;
  if (action === 'login') return 'signal' as const;
  return 'neutral' as const;
}

export default function AuditLogsPage() {
  const { token, isAdmin } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');

  if (!isAdmin) {
    router.replace('/dashboard');
    return null;
  }

  const logs = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => auditApi.getLogs(token!),
    enabled: Boolean(token),
  });

  const list = logs.data?.data || [];
  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return list.filter((entry) =>
      `${entry.summary} ${entry.action} ${entry.entityType} ${entry.actor.email || ''}`.toLowerCase().includes(query),
    );
  }, [list, search]);

  const uniqueActors = new Set(list.map((entry) => entry.actor.email).filter(Boolean)).size;
  const destructiveCount = list.filter((entry) => entry.action === 'delete').length;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Audit trail"
        icon={<ActivityIcon className="h-4 w-4" />}
        title="Review every privileged action from one admin-only stream."
        copy="This page lists login events, inventory mutations, user changes, and backup operations captured by the backend audit service."
      />

      <MetricStrip
        items={[
          { label: 'Visible events', value: filtered.length, caption: 'Rows matching current search', icon: <ActivityIcon className="h-5 w-5" /> },
          { label: 'Actors', value: uniqueActors, caption: 'Distinct accounts present in the current window', icon: <UsersIcon className="h-5 w-5" /> },
          { label: 'Deletes', value: destructiveCount, caption: 'Destructive actions captured in the log file', icon: <ShieldIcon className="h-5 w-5" /> },
          { label: 'Latest day', value: list[0]?.timestamp ? formatDate(list[0].timestamp) : '-', caption: 'Newest event currently loaded', icon: <ActivityIcon className="h-5 w-5" /> },
        ]}
      />

      <Panel
        title="Audit events"
        icon={<ActivityIcon className="h-5 w-5" />}
        copy="Entries are stored append-only on the backend and returned newest first."
        toolbar={
          <div className="relative w-full max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events…" className="pl-11" />
          </div>
        }
      >
        <Table>
          <THead>
            <TR>
              <TH>Time</TH>
              <TH>Action</TH>
              <TH>Entity</TH>
              <TH>Actor</TH>
              <TH>Summary</TH>
              <TH>Source</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((entry: AuditLogEntry) => (
              <TR key={entry.id}>
                <TD className="whitespace-nowrap">{formatTimestamp(entry.timestamp)}</TD>
                <TD><Badge tone={getTone(entry.action)}>{entry.action}</Badge></TD>
                <TD>
                  <div className="space-y-1">
                    <div className="font-semibold">{entry.entityType}</div>
                    {entry.entityId ? <div className="text-xs text-[var(--muted-text)]">{entry.entityId}</div> : null}
                  </div>
                </TD>
                <TD>
                  <div className="space-y-1">
                    <div className="font-semibold">{entry.actor.email || 'Unknown actor'}</div>
                    {entry.actor.role ? <div className="text-xs text-[var(--muted-text)]">{entry.actor.role}</div> : null}
                  </div>
                </TD>
                <TD className="max-w-[360px]">
                  <div className="space-y-2">
                    <p>{entry.summary}</p>
                    {entry.details ? (
                      <pre className="overflow-hidden rounded-2xl bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--muted-text)]">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                </TD>
                <TD className="max-w-[220px]">
                  <div className="space-y-1 text-xs text-[var(--muted-text)]">
                    <div>{entry.request.ip || '-'}</div>
                    <div className="truncate">{entry.request.userAgent || '-'}</div>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Panel>
    </div>
  );
}
