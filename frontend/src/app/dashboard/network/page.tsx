'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NetworkConnection, infraApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useDeferredDelete } from '@/hooks/use-deferred-delete';
import { CommentIcon, DeleteIcon, EditIcon, GlobeNetworkIcon, LinkIcon, NetworkIcon, PlusIcon, SearchIcon, ServerIcon, VmIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalField, ModalFooter, ModalSection } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatBandwidth } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { MetricStrip, PageIntro, Panel } from '@/components/page-kit';

type ConnectionForm = {
  name: string;
  bandwidth: number;
  color: string;
  targetType: 'SERVER' | 'VM';
  serverId: string;
  vmId: string;
  comment: string;
};

export default function NetworkPage() {
  const { token, canCreate, canUpdate, canDelete } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NetworkConnection | null>(null);
  const [form, setForm] = useState<ConnectionForm>({
    name: '',
    bandwidth: 1000,
    color: '#0f766e',
    targetType: 'SERVER',
    serverId: '',
    vmId: '',
    comment: '',
  });

  const connections = useQuery({ queryKey: ['network-connections'], queryFn: () => infraApi.getConnections(token!), enabled: Boolean(token) });
  const servers = useQuery({ queryKey: ['servers'], queryFn: () => infraApi.getServers(token!), enabled: Boolean(token) });
  const vms = useQuery({ queryKey: ['vms'], queryFn: () => infraApi.getVMs(token!), enabled: Boolean(token) });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<NetworkConnection>) =>
      editing ? infraApi.updateConnection(token!, editing.id, payload) : infraApi.createConnection(token!, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['network-connections'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
        queryClient.invalidateQueries({ queryKey: ['graph'] }),
      ]);
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => infraApi.deleteConnection(token!, id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['network-connections'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
        queryClient.invalidateQueries({ queryKey: ['graph'] }),
      ]);
    },
  });

  const { hiddenIds, scheduleDelete } = useDeferredDelete<NetworkConnection>({
    namespace: 'network-connections',
    getId: (item) => item.id,
    getLabel: (item) => item.name || 'Unnamed connection',
    onCommit: async (item) => {
      await deleteMutation.mutateAsync(item.id);
    },
  });

  const connectionList = connections.data?.data || [];
  const serverList = servers.data?.data || [];
  const vmList = vms.data?.data || [];
  const filtered = useMemo(
    () =>
      connectionList.filter((item) => {
        const haystack = `${item.name || ''} ${item.server?.name || ''} ${item.vm?.name || ''} ${item.comment || ''}`;
        return haystack.toLowerCase().includes(search.toLowerCase());
      }),
    [connectionList, search],
  );
  const visible = filtered.filter((item) => !hiddenIds.has(item.id));

  function openCreate() {
    setEditing(null);
    setForm({ name: '', bandwidth: 1000, color: '#0f766e', targetType: 'SERVER', serverId: '', vmId: '', comment: '' });
    setOpen(true);
  }

  function openEdit(item: NetworkConnection) {
    setEditing(item);
    setForm({
      name: item.name || '',
      bandwidth: item.bandwidth,
      color: item.color || '#0f766e',
      targetType: item.vmId ? 'VM' : 'SERVER',
      serverId: item.serverId || '',
      vmId: item.vmId || '',
      comment: item.comment || '',
    });
    setOpen(true);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    saveMutation.mutate({
      ...form,
      serverId: form.serverId || undefined,
      vmId: form.vmId || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Connectivity"
        icon={<NetworkIcon className="h-4 w-4" />}
        title="Map declared uplinks and service-level paths."
        copy="Connections attach either to servers or VMs in the backend. This panel lets you manage those links while keeping throughput and target visible."
        actions={canCreate ? <Button onClick={openCreate}><PlusIcon className="mr-2 h-4 w-4" />Add connection</Button> : null}
      />
      <MetricStrip
        items={[
          { label: 'Visible links', value: visible.length, caption: 'Connections matching current search', icon: <LinkIcon className="h-5 w-5" /> },
          { label: 'Server uplinks', value: visible.filter((item) => item.serverId && !item.vmId).length, caption: 'Host-level links in the current set', icon: <ServerIcon className="h-5 w-5" /> },
          { label: 'VM links', value: visible.filter((item) => item.vmId).length, caption: 'Guest-level links in the current set', icon: <VmIcon className="h-5 w-5" /> },
          { label: 'Declared throughput', value: formatBandwidth(visible.reduce((sum, item) => sum + item.bandwidth, 0)), caption: 'Aggregate bandwidth across visible links', icon: <NetworkIcon className="h-5 w-5" /> },
        ]}
      />
      <Panel
        title="Connection records"
        icon={<LinkIcon className="h-5 w-5" />}
        copy="Search by link name, comment, or attached object."
        toolbar={
          <div className="relative w-full max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search network connections…" className="max-w-sm pl-11" />
          </div>
        }
      >
        <Table>
          <THead><TR><TH>Name</TH><TH>Bandwidth</TH><TH>Color</TH><TH>Target</TH><TH>Comment</TH><TH>Actions</TH></TR></THead>
          <TBody>
            {visible.map((item) => (
              <TR key={item.id}>
                <TD className="font-semibold">{item.name || 'Unnamed'}</TD>
                <TD>{formatBandwidth(item.bandwidth)}</TD>
                <TD><span className="inline-block h-5 w-5 rounded-full border" style={{ backgroundColor: item.color || '#0f766e' }} /></TD>
                <TD>{item.vm?.name || item.server?.name || '-'}</TD>
                <TD className="max-w-[260px] text-[var(--muted-text)]">{item.comment || '-'}</TD>
                <TD>
                  <div className="flex gap-2">
                    {canUpdate ? <Button variant="ghost" onClick={() => openEdit(item)}><EditIcon className="h-4 w-4" /></Button> : null}
                    {canDelete ? <Button variant="ghost" onClick={() => scheduleDelete(item)}><DeleteIcon className="h-4 w-4 text-[var(--danger-color)]" /></Button> : null}
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
        title={editing ? 'Edit connection' : 'Create connection'}
        description="Create or edit a connection."
      >
        <form className="space-y-5" onSubmit={onSubmit}>
          <ModalSection title="Connection details" icon={<LinkIcon className="h-4 w-4" />} copy="Main connection settings.">
            <div className="grid gap-4 md:grid-cols-2">
              <ModalField label="Connection name" icon={<LinkIcon className="h-4 w-4" />}>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </ModalField>
              <ModalField label="Bandwidth" icon={<NetworkIcon className="h-4 w-4" />}>
                <Input type="number" min={1} value={form.bandwidth} onChange={(e) => setForm({ ...form, bandwidth: Number(e.target.value) })} required />
              </ModalField>
              <ModalField label="Color" icon={<GlobeNetworkIcon className="h-4 w-4" />}>
                <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-12 p-2" />
              </ModalField>
            </div>
          </ModalSection>
          <ModalSection title="Target" icon={<NetworkIcon className="h-4 w-4" />} copy="Choose where this connection goes.">
            <div className="space-y-4">
              <div className="inline-flex rounded-full border bg-[var(--surface-strong)] p-1">
                <button
                  type="button"
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition',
                    form.targetType === 'SERVER'
                      ? 'bg-[var(--text-color)] text-[var(--surface-strong)]'
                      : 'text-[var(--muted-text)]',
                  )}
                  onClick={() => setForm({ ...form, targetType: 'SERVER', vmId: '' })}
                >
                  <ServerIcon className="mr-2 inline h-4 w-4" />
                  Server Uplink
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition',
                    form.targetType === 'VM'
                      ? 'bg-[var(--text-color)] text-[var(--surface-strong)]'
                      : 'text-[var(--muted-text)]',
                  )}
                  onClick={() => setForm({ ...form, targetType: 'VM', serverId: '' })}
                >
                  <VmIcon className="mr-2 inline h-4 w-4" />
                  VM Uplink
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-1">
                {form.targetType === 'SERVER' ? (
                  <ModalField label="Server target" icon={<ServerIcon className="h-4 w-4" />}>
                    <Select value={form.serverId} onChange={(e) => setForm({ ...form, serverId: e.target.value, vmId: '' })}>
                      <option value="">Select a server</option>
                      {serverList.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </Select>
                  </ModalField>
                ) : (
                  <ModalField label="VM target" icon={<VmIcon className="h-4 w-4" />}>
                    <Select value={form.vmId} onChange={(e) => setForm({ ...form, vmId: e.target.value, serverId: '' })}>
                      <option value="">Select a VM</option>
                      {vmList.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </Select>
                  </ModalField>
                )}
              </div>
            </div>
          </ModalSection>
          <ModalSection title="Notes" icon={<CommentIcon className="h-4 w-4" />}>
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
    </div>
  );
}
