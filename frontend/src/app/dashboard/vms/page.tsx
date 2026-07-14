'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Server, VM, infraApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useDeferredDelete } from '@/hooks/use-deferred-delete';
import { CommentIcon, DeleteIcon, DiskIcon, EditIcon, GlobeNetworkIcon, PlusIcon, SearchIcon, ServerIcon, VmIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalField, ModalFooter, ModalSection } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { MetricStrip, PageIntro, Panel } from '@/components/page-kit';

export default function VMsPage() {
  const { token, canCreate, canUpdate, canDelete } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [serverFilter, setServerFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VM | null>(null);
  const [form, setForm] = useState({ name: '', serverId: '', comment: '' });

  const servers = useQuery({ queryKey: ['servers'], queryFn: () => infraApi.getServers(token!), enabled: Boolean(token) });
  const vms = useQuery({ queryKey: ['vms'], queryFn: () => infraApi.getVMs(token!), enabled: Boolean(token) });

  const saveMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      editing ? infraApi.updateVM(token!, editing.id, payload) : infraApi.createVM(token!, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vms'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
        queryClient.invalidateQueries({ queryKey: ['graph'] }),
      ]);
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => infraApi.deleteVM(token!, id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vms'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
        queryClient.invalidateQueries({ queryKey: ['graph'] }),
      ]);
    },
  });

  const { hiddenIds, scheduleDelete } = useDeferredDelete<VM>({
    namespace: 'vms',
    getId: (item) => item.id,
    getLabel: (item) => item.name,
    onCommit: async (item) => {
      await deleteMutation.mutateAsync(item.id);
    },
  });

  const serverList = servers.data?.data || [];
  const vmList = vms.data?.data || [];
  const filtered = useMemo(
    () =>
      vmList.filter((item) => {
        const matchesSearch =
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.server?.name.toLowerCase().includes(search.toLowerCase());
        const matchesServer = serverFilter === 'all' || item.serverId === serverFilter;
        return matchesSearch && matchesServer;
      }),
    [search, serverFilter, vmList],
  );
  const visible = filtered.filter((item) => !hiddenIds.has(item.id));

  function openCreate() {
    setEditing(null);
    setForm({ name: '', serverId: serverList[0]?.id || '', comment: '' });
    setOpen(true);
  }

  function openEdit(item: VM) {
    setEditing(item);
    setForm({ name: item.name, serverId: item.serverId, comment: item.comment || '' });
    setOpen(true);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    saveMutation.mutate(form);
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Virtualized estate"
        icon={<VmIcon className="h-4 w-4" />}
        title="Manage guest systems in relation to their host context."
        copy="This panel keeps VM ownership visible so you can edit guests without losing track of the parent server."
        actions={canCreate ? <Button onClick={openCreate}><PlusIcon className="mr-2 h-4 w-4" />Add VM</Button> : null}
      />
      <MetricStrip
        items={[
          { label: 'Visible VMs', value: visible.length, caption: 'Guests matching the current filters', icon: <VmIcon className="h-5 w-5" /> },
          { label: 'Disk bindings', value: visible.reduce((sum, item) => sum + (item._count?.disks || 0), 0), caption: 'Storage relationships in scope', icon: <DiskIcon className="h-5 w-5" /> },
          { label: 'IP bindings', value: visible.reduce((sum, item) => sum + (item._count?.ips || 0), 0), caption: 'Address allocations in scope', icon: <GlobeNetworkIcon className="h-5 w-5" /> },
          { label: 'Servers in view', value: new Set(visible.map((item) => item.serverId)).size, caption: 'Host spread across filtered guests', icon: <ServerIcon className="h-5 w-5" /> },
        ]}
      />
      <Panel
        title="VM inventory"
        icon={<VmIcon className="h-5 w-5" />}
        copy="Filter by parent server and search by guest or host name."
        toolbar={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
            <div className="relative sm:max-w-sm">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search VMs…" className="pl-11" />
            </div>
            <Select value={serverFilter} onChange={(e) => setServerFilter(e.target.value)} className="sm:max-w-xs">
              <option value="all">All servers</option>
              {serverList.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </Select>
          </div>
        }
      >
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Server</TH>
              <TH>Disks</TH>
              <TH>IPs</TH>
              <TH>Comment</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {visible.map((item) => (
              <TR key={item.id}>
                <TD className="font-semibold">{item.name}</TD>
                <TD>{item.server?.name || '-'}</TD>
                <TD>{item._count?.disks || 0}</TD>
                <TD>{item._count?.ips || 0}</TD>
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
        title={editing ? 'Edit VM' : 'Create VM'}
        description="Attach a guest system to its host and keep a short operational note for future context."
      >
        <form className="space-y-5" onSubmit={onSubmit}>
          <ModalSection title="Placement" icon={<VmIcon className="h-4 w-4" />} copy="Every VM is linked to a server, so define its parent host upfront.">
            <div className="grid gap-4 md:grid-cols-2">
              <ModalField label="VM name" icon={<VmIcon className="h-4 w-4" />}>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </ModalField>
              <ModalField label="Parent server" icon={<ServerIcon className="h-4 w-4" />}>
                <Select value={form.serverId} onChange={(e) => setForm({ ...form, serverId: e.target.value })} required>
                  {serverList.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </Select>
              </ModalField>
            </div>
          </ModalSection>
          <ModalSection title="Notes" icon={<CommentIcon className="h-4 w-4" />} copy="Optional detail for purpose, environment, or workload ownership.">
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
