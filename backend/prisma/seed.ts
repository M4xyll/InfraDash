import { PrismaClient, Role, DiskType, IPType, IPStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const [userCount, serverCount] = await Promise.all([
    prisma.user.count(),
    prisma.server.count(),
  ]);

  if (userCount > 0 || serverCount > 0) {
    console.log('Seed skipped: database already contains data.');
    return;
  }

  // Create users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const operatorPassword = await bcrypt.hash('operator123', 10);
  const viewerPassword = await bcrypt.hash('viewer123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@infra.local' },
    update: {},
    create: {
      email: 'admin@infra.local',
      password: adminPassword,
      name: 'Admin User',
      role: Role.ADMIN,
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: 'operator@infra.local' },
    update: {},
    create: {
      email: 'operator@infra.local',
      password: operatorPassword,
      name: 'Operator User',
      role: Role.OPERATOR,
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@infra.local' },
    update: {},
    create: {
      email: 'viewer@infra.local',
      password: viewerPassword,
      name: 'Viewer User',
      role: Role.VIEWER,
    },
  });

  console.log('Created users:', { admin, operator, viewer });

  // Create servers
  const server1 = await prisma.server.create({
    data: {
      name: 'Production Server 1',
      location: 'Paris, France',
      comment: 'Main production server - handles web traffic',
    },
  });

  const server2 = await prisma.server.create({
    data: {
      name: 'Production Server 2',
      location: 'Frankfurt, Germany',
      comment: 'Secondary production server - database cluster',
    },
  });

  const server3 = await prisma.server.create({
    data: {
      name: 'Development Server',
      location: 'London, UK',
      comment: 'Development and staging environment',
    },
  });

  console.log('Created servers:', { server1, server2, server3 });

  // Create VMs for Server 1
  const vm1 = await prisma.vM.create({
    data: {
      name: 'web-frontend-01',
      serverId: server1.id,
      comment: 'Next.js frontend application',
    },
  });

  const vm2 = await prisma.vM.create({
    data: {
      name: 'api-backend-01',
      serverId: server1.id,
      comment: 'Node.js API server',
    },
  });

  const vm3 = await prisma.vM.create({
    data: {
      name: 'cache-redis-01',
      serverId: server1.id,
      comment: 'Redis cache server',
    },
  });

  // Create VMs for Server 2
  const vm4 = await prisma.vM.create({
    data: {
      name: 'db-postgres-primary',
      serverId: server2.id,
      comment: 'PostgreSQL primary database',
    },
  });

  const vm5 = await prisma.vM.create({
    data: {
      name: 'db-postgres-replica',
      serverId: server2.id,
      comment: 'PostgreSQL read replica',
    },
  });

  // Create VMs for Server 3
  const vm6 = await prisma.vM.create({
    data: {
      name: 'dev-all-in-one',
      serverId: server3.id,
      comment: 'Development environment with all services',
    },
  });

  const vm7 = await prisma.vM.create({
    data: {
      name: 'staging-preview',
      serverId: server3.id,
      comment: 'Staging environment for QA',
    },
  });

  console.log('Created VMs');

  // Create disks
  await prisma.disk.createMany({
    data: [
      { vmId: vm1.id, name: 'root', size: 50, type: DiskType.SSD, comment: 'OS disk' },
      { vmId: vm1.id, name: 'data', size: 100, type: DiskType.SSD, comment: 'Application data' },
      { vmId: vm2.id, name: 'root', size: 50, type: DiskType.SSD, comment: 'OS disk' },
      { vmId: vm2.id, name: 'logs', size: 200, type: DiskType.HDD, comment: 'Log storage' },
      { vmId: vm3.id, name: 'root', size: 30, type: DiskType.NVME, comment: 'Fast cache disk' },
      { vmId: vm4.id, name: 'root', size: 50, type: DiskType.SSD, comment: 'OS disk' },
      { vmId: vm4.id, name: 'pgdata', size: 500, type: DiskType.NVME, comment: 'PostgreSQL data' },
      { vmId: vm4.id, name: 'pgwal', size: 100, type: DiskType.NVME, comment: 'PostgreSQL WAL' },
      { vmId: vm5.id, name: 'root', size: 50, type: DiskType.SSD, comment: 'OS disk' },
      { vmId: vm5.id, name: 'pgdata', size: 500, type: DiskType.NVME, comment: 'PostgreSQL data' },
      { vmId: vm6.id, name: 'root', size: 100, type: DiskType.SSD, comment: 'Dev environment' },
      { vmId: vm7.id, name: 'root', size: 100, type: DiskType.SSD, comment: 'Staging environment' },
    ],
  });

  console.log('Created disks');

  // Create IP addresses
  await prisma.iPAddress.createMany({
    data: [
      // Server 1 IPs
      { address: '10.0.1.1', type: IPType.NODE, status: IPStatus.IN_USE, serverId: server1.id, comment: 'Server 1 management IP' },
      { address: '192.168.1.10', type: IPType.CLIENT, status: IPStatus.IN_USE, vmId: vm1.id, comment: 'Frontend public IP' },
      { address: '192.168.1.11', type: IPType.CLIENT, status: IPStatus.IN_USE, vmId: vm2.id, comment: 'API public IP' },
      { address: '10.0.1.10', type: IPType.NODE, status: IPStatus.IN_USE, vmId: vm1.id, comment: 'Frontend internal IP' },
      { address: '10.0.1.11', type: IPType.NODE, status: IPStatus.IN_USE, vmId: vm2.id, comment: 'API internal IP' },
      { address: '10.0.1.12', type: IPType.NODE, status: IPStatus.IN_USE, vmId: vm3.id, comment: 'Redis internal IP' },

      // Server 2 IPs
      { address: '10.0.2.1', type: IPType.NODE, status: IPStatus.IN_USE, serverId: server2.id, comment: 'Server 2 management IP' },
      { address: '10.0.2.10', type: IPType.NODE, status: IPStatus.IN_USE, vmId: vm4.id, comment: 'PostgreSQL primary IP' },
      { address: '10.0.2.11', type: IPType.NODE, status: IPStatus.IN_USE, vmId: vm5.id, comment: 'PostgreSQL replica IP' },

      // Server 3 IPs
      { address: '10.0.3.1', type: IPType.NODE, status: IPStatus.IN_USE, serverId: server3.id, comment: 'Server 3 management IP' },
      { address: '10.0.3.10', type: IPType.NODE, status: IPStatus.IN_USE, vmId: vm6.id, comment: 'Dev VM IP' },
      { address: '10.0.3.11', type: IPType.NODE, status: IPStatus.IN_USE, vmId: vm7.id, comment: 'Staging VM IP' },

      // Reserved IPs
      { address: '192.168.1.100', type: IPType.RESERVED, status: IPStatus.RESERVED, comment: 'Reserved for load balancer' },
      { address: '192.168.1.101', type: IPType.RESERVED, status: IPStatus.RESERVED, comment: 'Reserved for failover' },

      // Free IPs
      { address: '10.0.1.50', type: IPType.NODE, status: IPStatus.FREE, comment: 'Available for new VM' },
      { address: '10.0.1.51', type: IPType.NODE, status: IPStatus.FREE, comment: 'Available for new VM' },
      { address: '10.0.2.50', type: IPType.NODE, status: IPStatus.FREE, comment: 'Available for new VM' },
    ],
  });

  console.log('Created IP addresses');

  // Create network connections
  await prisma.networkConnection.createMany({
    data: [
      { name: 'Server 1 Uplink', bandwidth: 10000, serverId: server1.id, comment: '10 Gbps uplink' },
      { name: 'Server 2 Uplink', bandwidth: 10000, serverId: server2.id, comment: '10 Gbps uplink' },
      { name: 'Server 3 Uplink', bandwidth: 1000, serverId: server3.id, comment: '1 Gbps uplink (dev)' },
      { name: 'Frontend to API', bandwidth: 1000, vmId: vm1.id, comment: 'Internal connection' },
      { name: 'API to Redis', bandwidth: 1000, vmId: vm2.id, comment: 'Cache connection' },
      { name: 'API to DB', bandwidth: 1000, vmId: vm4.id, comment: 'Database connection' },
      { name: 'DB Replication', bandwidth: 1000, vmId: vm5.id, comment: 'Replication stream' },
    ],
  });

  console.log('Created network connections');

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
