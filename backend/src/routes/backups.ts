import { Prisma, Role, DiskType, IPType, IPStatus } from '@prisma/client';
import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../types/index.js';
import { logAuditFromRequest } from '../services/audit.service.js';

type BackupPayload = {
  meta: {
    exportedAt: string;
    version: number;
    app: string;
  };
  data: {
    users: Array<{
      id: string;
      email: string;
      password: string;
      name: string;
      role: Role;
      createdAt?: string;
      updatedAt?: string;
    }>;
    servers: Array<{
      id: string;
      name: string;
      location?: string | null;
      comment?: string | null;
      createdAt?: string;
      updatedAt?: string;
    }>;
    vms: Array<{
      id: string;
      name: string;
      serverId: string;
      comment?: string | null;
      createdAt?: string;
      updatedAt?: string;
    }>;
    disks: Array<{
      id: string;
      vmId: string;
      name?: string | null;
      size: number;
      type: DiskType;
      comment?: string | null;
      createdAt?: string;
      updatedAt?: string;
    }>;
    ips: Array<{
      id: string;
      address: string;
      type: IPType;
      status: IPStatus;
      serverId?: string | null;
      vmId?: string | null;
      comment?: string | null;
      createdAt?: string;
      updatedAt?: string;
    }>;
    networkConnections: Array<{
      id: string;
      name?: string | null;
      bandwidth: number;
      color?: string | null;
      serverId?: string | null;
      vmId?: string | null;
      comment?: string | null;
      createdAt?: string;
      updatedAt?: string;
    }>;
    workspaceLayouts: Array<{
      id: string;
      userId: string;
      nodeId: string;
      x: number;
      y: number;
      createdAt?: string;
      updatedAt?: string;
    }>;
  };
};

const router = Router();

function asDate(value?: string) {
  return value ? new Date(value) : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBackupPayload(value: unknown): BackupPayload {
  if (!isObject(value) || !isObject(value.meta) || !isObject(value.data)) {
    throw new Error('Invalid backup file');
  }

  const data = value.data;
  const requiredArrays = ['users', 'servers', 'vms', 'disks', 'ips', 'networkConnections', 'workspaceLayouts'] as const;

  for (const key of requiredArrays) {
    if (!Array.isArray(data[key])) {
      throw new Error(`Backup file is missing '${key}'`);
    }
  }

  return value as BackupPayload;
}

async function replaceBackup(backup: BackupPayload) {
  await prisma.$transaction(async (tx) => {
    await tx.workspaceLayout.deleteMany();
    await tx.networkConnection.deleteMany();
    await tx.iPAddress.deleteMany();
    await tx.disk.deleteMany();
    await tx.vM.deleteMany();
    await tx.server.deleteMany();
    await tx.user.deleteMany();

    for (const user of backup.data.users) {
      await tx.user.create({
        data: {
          id: user.id,
          email: user.email,
          password: user.password,
          name: user.name,
          role: user.role,
          createdAt: asDate(user.createdAt),
          updatedAt: asDate(user.updatedAt),
        },
      });
    }

    for (const server of backup.data.servers) {
      await tx.server.create({
        data: {
          id: server.id,
          name: server.name,
          location: server.location ?? null,
          comment: server.comment ?? null,
          createdAt: asDate(server.createdAt),
          updatedAt: asDate(server.updatedAt),
        },
      });
    }

    for (const vm of backup.data.vms) {
      await tx.vM.create({
        data: {
          id: vm.id,
          name: vm.name,
          serverId: vm.serverId,
          comment: vm.comment ?? null,
          createdAt: asDate(vm.createdAt),
          updatedAt: asDate(vm.updatedAt),
        },
      });
    }

    for (const disk of backup.data.disks) {
      await tx.disk.create({
        data: {
          id: disk.id,
          vmId: disk.vmId,
          name: disk.name ?? null,
          size: disk.size,
          type: disk.type,
          comment: disk.comment ?? null,
          createdAt: asDate(disk.createdAt),
          updatedAt: asDate(disk.updatedAt),
        },
      });
    }

    for (const ip of backup.data.ips) {
      await tx.iPAddress.create({
        data: {
          id: ip.id,
          address: ip.address,
          type: ip.type,
          status: ip.status,
          serverId: ip.serverId ?? null,
          vmId: ip.vmId ?? null,
          comment: ip.comment ?? null,
          createdAt: asDate(ip.createdAt),
          updatedAt: asDate(ip.updatedAt),
        },
      });
    }

    for (const connection of backup.data.networkConnections) {
      await tx.networkConnection.create({
        data: {
          id: connection.id,
          name: connection.name ?? null,
          bandwidth: connection.bandwidth,
          color: connection.color ?? null,
          serverId: connection.serverId ?? null,
          vmId: connection.vmId ?? null,
          comment: connection.comment ?? null,
          createdAt: asDate(connection.createdAt),
          updatedAt: asDate(connection.updatedAt),
        },
      });
    }

    for (const layout of backup.data.workspaceLayouts) {
      await tx.workspaceLayout.create({
        data: {
          id: layout.id,
          userId: layout.userId,
          nodeId: layout.nodeId,
          x: layout.x,
          y: layout.y,
          createdAt: asDate(layout.createdAt),
          updatedAt: asDate(layout.updatedAt),
        },
      });
    }
  });
}

async function mergeBackup(backup: BackupPayload) {
  await prisma.$transaction(async (tx) => {
    for (const user of backup.data.users) {
      await tx.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          email: user.email,
          password: user.password,
          name: user.name,
          role: user.role,
          createdAt: asDate(user.createdAt),
          updatedAt: asDate(user.updatedAt),
        },
        update: {
          email: user.email,
          password: user.password,
          name: user.name,
          role: user.role,
          updatedAt: asDate(user.updatedAt) ?? new Date(),
        },
      });
    }

    for (const server of backup.data.servers) {
      await tx.server.upsert({
        where: { id: server.id },
        create: {
          id: server.id,
          name: server.name,
          location: server.location ?? null,
          comment: server.comment ?? null,
          createdAt: asDate(server.createdAt),
          updatedAt: asDate(server.updatedAt),
        },
        update: {
          name: server.name,
          location: server.location ?? null,
          comment: server.comment ?? null,
          updatedAt: asDate(server.updatedAt) ?? new Date(),
        },
      });
    }

    for (const vm of backup.data.vms) {
      await tx.vM.upsert({
        where: { id: vm.id },
        create: {
          id: vm.id,
          name: vm.name,
          serverId: vm.serverId,
          comment: vm.comment ?? null,
          createdAt: asDate(vm.createdAt),
          updatedAt: asDate(vm.updatedAt),
        },
        update: {
          name: vm.name,
          serverId: vm.serverId,
          comment: vm.comment ?? null,
          updatedAt: asDate(vm.updatedAt) ?? new Date(),
        },
      });
    }

    for (const disk of backup.data.disks) {
      await tx.disk.upsert({
        where: { id: disk.id },
        create: {
          id: disk.id,
          vmId: disk.vmId,
          name: disk.name ?? null,
          size: disk.size,
          type: disk.type,
          comment: disk.comment ?? null,
          createdAt: asDate(disk.createdAt),
          updatedAt: asDate(disk.updatedAt),
        },
        update: {
          vmId: disk.vmId,
          name: disk.name ?? null,
          size: disk.size,
          type: disk.type,
          comment: disk.comment ?? null,
          updatedAt: asDate(disk.updatedAt) ?? new Date(),
        },
      });
    }

    for (const ip of backup.data.ips) {
      await tx.iPAddress.upsert({
        where: { id: ip.id },
        create: {
          id: ip.id,
          address: ip.address,
          type: ip.type,
          status: ip.status,
          serverId: ip.serverId ?? null,
          vmId: ip.vmId ?? null,
          comment: ip.comment ?? null,
          createdAt: asDate(ip.createdAt),
          updatedAt: asDate(ip.updatedAt),
        },
        update: {
          address: ip.address,
          type: ip.type,
          status: ip.status,
          serverId: ip.serverId ?? null,
          vmId: ip.vmId ?? null,
          comment: ip.comment ?? null,
          updatedAt: asDate(ip.updatedAt) ?? new Date(),
        },
      });
    }

    for (const connection of backup.data.networkConnections) {
      await tx.networkConnection.upsert({
        where: { id: connection.id },
        create: {
          id: connection.id,
          name: connection.name ?? null,
          bandwidth: connection.bandwidth,
          color: connection.color ?? null,
          serverId: connection.serverId ?? null,
          vmId: connection.vmId ?? null,
          comment: connection.comment ?? null,
          createdAt: asDate(connection.createdAt),
          updatedAt: asDate(connection.updatedAt),
        },
        update: {
          name: connection.name ?? null,
          bandwidth: connection.bandwidth,
          color: connection.color ?? null,
          serverId: connection.serverId ?? null,
          vmId: connection.vmId ?? null,
          comment: connection.comment ?? null,
          updatedAt: asDate(connection.updatedAt) ?? new Date(),
        },
      });
    }

    for (const layout of backup.data.workspaceLayouts) {
      await tx.workspaceLayout.upsert({
        where: {
          userId_nodeId: {
            userId: layout.userId,
            nodeId: layout.nodeId,
          },
        },
        create: {
          id: layout.id,
          userId: layout.userId,
          nodeId: layout.nodeId,
          x: layout.x,
          y: layout.y,
          createdAt: asDate(layout.createdAt),
          updatedAt: asDate(layout.updatedAt),
        },
        update: {
          x: layout.x,
          y: layout.y,
          updatedAt: asDate(layout.updatedAt) ?? new Date(),
        },
      });
    }
  });
}

router.get('/', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const [users, servers, vms, disks, ips, networkConnections, workspaceLayouts] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.server.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.vM.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.disk.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.iPAddress.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.networkConnection.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.workspaceLayout.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    const payload = {
      success: true,
      data: {
        meta: {
          exportedAt: new Date().toISOString(),
          version: 1,
          app: 'InfraDash',
        },
        data: {
          users,
          servers,
          vms,
          disks,
          ips,
          networkConnections,
          workspaceLayouts,
        },
      },
    };

    await logAuditFromRequest(req, {
      action: 'export',
      entityType: 'backup',
      summary: 'Exported full backup snapshot',
      details: {
        users: users.length,
        servers: servers.length,
        vms: vms.length,
        disks: disks.length,
        ips: ips.length,
        networkConnections: networkConnections.length,
        workspaceLayouts: workspaceLayouts.length,
      },
    });

    res.json(payload);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to export backup' });
  }
});

router.post(
  '/import',
  authenticate,
  requireRole('ADMIN'),
  [body('mode').isIn(['merge', 'replace']), body('backup').custom((value) => isObject(value))],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const backup = parseBackupPayload(req.body.backup);
      const mode = req.body.mode as 'merge' | 'replace';

      if (mode === 'replace') {
        await replaceBackup(backup);
      } else {
        await mergeBackup(backup);
      }

      await logAuditFromRequest(req, {
        action: 'import',
        entityType: 'backup',
        summary: `Imported backup in ${mode} mode`,
        details: {
          mode,
          users: backup.data.users.length,
          servers: backup.data.servers.length,
          vms: backup.data.vms.length,
          disks: backup.data.disks.length,
          ips: backup.data.ips.length,
          networkConnections: backup.data.networkConnections.length,
          workspaceLayouts: backup.data.workspaceLayouts.length,
        },
      });

      res.json({
        success: true,
        data: {
          mode,
          counts: {
            users: backup.data.users.length,
            servers: backup.data.servers.length,
            vms: backup.data.vms.length,
            disks: backup.data.disks.length,
            ips: backup.data.ips.length,
            networkConnections: backup.data.networkConnections.length,
            workspaceLayouts: backup.data.workspaceLayouts.length,
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import backup';
      const isPrismaError = error instanceof Prisma.PrismaClientKnownRequestError;
      res.status(isPrismaError ? 400 : 500).json({ success: false, error: message });
    }
  }
);

export default router;
