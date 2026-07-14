'use client';

import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { backupApi, BackupPayload } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import {
  ActivityIcon,
  DatabaseExportDataIcon,
  DatabaseImportDataIcon,
  File01Icon,
  ShieldIcon,
} from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState, MetricStrip, PageIntro, Panel } from '@/components/page-kit';
import { cn, formatDate } from '@/lib/utils';

type ImportMode = 'merge' | 'replace';

function getBackupCounts(backup: BackupPayload | null) {
  if (!backup) return null;

  return [
    { label: 'Users', value: backup.data.users.length, caption: 'Accounts and role assignments', icon: <ShieldIcon className="h-5 w-5" /> },
    { label: 'Servers', value: backup.data.servers.length, caption: 'Physical nodes and metadata', icon: <DatabaseExportDataIcon className="h-5 w-5" /> },
    { label: 'VMs', value: backup.data.vms.length, caption: 'Guest systems and links', icon: <ActivityIcon className="h-5 w-5" /> },
    { label: 'Workspace', value: backup.data.workspaceLayouts.length, caption: 'Saved canvas positions', icon: <DatabaseImportDataIcon className="h-5 w-5" /> },
  ];
}

export default function BackupsPage() {
  const { token, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [parsedBackup, setParsedBackup] = useState<BackupPayload | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await backupApi.exportBackup(token!);
      return response.data;
    },
    onSuccess: (backup) => {
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = backup.meta.exportedAt.replace(/[:.]/g, '-');

      link.href = url;
      link.download = `infradash-backup-${stamp}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!parsedBackup) throw new Error('Select a backup file first');
      const response = await backupApi.importBackup(token!, parsedBackup, mode);
      return response.data;
    },
    onSuccess: async (result) => {
      setImportMessage(`Backup imported in ${result.mode} mode.`);
      await queryClient.invalidateQueries();
    },
  });

  const previewItems = useMemo(() => getBackupCounts(parsedBackup), [parsedBackup]);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setLocalError(null);
    setImportMessage(null);

    if (!file) {
      setSelectedFileName('');
      setParsedBackup(null);
      return;
    }

    setSelectedFileName(file.name);

    try {
      const text = await file.text();
      const json = JSON.parse(text) as BackupPayload;

      if (!json?.meta || !json?.data) {
        throw new Error('The selected file is not a valid InfraDash backup');
      }

      const requiredKeys = ['users', 'servers', 'vms', 'disks', 'ips', 'networkConnections', 'workspaceLayouts'] as const;
      for (const key of requiredKeys) {
        if (!Array.isArray(json.data[key])) {
          throw new Error(`The backup file is missing '${key}'`);
        }
      }

      setParsedBackup(json);
    } catch (error) {
      setParsedBackup(null);
      setLocalError(error instanceof Error ? error.message : 'Failed to parse the file');
    }
  }

  if (!isAdmin) {
    return (
      <EmptyState
        title="Admin access required"
        copy="Backups include user accounts and full infrastructure data, so export and restore are restricted to administrators."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Backup center"
        icon={<DatabaseExportDataIcon className="h-4 w-4" />}
        title="Export the full estate or restore an earlier snapshot."
        copy="Use backups for migration, rollback, and offline safekeeping. Imports can either merge into the current state or fully replace it."
        actions={
          <Button variant="secondary" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
            <DatabaseExportDataIcon className="mr-2 h-4 w-4" />
            {exportMutation.isPending ? 'Preparing...' : 'Export backup'}
          </Button>
        }
      />

      <MetricStrip
        items={[
          { label: 'Scope', value: 'Full JSON', caption: 'Users, inventory, network, workspace', icon: <DatabaseExportDataIcon className="h-5 w-5" /> },
          { label: 'Import modes', value: '2', caption: 'Merge for safe replay or replace for full restore', icon: <DatabaseImportDataIcon className="h-5 w-5" /> },
          { label: 'Format', value: 'Version 1', caption: 'Portable snapshot with metadata header', icon: <File01Icon className="h-5 w-5" /> },
          { label: 'Security', value: 'Admin only', caption: 'Includes hashed credentials for account recovery', icon: <ShieldIcon className="h-5 w-5" /> },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel
          title="Import backup"
          icon={<DatabaseImportDataIcon className="h-5 w-5" />}
          copy="Choose a previous export and decide whether to merge it with the current data or replace everything."
        >
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-[var(--border-color)] bg-[var(--surface-soft)] p-1">
              {(['merge', 'replace'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition',
                    mode === option
                      ? 'bg-[var(--text-color)] text-[var(--surface-strong)]'
                      : 'text-[var(--muted-text)] hover:text-[var(--text-color)]',
                  )}
                >
                  {option === 'merge' ? 'Merge data' : 'Replace all'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group flex w-full items-center justify-between rounded-[1.75rem] border border-dashed border-[var(--border-color)] bg-[var(--surface-soft)] px-5 py-6 text-left transition hover:-translate-y-0.5 hover:bg-[var(--surface-strong)]"
            >
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-color)]">
                  <File01Icon className="h-4 w-4" />
                  {selectedFileName || 'Choose a backup file'}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-text)]">
                  Import a previous `.json` export to restore or replay infrastructure data.
                </p>
              </div>
              <Badge tone="accent">JSON</Badge>
            </button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={onFileChange} className="hidden" />

            <div className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted-text)]">
              <p className="font-semibold text-[var(--text-color)]">{mode === 'merge' ? 'Merge mode' : 'Replace mode'}</p>
              <p className="mt-2">
                {mode === 'merge'
                  ? 'Existing records are updated by ID and missing records are inserted. Current data that is not in the backup remains untouched.'
                  : 'Current users, inventory, addresses, links, and workspace layouts are removed first, then the snapshot is restored in one transaction.'}
              </p>
            </div>

            {localError ? (
              <div className="rounded-[1.5rem] border border-[var(--danger-color)]/30 bg-[var(--danger-color)]/10 px-4 py-3 text-sm text-[var(--danger-color)]">
                {localError}
              </div>
            ) : null}

            {importMessage ? (
              <div className="rounded-[1.5rem] border border-[var(--accent-color)]/25 bg-[var(--accent-color)]/10 px-4 py-3 text-sm text-[var(--text-color)]">
                {importMessage}
              </div>
            ) : null}

            {importMutation.error instanceof Error ? (
              <div className="rounded-[1.5rem] border border-[var(--danger-color)]/30 bg-[var(--danger-color)]/10 px-4 py-3 text-sm text-[var(--danger-color)]">
                {importMutation.error.message}
              </div>
            ) : null}

            <Button variant="primary" disabled={!parsedBackup || importMutation.isPending} onClick={() => importMutation.mutate()}>
              <DatabaseImportDataIcon className="mr-2 h-4 w-4" />
              {importMutation.isPending ? 'Importing...' : 'Run import'}
            </Button>
          </div>
        </Panel>

        <Panel
          title="Snapshot preview"
          icon={<ActivityIcon className="h-5 w-5" />}
          copy="Preview the selected backup before applying it to the live dataset."
        >
          {!parsedBackup || !previewItems ? (
            <EmptyState
              title="No backup selected"
              copy="Choose a backup file to inspect its metadata and record counts before importing."
            />
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-text)]">Application</p>
                  <p className="mt-3 text-lg font-semibold text-[var(--text-color)]">{parsedBackup.meta.app}</p>
                </div>
                <div className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-text)]">Exported at</p>
                  <p className="mt-3 text-lg font-semibold text-[var(--text-color)]">{formatDate(parsedBackup.meta.exportedAt)}</p>
                </div>
              </div>

              <MetricStrip items={previewItems} />

              <div className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>Version {parsedBackup.meta.version}</Badge>
                  <Badge tone="accent">{selectedFileName}</Badge>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--muted-text)]">
                  If you use <span className="font-semibold text-[var(--text-color)]">replace</span> mode and the backup does not contain your current admin account,
                  your current session may lose access after the restore.
                </p>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
