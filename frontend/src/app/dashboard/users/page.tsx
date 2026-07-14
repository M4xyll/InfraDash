'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { User, authApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useDeferredDelete } from '@/hooks/use-deferred-delete';
import { DeleteIcon, EditIcon, LockSecureIcon, MailIcon, PlusIcon, SearchIcon, ShieldIcon, UserSingleIcon, UsersIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalField, ModalFooter, ModalSection } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { MetricStrip, PageIntro, Panel } from '@/components/page-kit';

export default function UsersPage() {
  const { token, isAdmin, user: currentUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'VIEWER' });

  if (!isAdmin) {
    router.replace('/dashboard');
    return null;
  }

  const users = useQuery({ queryKey: ['users'], queryFn: () => authApi.getUsers(token!), enabled: Boolean(token) });

  const saveMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      editing
        ? authApi.updateUser(token!, editing.id, {
            name: payload.name,
            email: payload.email,
            role: payload.role as User['role'],
            ...(payload.password ? { password: payload.password } : {}),
          })
        : authApi.createUser(token!, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authApi.deleteUser(token!, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const { hiddenIds, scheduleDelete } = useDeferredDelete<User>({
    namespace: 'users',
    getId: (item) => item.id,
    getLabel: (item) => item.email,
    onCommit: async (item) => {
      await deleteMutation.mutateAsync(item.id);
    },
  });

  const list = users.data?.data || [];
  const filtered = useMemo(
    () => list.filter((item) => `${item.name} ${item.email}`.toLowerCase().includes(search.toLowerCase())),
    [list, search],
  );
  const visible = filtered.filter((item) => !hiddenIds.has(item.id));

  function openCreate() {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'VIEWER' });
    setOpen(true);
  }

  function openEdit(item: User) {
    setEditing(item);
    setForm({ name: item.name, email: item.email, password: '', role: item.role });
    setOpen(true);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    saveMutation.mutate(form);
  }

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Identity control"
        icon={<UsersIcon className="h-4 w-4" />}
        title="Administer operator access and roles."
        copy="Manage users and roles."
        actions={<Button onClick={openCreate}><PlusIcon className="mr-2 h-4 w-4" />Add user</Button>}
      />
      <MetricStrip
        items={[
          { label: 'Visible users', value: visible.length, caption: 'Accounts matching current search', icon: <UsersIcon className="h-5 w-5" /> },
          { label: 'Admins', value: list.filter((item) => item.role === 'ADMIN').length, caption: 'Full-access accounts in the system', icon: <ShieldIcon className="h-5 w-5" /> },
          { label: 'Operators', value: list.filter((item) => item.role === 'OPERATOR').length, caption: 'Create/update access accounts', icon: <UserSingleIcon className="h-5 w-5" /> },
          { label: 'Viewers', value: list.filter((item) => item.role === 'VIEWER').length, caption: 'Read-only accounts on record', icon: <MailIcon className="h-5 w-5" /> },
        ]}
      />
      <Panel
        title="User records"
        icon={<UsersIcon className="h-5 w-5" />}
        copy="Search, edit, or remove users."
        toolbar={
          <div className="relative w-full max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className="pl-11" />
          </div>
        }
      >
        <Table>
          <THead><TR><TH>Name</TH><TH>Email</TH><TH>Role</TH><TH>Created</TH><TH>Actions</TH></TR></THead>
          <TBody>
            {visible.map((item) => (
              <TR key={item.id}>
                <TD className="font-semibold">{item.name}{item.id === currentUser?.id ? ' (You)' : ''}</TD>
                <TD>{item.email}</TD>
                <TD><Badge tone={item.role === 'ADMIN' ? 'signal' : item.role === 'OPERATOR' ? 'accent' : 'neutral'}>{item.role}</Badge></TD>
                <TD>{formatDate(item.createdAt)}</TD>
                <TD>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => openEdit(item)}><EditIcon className="h-4 w-4" /></Button>
                    {item.id !== currentUser?.id ? (
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
        title={editing ? 'Edit user' : 'Create user'}
        description="Create or edit a user."
      >
        <form className="space-y-5" onSubmit={onSubmit}>
          <ModalSection title="Account" icon={<UsersIcon className="h-4 w-4" />} copy="User details and access.">
            <div className="grid gap-4 md:grid-cols-2">
              <ModalField label="Name" icon={<UserSingleIcon className="h-4 w-4" />}>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </ModalField>
              <ModalField label="Email" icon={<MailIcon className="h-4 w-4" />}>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </ModalField>
              <ModalField
                label={editing ? 'New password' : 'Password'}
                icon={<LockSecureIcon className="h-4 w-4" />}
                hint={editing ? 'Leave empty to keep the current password.' : undefined}
              >
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editing}
                  minLength={6}
                  placeholder={editing ? 'Optional password reset' : undefined}
                />
              </ModalField>
              <ModalField label="Role" icon={<ShieldIcon className="h-4 w-4" />}>
                <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="OPERATOR">OPERATOR</option>
                  <option value="VIEWER">VIEWER</option>
                </Select>
              </ModalField>
            </div>
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
