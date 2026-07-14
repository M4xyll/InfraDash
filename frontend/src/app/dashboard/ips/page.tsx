'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IPAddress, infraApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useDeferredDelete } from '@/hooks/use-deferred-delete';
import { CommentIcon, DeleteIcon, EditIcon, GlobeNetworkIcon, PlusIcon, SearchIcon, ServerIcon, VmIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalField, ModalFooter, ModalSection } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { MetricStrip, PageIntro, Panel } from '@/components/page-kit';

type IPForm = {
  address: string;
  type: 'RESERVED' | 'CLIENT' | 'NODE';
  status: 'FREE' | 'IN_USE' | 'RESERVED';
  targetType: 'SERVER' | 'VM';
  serverId: string;
  vmId: string;
  comment: string;
};

export default function IPsPage() {
  const { token, canCreate, canUpdate, canDelete } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<IPAddress | null>(null);
  const [form, setForm] = useState<IPForm>({
    address: '',
    type: 'NODE',
    status: 'FREE',
    targetType: 'SERVER',
    serverId: '',
    vmId: '',
    comment: '',
  });

  const ips = useQuery({ queryKey: ['ips'], queryFn: () => infraApi.getIPs(token!), enabled: Boolean(token) });
  const servers = useQuery({ queryKey: ['servers'], queryFn: () => infraApi.getServers(token!), enabled: Boolean(token) });
  const vms = useQuery({ queryKey: ['vms'], queryFn: () => infraApi.getVMs(token!), enabled: Boolean(token) });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<IPAddress>) =>
      editing ? infraApi.updateIP(token!, editing.id, payload) : infraApi.createIP(token!, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ips'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
        queryClient.invalidateQueries({ queryKey: ['graph'] }),
      ]);
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => infraApi.deleteIP(token!, id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ips'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
        queryClient.invalidateQueries({ queryKey: ['graph'] }),
      ]);
    },
  });

  const { hiddenIds, scheduleDelete } = useDeferredDelete<IPAddress>({
    namespace: 'ips',
    getId: (item) => item.id,
    getLabel: (item) => item.address,
    onCommit: async (item) => {
      await deleteMutation.mutateAsync(item.id);
    },
  });

  const ipList = ips.data?.data || [];
  const serverList = servers.data?.data || [];
  const vmList = vms.data?.data || [];
  const filtered = useMemo(
    () =>
      ipList.filter((item) => {
        const matchesSearch =
          item.address.includes(search) || item.comment?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        const matchesType = typeFilter === 'all' || item.type === typeFilter;
        return Boolean(matchesSearch) && matchesStatus && matchesType;
      }),
    [ipList, search, statusFilter, typeFilter],
  );
  const visible = filtered.filter((item) => !hiddenIds.has(item.id));

  function openCreate() {
    setEditing(null);
    setForm({ address: '', type: 'NODE', status: 'FREE', targetType: 'SERVER', serverId: '', vmId: '', comment: '' });
    setOpen(true);
  }

  function openEdit(item: IPAddress) {
    setEditing(item);
    setForm({
      address: item.address,
      type: item.type,
      status: item.status,
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
        eyebrow="Address inventory"
        icon={<GlobeNetworkIcon className="h-4 w-4" />}
        title="Control availability and assignments across the address space."
        copy="The IP panel keeps type, status, and attachment visible so free, reserved, and in-use ranges are easy to audit."
        actions={canCreate ? <Button onClick={openCreate}><PlusIcon className="mr-2 h-4 w-4" />Add IP</Button> : null}
      />
      <MetricStrip
        items={[
          { label: 'Visible IPs', value: visible.length, caption: 'Addresses matching the current filters', icon: <GlobeNetworkIcon className="h-5 w-5" /> },
          { label: 'Free pool', value: visible.filter((item) => item.status === 'FREE').length, caption: 'Unassigned addresses currently visible', icon: <GlobeNetworkIcon className="h-5 w-5" /> },
          { label: 'Reserved', value: visible.filter((item) => item.status === 'RESERVED').length, caption: 'Held-back records in the current view', icon: <ServerIcon className="h-5 w-5" /> },
          { label: 'Client IPs', value: visible.filter((item) => item.type === 'CLIENT').length, caption: 'Client-facing addresses currently in scope', icon: <VmIcon className="h-5 w-5" /> },
        ]}
      />
      <Panel
        title="Address records"
        icon={<GlobeNetworkIcon className="h-5 w-5" />}
        copy="Search by IP or comment, then refine by status or address type."
        toolbar={
          <div className="flex w-full flex-col gap-3 xl:flex-row xl:justify-end">
            <div className="relative xl:max-w-sm">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search IPs…" className="pl-11" />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="xl:max-w-[180px]">
              <option value="all">All status</option>
              <option value="FREE">FREE</option>
              <option value="IN_USE">IN_USE</option>
              <option value="RESERVED">RESERVED</option>
            </Select>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="xl:max-w-[180px]">
              <option value="all">All types</option>
              <option value="NODE">NODE</option>
              <option value="CLIENT">CLIENT</option>
              <option value="RESERVED">RESERVED</option>
            </Select>
          </div>
        }
      >
        <Table>
          <THead><TR><TH>Address</TH><TH>Status</TH><TH>Type</TH><TH>Assigned</TH><TH>Comment</TH><TH>Actions</TH></TR></THead>
          <TBody>
            {visible.map((item) => (
              <TR key={item.id}>
                <TD className="font-mono font-semibold">{item.address}</TD>
                <TD><Badge tone={item.status === 'FREE' ? 'accent' : item.status === 'RESERVED' ? 'signal' : 'neutral'}>{item.status}</Badge></TD>
                <TD>{item.type}</TD>
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
        title={editing ? 'Edit IP' : 'Create IP'}
        description="Capture the address, its role, availability state, and any current assignment to a server or VM."
      >
        <form className="space-y-5" onSubmit={onSubmit}>
          <ModalSection title="Addressing" icon={<GlobeNetworkIcon className="h-4 w-4" />} copy="Core details for allocation, reservation, and assignment tracking.">
            <div className="grid gap-4 md:grid-cols-2">
              <ModalField label="IP address" icon={<GlobeNetworkIcon className="h-4 w-4" />}>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
              </ModalField>
              <ModalField label="Type" icon={<ServerIcon className="h-4 w-4" />}>
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as IPForm['type'] })}>
                  <option value="NODE">NODE</option>
                  <option value="CLIENT">CLIENT</option>
                  <option value="RESERVED">RESERVED</option>
                </Select>
              </ModalField>
              <ModalField label="Status" icon={<GlobeNetworkIcon className="h-4 w-4" />}>
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as IPForm['status'] })}>
                  <option value="FREE">FREE</option>
                  <option value="IN_USE">IN_USE</option>
                  <option value="RESERVED">RESERVED</option>
                </Select>
              </ModalField>
            </div>
          </ModalSection>
          <ModalSection title="Assignment" icon={<ServerIcon className="h-4 w-4" />} copy="Choose what this address is assigned to, then pick the target object.">
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
                  Server Assignment
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
                  VM Assignment
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
