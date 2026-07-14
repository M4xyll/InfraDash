'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MonitoringStatus, Server, infraApi, monitoringApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useDeferredDelete } from '@/hooks/use-deferred-delete';
import { ActivityIcon, CommentIcon, DeleteIcon, EditIcon, GlobeNetworkIcon, LocationPinIcon, NetworkIcon, PlusIcon, SearchIcon, ServerIcon, VmIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalField, ModalFooter, ModalSection } from '@/components/ui/modal';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatBytes, formatDate, formatDuration } from '@/lib/utils';
import { MetricStrip, PageIntro, Panel } from '@/components/page-kit';

export default function ServersPage() {
  const { token, canCreate, canUpdate, canDelete, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [editing, setEditing] = useState<Server | null>(null);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [form, setForm] = useState({ name: '', location: '', comment: '' });
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['servers'],
    queryFn: () => infraApi.getServers(token!),
    enabled: Boolean(token),
  });
  const monitoringStatuses = useQuery({
    queryKey: ['monitoring-statuses'],
    queryFn: () => monitoringApi.getStatuses(token!),
    enabled: Boolean(token),
    refetchInterval: 10000,
  });
  const monitoringDetails = useQuery({
    queryKey: ['monitoring-server', selectedServer?.id],
    queryFn: () => monitoringApi.getServerMonitoring(token!, selectedServer!.id),
    enabled: Boolean(token && selectedServer && monitorOpen),
    refetchInterval: monitorOpen ? 5000 : false,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      editing
        ? infraApi.updateServer(token!, editing.id, payload)
        : infraApi.createServer(token!, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['servers'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
        queryClient.invalidateQueries({ queryKey: ['graph'] }),
      ]);
      setOpen(false);
    },
  });
  const issueTokenMutation = useMutation({
    mutationFn: (serverId: string) => monitoringApi.issueServerToken(token!, serverId),
    onSuccess: async (response) => {
      setIssuedToken(response.data.token);
      await queryClient.invalidateQueries({ queryKey: ['monitoring-statuses'] });
      await queryClient.invalidateQueries({ queryKey: ['monitoring-server', response.data.server.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => infraApi.deleteServer(token!, id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['servers'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
        queryClient.invalidateQueries({ queryKey: ['graph'] }),
      ]);
    },
  });

  const {
    hiddenIds,
    scheduleDelete,
  } = useDeferredDelete<Server>({
    namespace: 'servers',
    getId: (item) => item.id,
    getLabel: (item) => item.name,
    onCommit: async (item) => {
      await deleteMutation.mutateAsync(item.id);
    },
  });

  const servers = query.data?.data || [];
  const statusMap = useMemo(
    () => new Map((monitoringStatuses.data?.data || []).map((entry: MonitoringStatus) => [entry.serverId, entry])),
    [monitoringStatuses.data],
  );
  const filtered = useMemo(
    () =>
      servers.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.location?.toLowerCase().includes(search.toLowerCase()),
      ),
    [search, servers],
  );
  const visible = filtered.filter((item) => !hiddenIds.has(item.id));

  function openCreate() {
    setEditing(null);
    setForm({ name: '', location: '', comment: '' });
    setOpen(true);
  }

  function openEdit(item: Server) {
    setEditing(item);
    setForm({
      name: item.name,
      location: item.location || '',
      comment: item.comment || '',
    });
    setOpen(true);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    saveMutation.mutate(form);
  }

  function openMonitoring(item: Server) {
    setSelectedServer(item);
    setIssuedToken(null);
    setMonitorOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Host inventory"
        icon={<ServerIcon className="h-4 w-4" />}
        title="Manage server records as the backbone of the environment."
        copy="Each server anchors VMs, addresses, and network links. Use this panel to maintain the host catalog."
        actions={canCreate ? <Button onClick={openCreate}><PlusIcon className="mr-2 h-4 w-4" />Add server</Button> : null}
      />

      <MetricStrip
        items={[
          { label: 'Visible servers', value: filtered.length, caption: 'Records matching the current search' },
          { label: 'Tracked VMs', value: visible.reduce((sum, item) => sum + (item._count?.vms || 0), 0), caption: 'Guests attached to visible servers', icon: <VmIcon className="h-5 w-5" /> },
          { label: 'Tracked IPs', value: visible.reduce((sum, item) => sum + (item._count?.ips || 0), 0), caption: 'Assigned addresses in scope', icon: <GlobeNetworkIcon className="h-5 w-5" /> },
          { label: 'Monitored online', value: visible.filter((item) => statusMap.get(item.id)?.online).length, caption: 'Servers currently reporting fresh telemetry', icon: <ActivityIcon className="h-5 w-5" /> },
        ]}
      />

      <Panel
        title="Server records"
        icon={<ServerIcon className="h-5 w-5" />}
        copy="Search by name or location, then edit or remove the selected record."
        toolbar={
          <div className="relative w-full max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search servers…"
              className="pl-11"
            />
          </div>
        }
      >
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Location</TH>
              <TH>Monitoring</TH>
              <TH>VMs</TH>
              <TH>IPs</TH>
              <TH>Comment</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {visible.map((item) => (
              <TR key={item.id}>
                <TD>
                  <button type="button" onClick={() => openMonitoring(item)} className="font-semibold text-left hover:text-[var(--accent-color)]">
                    {item.name}
                  </button>
                </TD>
                <TD>{item.location || '-'}</TD>
                <TD>
                  {statusMap.get(item.id)?.configured ? (
                    <span className="inline-flex items-center gap-2 text-sm">
                      <span className={`h-2.5 w-2.5 rounded-full ${statusMap.get(item.id)?.online ? 'bg-[var(--accent-color)]' : 'bg-[var(--muted-text)]'}`} />
                      {statusMap.get(item.id)?.online ? 'Live' : 'Offline'}
                    </span>
                  ) : (
                    <span className="text-[var(--muted-text)]">Not linked</span>
                  )}
                </TD>
                <TD>{item._count?.vms || 0}</TD>
                <TD>{item._count?.ips || 0}</TD>
                <TD className="max-w-[280px] text-[var(--muted-text)]">{item.comment || '-'}</TD>
                <TD>
                  <div className="flex gap-2">
                    {canUpdate ? (
                      <Button variant="ghost" onClick={() => openEdit(item)}>
                        <EditIcon className="h-4 w-4" />
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button variant="ghost" onClick={() => scheduleDelete(item)}>
                        <DeleteIcon className="h-4 w-4 text-[var(--danger-color)]" />
                      </Button>
                    ) : null}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Panel>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit server' : 'Create server'}
        description="Create or edit a server."
      >
        <form className="space-y-5" onSubmit={onSubmit}>
          <ModalSection title="Identity" icon={<ServerIcon className="h-4 w-4" />} copy="Basic server details.">
            <div className="grid gap-4 md:grid-cols-2">
              <ModalField label="Server name" icon={<ServerIcon className="h-4 w-4" />}>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </ModalField>
              <ModalField label="Location" icon={<LocationPinIcon className="h-4 w-4" />}>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </ModalField>
            </div>
          </ModalSection>
          <ModalSection title="Notes" icon={<CommentIcon className="h-4 w-4" />} copy="Optional context for rack position, ownership, or operational caveats.">
            <ModalField label="Comment" icon={<CommentIcon className="h-4 w-4" />}>
              <Textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            </ModalField>
          </ModalSection>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">{saveMutation.isPending ? 'Saving…' : 'Save'}</Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal
        open={monitorOpen}
        onClose={() => setMonitorOpen(false)}
        title={selectedServer ? `${selectedServer.name} monitoring` : 'Server monitoring'}
        description="Live server stats."
      >
        {selectedServer ? (
          <div className="space-y-5">
            <ModalSection
              title="Current status"
              icon={<ActivityIcon className="h-4 w-4" />}
              copy="Updated while this window is open."
            >
              {monitoringDetails.data?.data.latest ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.25rem] border bg-[var(--surface-strong)] p-4">
                    <p className="metric-label">CPU</p>
                    <p className="mt-2 text-2xl font-semibold">{monitoringDetails.data.data.latest.cpu.usagePercent}%</p>
                  </div>
                  <div className="rounded-[1.25rem] border bg-[var(--surface-strong)] p-4">
                    <p className="metric-label">RAM</p>
                    <p className="mt-2 text-2xl font-semibold">{monitoringDetails.data.data.latest.memory.usagePercent}%</p>
                    <p className="mt-1 text-sm text-[var(--muted-text)]">
                      {formatBytes(Math.round(monitoringDetails.data.data.latest.memory.usedBytes / 1_000_000_000))} / {formatBytes(Math.round(monitoringDetails.data.data.latest.memory.totalBytes / 1_000_000_000))}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border bg-[var(--surface-strong)] p-4">
                    <p className="metric-label">Storage</p>
                    <p className="mt-2 text-2xl font-semibold">{monitoringDetails.data.data.latest.storage.usagePercent}%</p>
                    <p className="mt-1 text-sm text-[var(--muted-text)]">
                      {formatBytes(Math.round(monitoringDetails.data.data.latest.storage.usedBytes / 1_000_000_000))} / {formatBytes(Math.round(monitoringDetails.data.data.latest.storage.totalBytes / 1_000_000_000))}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border bg-[var(--surface-strong)] p-4">
                    <p className="metric-label">Temps / uptime</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {monitoringDetails.data.data.latest.temperature.celsius ?? '-'}{monitoringDetails.data.data.latest.temperature.celsius !== null && monitoringDetails.data.data.latest.temperature.celsius !== undefined ? ' C' : ''}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted-text)]">{formatDuration(monitoringDetails.data.data.latest.uptimeSeconds)} uptime</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.25rem] border bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted-text)]">
                  No live sample yet. Link an agent and wait for its first push.
                </div>
              )}
            </ModalSection>

            <ModalSection
              title="Telemetry meta"
              icon={<ServerIcon className="h-4 w-4" />}
              copy="Latest agent details."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.25rem] border bg-[var(--surface-strong)] p-4">
                  <p className="metric-label">Link state</p>
                  <p className="mt-2 text-lg font-semibold">
                    {monitoringDetails.data?.data.online ? 'Online' : monitoringDetails.data?.data.configured ? 'Offline' : 'Not linked'}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border bg-[var(--surface-strong)] p-4">
                  <p className="metric-label">Last sample</p>
                  <p className="mt-2 text-lg font-semibold">{formatDate(monitoringDetails.data?.data.lastSeenAt)}</p>
                </div>
                <div className="rounded-[1.25rem] border bg-[var(--surface-strong)] p-4">
                  <p className="metric-label">Hostname</p>
                  <p className="mt-2 text-lg font-semibold">{monitoringDetails.data?.data.latest?.hostname || '-'}</p>
                </div>
                <div className="rounded-[1.25rem] border bg-[var(--surface-strong)] p-4">
                  <p className="metric-label">Agent version</p>
                  <p className="mt-2 text-lg font-semibold">{monitoringDetails.data?.data.latest?.agentVersion || '-'}</p>
                </div>
              </div>
            </ModalSection>

            {isAdmin ? (
              <ModalSection
                title="Agent setup"
                icon={<NetworkIcon className="h-4 w-4" />}
                copy="Issue a token and run the agent on the host."
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" onClick={() => issueTokenMutation.mutate(selectedServer.id)}>
                      {issueTokenMutation.isPending ? 'Issuing…' : 'Issue token'}
                    </Button>
                  </div>
                  {issuedToken ? (
                    <pre className="overflow-x-auto rounded-[1.25rem] border bg-[var(--surface-strong)] p-4 text-xs text-[var(--text-color)]">
{`MONITOR_API_URL="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4782/api'}/monitoring/ingest"
MONITOR_TOKEN="${issuedToken}"
node monitoring-agent/agent.mjs`}
                    </pre>
                  ) : (
                    <div className="rounded-[1.25rem] border bg-[var(--surface-strong)] p-4 text-sm text-[var(--muted-text)]">
                      Issue a token to generate the agent command for this server.
                    </div>
                  )}
                </div>
              </ModalSection>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
