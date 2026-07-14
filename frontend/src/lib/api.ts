const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4782/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface ApiOptions {
  method?: HttpMethod;
  body?: unknown;
  token?: string;
}

export async function api<T>(endpoint: string, options: ApiOptions = {}) {
  const { method = 'GET', body, token } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data as T;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  createdAt?: string;
  updatedAt?: string;
}

export interface Server {
  id: string;
  name: string;
  location?: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  vms?: VM[];
  ips?: IPAddress[];
  networkConnections?: NetworkConnection[];
  _count?: { vms: number; ips: number; networkConnections: number };
}

export interface VM {
  id: string;
  name: string;
  serverId: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  server?: { id: string; name: string };
  disks?: Disk[];
  ips?: IPAddress[];
  networkConnections?: NetworkConnection[];
  _count?: { disks: number; ips: number };
}

export interface Disk {
  id: string;
  vmId: string;
  name?: string;
  size: number;
  type: 'HDD' | 'SSD' | 'NVME';
  comment?: string;
  createdAt: string;
  updatedAt: string;
  vm?: { id: string; name: string; server?: { id: string; name: string } };
}

export interface IPAddress {
  id: string;
  address: string;
  type: 'RESERVED' | 'CLIENT' | 'NODE';
  status: 'FREE' | 'IN_USE' | 'RESERVED';
  serverId?: string;
  vmId?: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  server?: { id: string; name: string };
  vm?: { id: string; name: string };
}

export interface NetworkConnection {
  id: string;
  name?: string;
  bandwidth: number;
  color?: string;
  serverId?: string;
  vmId?: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  server?: { id: string; name: string };
  vm?: { id: string; name: string };
}

export interface Stats {
  totalServers: number;
  totalVMs: number;
  totalDisks: number;
  totalIPs: number;
  freeIPs: number;
  inUseIPs: number;
  reservedIPs: number;
  totalStorage: number;
  totalBandwidth: number;
  allocatedBandwidth: number;
  availableBandwidth: number;
}

export interface GraphConnection {
  id: string;
  name?: string;
  bandwidth: number;
  color?: string;
  serverId?: string;
  vmId?: string;
}

export interface GraphResponse {
  tree: Server[];
  networkConnections: GraphConnection[];
}

export interface WorkspacePosition {
  nodeId: string;
  x: number;
  y: number;
}

export interface BackupMeta {
  exportedAt: string;
  version: number;
  app: string;
}

export interface BackupPayload {
  meta: BackupMeta;
  data: {
    users: UserWithPassword[];
    servers: Server[];
    vms: VM[];
    disks: Disk[];
    ips: IPAddress[];
    networkConnections: NetworkConnection[];
    workspaceLayouts: WorkspaceLayoutRecord[];
  };
}

export interface UserWithPassword extends User {
  password: string;
}

export interface WorkspaceLayoutRecord extends WorkspacePosition {
  id: string;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MonitoringSnapshot {
  timestamp: string;
  hostname?: string;
  agentVersion?: string;
  cpu: {
    usagePercent: number;
    loadAverage?: number[];
  };
  memory: {
    usedBytes: number;
    totalBytes: number;
    usagePercent: number;
  };
  storage: {
    usedBytes: number;
    totalBytes: number;
    usagePercent: number;
  };
  temperature: {
    celsius?: number | null;
  };
  uptimeSeconds: number;
}

export interface MonitoringStatus {
  serverId: string;
  configured: boolean;
  online: boolean;
  lastSeenAt?: string;
  latest?: MonitoringSnapshot;
}

export interface ServerMonitoringResponse {
  server: { id: string; name: string };
  configured: boolean;
  online: boolean;
  lastSeenAt?: string;
  latest?: MonitoringSnapshot;
  history: MonitoringSnapshot[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: {
    userId?: string;
    email?: string;
    role?: string;
  };
  request: {
    ip?: string;
    userAgent?: string;
  };
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  details?: Record<string, unknown>;
}

export interface SetupStatus {
  needsSetup: boolean;
}

export const authApi = {
  getSetupStatus: () =>
    api<{ success: boolean; data: SetupStatus }>('/auth/setup/status'),
  initializeSetup: (body: { email: string; password: string; name: string }) =>
    api<{ success: boolean; data: { user: User; token: string } }>('/auth/setup/initialize', {
      method: 'POST',
      body,
    }),
  login: (email: string, password: string) =>
    api<{ success: boolean; data: { user: User; token: string } }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  me: (token: string) =>
    api<{ success: boolean; data: User }>('/auth/me', { token }),
  getUsers: (token: string) =>
    api<{ success: boolean; data: User[] }>('/auth/users', { token }),
  createUser: (token: string, body: { email: string; password: string; name: string; role: string }) =>
    api<{ success: boolean; data: User }>('/auth/users', { method: 'POST', token, body }),
  updateUser: (token: string, id: string, body: Partial<User> & { password?: string }) =>
    api<{ success: boolean; data: User }>(`/auth/users/${id}`, { method: 'PUT', token, body }),
  deleteUser: (token: string, id: string) =>
    api<{ success: boolean; message: string }>(`/auth/users/${id}`, { method: 'DELETE', token }),
};

export const infraApi = {
  getSummary: (token: string) =>
    api<{ success: boolean; data: Stats }>('/tree/summary', { token }),
  getGraph: (token: string) =>
    api<{ success: boolean; data: GraphResponse }>('/tree/graph', { token }),
  getServers: (token: string) =>
    api<{ success: boolean; data: Server[] }>('/servers', { token }),
  createServer: (token: string, body: Partial<Server>) =>
    api<{ success: boolean; data: Server }>('/servers', { method: 'POST', token, body }),
  updateServer: (token: string, id: string, body: Partial<Server>) =>
    api<{ success: boolean; data: Server }>(`/servers/${id}`, { method: 'PUT', token, body }),
  deleteServer: (token: string, id: string) =>
    api<{ success: boolean; message: string }>(`/servers/${id}`, { method: 'DELETE', token }),
  getVMs: (token: string) =>
    api<{ success: boolean; data: VM[] }>('/vms', { token }),
  createVM: (token: string, body: Partial<VM>) =>
    api<{ success: boolean; data: VM }>('/vms', { method: 'POST', token, body }),
  updateVM: (token: string, id: string, body: Partial<VM>) =>
    api<{ success: boolean; data: VM }>(`/vms/${id}`, { method: 'PUT', token, body }),
  deleteVM: (token: string, id: string) =>
    api<{ success: boolean; message: string }>(`/vms/${id}`, { method: 'DELETE', token }),
  getDisks: (token: string) =>
    api<{ success: boolean; data: Disk[] }>('/disks', { token }),
  createDisk: (token: string, body: Partial<Disk>) =>
    api<{ success: boolean; data: Disk }>('/disks', { method: 'POST', token, body }),
  updateDisk: (token: string, id: string, body: Partial<Disk>) =>
    api<{ success: boolean; data: Disk }>(`/disks/${id}`, { method: 'PUT', token, body }),
  deleteDisk: (token: string, id: string) =>
    api<{ success: boolean; message: string }>(`/disks/${id}`, { method: 'DELETE', token }),
  getIPs: (token: string) =>
    api<{ success: boolean; data: IPAddress[] }>('/ips', { token }),
  createIP: (token: string, body: Partial<IPAddress>) =>
    api<{ success: boolean; data: IPAddress }>('/ips', { method: 'POST', token, body }),
  updateIP: (token: string, id: string, body: Partial<IPAddress>) =>
    api<{ success: boolean; data: IPAddress }>(`/ips/${id}`, { method: 'PUT', token, body }),
  deleteIP: (token: string, id: string) =>
    api<{ success: boolean; message: string }>(`/ips/${id}`, { method: 'DELETE', token }),
  getConnections: (token: string) =>
    api<{ success: boolean; data: NetworkConnection[] }>('/network-connections', { token }),
  createConnection: (token: string, body: Partial<NetworkConnection>) =>
    api<{ success: boolean; data: NetworkConnection }>('/network-connections', {
      method: 'POST',
      token,
      body,
    }),
  updateConnection: (token: string, id: string, body: Partial<NetworkConnection>) =>
    api<{ success: boolean; data: NetworkConnection }>(`/network-connections/${id}`, {
      method: 'PUT',
      token,
      body,
    }),
  deleteConnection: (token: string, id: string) =>
    api<{ success: boolean; message: string }>(`/network-connections/${id}`, {
      method: 'DELETE',
      token,
    }),
};

export const workspaceApi = {
  getLayout: (token: string) =>
    api<{ success: boolean; data: WorkspacePosition[] }>('/workspace/layout', { token }),
  saveLayout: (token: string, positions: WorkspacePosition[]) =>
    api<{ success: boolean }>('/workspace/layout', {
      method: 'POST',
      token,
      body: { positions },
    }),
};

export const backupApi = {
  exportBackup: (token: string) =>
    api<{ success: boolean; data: BackupPayload }>('/backups', { token }),
  importBackup: (token: string, backup: BackupPayload, mode: 'merge' | 'replace') =>
    api<{
      success: boolean;
      data: {
        mode: 'merge' | 'replace';
        counts: Record<string, number>;
      };
    }>('/backups/import', {
      method: 'POST',
      token,
      body: { backup, mode },
    }),
};

export const auditApi = {
  getLogs: (token: string, limit = 250) =>
    api<{ success: boolean; data: AuditLogEntry[] }>(`/audit-logs?limit=${limit}`, { token }),
};

export const monitoringApi = {
  getStatuses: (token: string) =>
    api<{ success: boolean; data: MonitoringStatus[] }>('/monitoring/statuses', { token }),
  getServerMonitoring: (token: string, serverId: string) =>
    api<{ success: boolean; data: ServerMonitoringResponse }>(`/monitoring/servers/${serverId}`, { token }),
  issueServerToken: (token: string, serverId: string) =>
    api<{ success: boolean; data: { server: { id: string; name: string }; token: string; issuedAt: string } }>(
      `/monitoring/servers/${serverId}/token`,
      { method: 'POST', token },
    ),
};
