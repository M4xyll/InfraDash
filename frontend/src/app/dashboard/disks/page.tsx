'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Disk, infraApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useDeferredDelete } from '@/hooks/use-deferred-delete';
import { CommentIcon, DatabaseStackIcon, DeleteIcon, DiskIcon, EditIcon, PlusIcon, SearchIcon, VmIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalField, ModalFooter, ModalSection } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatBytes } from '@/lib/utils';
import { MetricStrip, PageIntro, Panel } from '@/components/page-kit';

type DiskForm = {
  vmId: string;
  name: string;
  size: number;
  type: 'HDD' | 'SSD' | 'NVME';
  comment: string;
};

export default function DisksPage() {
  const { token, canCreate, canUpdate, canDelete } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [vmFilter, setVmFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Disk | null>(null);
  const [form, setForm] = useState<DiskForm>({ vmId: '', name: '', size: 50, type: 'SSD', comment: '' });

  const disks = useQuery({ queryKey: ['disks'], queryFn: () => infraApi.getDisks(token!), enabled: Boolean(token) });
  const vms = useQuery({ queryKey: ['vms'], queryFn: () => infraApi.getVMs(token!), enabled: Boolean(token) });

  const saveMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      editing ? infraApi.updateDisk(token!, editing.id, payload) : infraApi.createDisk(token!, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['disks'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
        queryClient.invalidateQueries({ queryKey: ['graph'] }),
      ]);
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => infraApi.deleteDisk(token!, id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['disks'] }),
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
        queryClient.invalidateQueries({ queryKey: ['graph'] }),
      ]);
    },
  });

  const { hiddenIds, scheduleDelete } = useDeferredDelete<Disk>({
    namespace: 'disks',
    getId: (item) => item.id,
    getLabel: (item) => item.name || 'Unnamed disk',
    onCommit: async (item) => {
      await deleteMutation.mutateAsync(item.id);
    },
  });

  const vmList = vms.data?.data || [];
  const diskList = disks.data?.data || [];
  const filtered = useMemo(
    () =>
      diskList.filter((item) => {
        const matchesSearch =
          item.name?.toLowerCase().includes(search.toLowerCase()) ||
          item.vm?.name.toLowerCase().includes(search.toLowerCase());
        const matchesVm = vmFilter === 'all' || item.vmId === vmFilter;
        const matchesType = typeFilter === 'all' || item.type === typeFilter;
        return Boolean(matchesSearch) && matchesVm && matchesType;
      }),
    [diskList, search, typeFilter, vmFilter],
  );
  const visible = filtered.filter((item) => !hiddenIds.has(item.id));

  function openCreate() {
    setEditing(null);
    setForm({ vmId: vmList[0]?.id || '', name: '', size: 50, type: 'SSD', comment: '' });
    setOpen(true);
  }

  function openEdit(item: Disk) {
    setEditing(item);
    setForm({
      vmId: item.vmId,
      name: item.name || '',
      size: item.size,
      type: item.type,
      comment: item.comment || '',
    });
    setOpen(true);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    saveMutation.mutate(form);
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Storage inventory"
        icon={<DiskIcon className="h-4 w-4" />}
        title="Track provisioned capacity by guest system."
        copy="Manage disks attached to your VMs."
        actions={canCreate ? <Button onClick={openCreate}><PlusIcon className="mr-2 h-4 w-4" />Add disk</Button> : null}
      />
      <MetricStrip
        items={[
          { label: 'Visible disks', value: visible.length, caption: 'Volumes matching the filters', icon: <DiskIcon className="h-5 w-5" /> },
          { label: 'Capacity', value: formatBytes(visible.reduce((sum, item) => sum + item.size, 0)), caption: 'Total capacity in the current result set', icon: <DatabaseStackIcon className="h-5 w-5" /> },
          { label: 'NVMe volumes', value: visible.filter((item) => item.type === 'NVME').length, caption: 'High-speed disks visible right now', icon: <DiskIcon className="h-5 w-5" /> },
          { label: 'VM targets', value: new Set(visible.map((item) => item.vmId)).size, caption: 'Guests with attached visible storage', icon: <VmIcon className="h-5 w-5" /> },
        ]}
      />
      <Panel
        title="Disk records"
        icon={<DiskIcon className="h-5 w-5" />}
        copy="Search by disk or VM name and narrow by disk type or VM."
        toolbar={
          <div className="flex w-full flex-col gap-3 lg:flex-row lg:justify-end">
            <div className="relative lg:max-w-sm">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search disks…" className="pl-11" />
            </div>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="lg:max-w-[160px]">
              <option value="all">All types</option>
              <option value="HDD">HDD</option>
              <option value="SSD">SSD</option>
              <option value="NVME">NVMe</option>
            </Select>
            <Select value={vmFilter} onChange={(e) => setVmFilter(e.target.value)} className="lg:max-w-xs">
              <option value="all">All VMs</option>
              {vmList.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </Select>
          </div>
        }
      >
        <Table>
          <THead><TR><TH>Name</TH><TH>VM</TH><TH>Size</TH><TH>Type</TH><TH>Comment</TH><TH>Actions</TH></TR></THead>
          <TBody>
            {visible.map((item) => (
              <TR key={item.id}>
                <TD className="font-semibold">{item.name || 'Unnamed'}</TD>
                <TD>{item.vm?.name || '-'}</TD>
                <TD>{formatBytes(item.size)}</TD>
                <TD>{item.type}</TD>
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
        title={editing ? 'Edit disk' : 'Create disk'}
        description="Create or edit a disk."
      >
        <form className="space-y-5" onSubmit={onSubmit}>
          <ModalSection title="Storage details" icon={<DiskIcon className="h-4 w-4" />} copy="Disk settings.">
            <div className="grid gap-4 md:grid-cols-2">
              <ModalField label="Attached VM" icon={<VmIcon className="h-4 w-4" />}>
                <Select value={form.vmId} onChange={(e) => setForm({ ...form, vmId: e.target.value })} required>
                  {vmList.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </Select>
              </ModalField>
              <ModalField label="Disk name" icon={<DiskIcon className="h-4 w-4" />}>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </ModalField>
              <ModalField label="Size" icon={<DatabaseStackIcon className="h-4 w-4" />}>
                <Input type="number" min={1} value={form.size} onChange={(e) => setForm({ ...form, size: Number(e.target.value) })} required />
              </ModalField>
              <ModalField label="Type" icon={<DiskIcon className="h-4 w-4" />}>
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as DiskForm['type'] })}>
                  <option value="HDD">HDD</option>
                  <option value="SSD">SSD</option>
                  <option value="NVME">NVMe</option>
                </Select>
              </ModalField>
            </div>
          </ModalSection>
          <ModalSection title="Notes" icon={<CommentIcon className="h-4 w-4" />} copy="Optional notes.">
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
