import { prisma } from '../lib/prisma.js';

export async function getInfrastructureSummary() {
  const [
    totalServers,
    totalVMs,
    totalDisks,
    totalIPs,
    freeIPs,
    inUseIPs,
    reservedIPs,
    storageAggregate,
    serverBandwidthAggregate,
    vmBandwidthAggregate,
  ] = await Promise.all([
    prisma.server.count(),
    prisma.vM.count(),
    prisma.disk.count(),
    prisma.iPAddress.count(),
    prisma.iPAddress.count({ where: { status: 'FREE' } }),
    prisma.iPAddress.count({ where: { status: 'IN_USE' } }),
    prisma.iPAddress.count({ where: { status: 'RESERVED' } }),
    prisma.disk.aggregate({ _sum: { size: true } }),
    prisma.networkConnection.aggregate({
      _sum: { bandwidth: true },
      where: {
        serverId: { not: null },
        vmId: null,
      },
    }),
    prisma.networkConnection.aggregate({
      _sum: { bandwidth: true },
      where: {
        vmId: { not: null },
      },
    }),
  ]);

  const totalBandwidth = serverBandwidthAggregate._sum.bandwidth || 0;
  const allocatedBandwidth = vmBandwidthAggregate._sum.bandwidth || 0;

  return {
    totalServers,
    totalVMs,
    totalDisks,
    totalIPs,
    freeIPs,
    inUseIPs,
    reservedIPs,
    totalStorage: storageAggregate._sum.size || 0,
    totalBandwidth,
    allocatedBandwidth,
    availableBandwidth: Math.max(totalBandwidth - allocatedBandwidth, 0),
  };
}

export async function getInfrastructureGraph() {
  const [tree, networkConnections] = await Promise.all([
    prisma.server.findMany({
      include: {
        vms: {
          include: {
            disks: {
              orderBy: { name: 'asc' },
            },
            ips: {
              orderBy: { address: 'asc' },
            },
            networkConnections: true,
          },
          orderBy: { name: 'asc' },
        },
        ips: {
          orderBy: { address: 'asc' },
        },
        networkConnections: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.networkConnection.findMany({
      select: {
        id: true,
        name: true,
        bandwidth: true,
        color: true,
        serverId: true,
        vmId: true,
      },
    }).catch(() => []),
  ]);

  return {
    tree,
    networkConnections,
  };
}
