'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, Line, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  Handle,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MOUSE } from 'three';
import { GraphConnection, MonitoringStatus, Server, WorkspacePosition, infraApi, monitoringApi, workspaceApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import {
  ActivityIcon,
  DatabaseStackIcon,
  DiskIcon,
  ExitFullscreenIcon,
  FullscreenIcon,
  GlobeNetworkIcon,
  RouteIcon,
  ServerIcon,
  VmIcon,
} from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, PageIntro, Panel } from '@/components/page-kit';

type WorkspaceNodeData = {
  kind: 'internet' | 'server' | 'vm';
  title: string;
  subtitle?: string;
  disks?: number;
  ips?: number;
  vms?: number;
  monitoring?: {
    configured: boolean;
    online: boolean;
    cpu?: number;
    memory?: number;
    storage?: number;
  };
};

type WorkspaceFlowNode = Node<WorkspaceNodeData>;
type WorkspaceGraphData = {
  tree: Server[];
  networkConnections: GraphConnection[];
};
type ViewMode = '2d' | '3d';
type Workspace3DNode = {
  id: string;
  kind: 'internet' | 'server' | 'vm';
  title: string;
  subtitle?: string;
  ips: string[];
  disks: Array<{ label: string; size: number }>;
  summary: string[];
  position: [number, number, number];
  color: string;
  accent: string;
};
type Workspace3DEdge = {
  id: string;
  points: Array<[number, number, number]>;
  color: string;
};

function WorkspaceNode({ data }: NodeProps<WorkspaceFlowNode>) {
  if (data.kind === 'internet') {
    return (
      <>
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-3 !w-3 !border-2 !border-[var(--surface-strong)] !bg-[var(--accent-color)]"
        />
        <div className="min-w-[190px] rounded-[28px] border border-[var(--border-color)] bg-[var(--text-color)] px-5 py-4 text-[var(--surface-strong)] shadow-[var(--panel-shadow)]">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[color-mix(in_srgb,var(--surface-strong)_18%,transparent)] p-2.5 text-[var(--surface-strong)]">
              <RouteIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[color-mix(in_srgb,var(--surface-strong)_58%,transparent)]">Entry point</p>
              <p className="mt-2 text-lg font-semibold">Internet</p>
              <p className="mt-1 text-sm text-[color-mix(in_srgb,var(--surface-strong)_72%,transparent)]">External ingress and upstream connectivity</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (data.kind === 'server') {
    const monitoring = data.monitoring;
    const isConfigured = Boolean(monitoring?.configured);
    const isOnline = Boolean(monitoring?.online);
    const hasLiveStats = isOnline;
    const monitoringTone = !isConfigured
      ? 'border-[var(--border-color)] bg-[var(--surface-soft)] text-[var(--muted-text)]'
      : isOnline
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
        : 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';

    return (
      <>
        <Handle
          type="target"
          position={Position.Top}
          className="!h-3 !w-3 !border-2 !border-[var(--surface-strong)] !bg-[var(--accent-color)]"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-3 !w-3 !border-2 !border-[var(--surface-strong)] !bg-[var(--text-color)]"
        />
        <div className="min-w-[280px] rounded-[30px] border border-[var(--border-color)] bg-[var(--surface-strong)] p-5 shadow-[var(--panel-shadow)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[var(--text-color)] p-2.5 text-[var(--surface-strong)]">
                <ServerIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-text)]">Server</p>
                <p className="mt-1 text-lg font-semibold text-[var(--text-color)]">{data.title}</p>
                <p className="mt-1 text-sm text-[var(--muted-text)]">{data.subtitle || 'No location recorded'}</p>
              </div>
            </div>
            <Badge tone="accent">{data.vms || 0} VMs</Badge>
          </div>
          <div className="mt-4">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${monitoringTone}`}>
              <span className={`h-2 w-2 rounded-full ${isConfigured ? (isOnline ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-[var(--border-color)]'}`} />
              {!isConfigured ? 'Monitoring is not linked' : isOnline ? 'Live telemetry' : 'Agent offline'}
            </div>
          </div>
          {isConfigured ? (
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <div className="rounded-[22px] border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-3">
                <div className="flex items-center gap-2 text-[var(--muted-text)]">
                  <ActivityIcon className="h-4 w-4" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em]">CPU</span>
                </div>
                <p className="mt-2 text-base font-semibold text-[var(--text-color)]">{hasLiveStats ? `${monitoring?.cpu}%` : '--'}</p>
              </div>
              <div className="rounded-[22px] border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-3">
                <div className="flex items-center gap-2 text-[var(--muted-text)]">
                  <DatabaseStackIcon className="h-4 w-4" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em]">RAM</span>
                </div>
                <p className="mt-2 text-base font-semibold text-[var(--text-color)]">{hasLiveStats ? `${monitoring?.memory}%` : '--'}</p>
              </div>
              <div className="rounded-[22px] border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-3">
                <div className="flex items-center gap-2 text-[var(--muted-text)]">
                  <DiskIcon className="h-4 w-4" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Storage</span>
                </div>
                <p className="mt-2 text-base font-semibold text-[var(--text-color)]">{hasLiveStats ? `${monitoring?.storage}%` : '--'}</p>
              </div>
            </div>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[var(--surface-soft)] px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-text)]">IP pool</p>
              <p className="mt-1 text-base font-semibold text-[var(--text-color)]">{data.ips || 0}</p>
            </div>
            <div className="rounded-2xl bg-[var(--surface-soft)] px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-text)]">Children</p>
              <p className="mt-1 text-base font-semibold text-[var(--text-color)]">{data.vms || 0}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-[var(--surface-strong)] !bg-[#c0841a]"
      />
      <div className="min-w-[220px] rounded-[24px] border border-[var(--border-color)] bg-[var(--surface-soft)] p-4 shadow-[var(--panel-shadow)]">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-2 text-[var(--accent-color)]">
            <VmIcon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-text)]">Virtual machine</p>
            <p className="mt-1 truncate text-base font-semibold text-[var(--text-color)]">{data.title}</p>
            <p className="mt-1 text-sm text-[var(--muted-text)]">{data.subtitle || 'Attached workload'}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs text-[var(--muted-text)]">
            <DiskIcon className="h-3.5 w-3.5" />
            {data.disks || 0} disks
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs text-[var(--muted-text)]">
            <GlobeNetworkIcon className="h-3.5 w-3.5" />
            {data.ips || 0} IPs
          </div>
        </div>
      </div>
    </>
  );
}

const nodeTypes = {
  workspaceNode: WorkspaceNode,
};

function attachMonitoringToNodes(nodes: Node[], monitoringMap: Map<string, MonitoringStatus>) {
  return nodes.map((node) => {
    if (!node.id.startsWith('server-')) return node;

    const serverId = node.id.replace('server-', '');
    const monitoring = monitoringMap.get(serverId);

    return {
      ...node,
      data: {
        ...node.data,
        monitoring: {
          configured: monitoring?.configured || false,
          online: monitoring?.online || false,
          cpu: monitoring?.latest?.cpu.usagePercent,
          memory: monitoring?.latest?.memory.usagePercent,
          storage: monitoring?.latest?.storage.usagePercent,
        },
      },
    };
  });
}

function toFlow(
  tree: Server[],
  networkConnections: GraphConnection[],
  saved: Map<string, WorkspacePosition>,
  monitoringMap: Map<string, MonitoringStatus>,
) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const baseServerY = 190;
  const baseVmY = 470;
  const serverWidth = 280;
  const vmWidth = 220;
  const vmSpacing = 260;
  let currentX = 120;

  nodes.push({
    id: 'internet',
    position: saved.get('internet') || { x: 420, y: 30 },
    type: 'workspaceNode',
    sourcePosition: Position.Bottom,
    data: {
      kind: 'internet',
      title: 'Internet',
    },
  });

  tree.forEach((server) => {
    const serverId = `server-${server.id}`;
    const vmCount = server.vms?.length || 0;
    const clusterWidth = Math.max(serverWidth, vmCount > 0 ? vmCount * vmSpacing - (vmSpacing - vmWidth) : vmWidth);
    const serverPos = saved.get(serverId) || { x: currentX + (clusterWidth - serverWidth) / 2, y: baseServerY };

    nodes.push({
      id: serverId,
      position: serverPos,
      type: 'workspaceNode',
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      data: {
        kind: 'server',
        title: server.name,
        subtitle: server.location || 'No location',
        ips: server.ips?.length || 0,
        vms: vmCount,
        monitoring: {
          configured: monitoringMap.get(server.id)?.configured || false,
          online: monitoringMap.get(server.id)?.online || false,
          cpu: monitoringMap.get(server.id)?.latest?.cpu.usagePercent,
          memory: monitoringMap.get(server.id)?.latest?.memory.usagePercent,
          storage: monitoringMap.get(server.id)?.latest?.storage.usagePercent,
        },
      },
    });

    const serverLink = networkConnections.find((item) => item.serverId === server.id && !item.vmId);
    edges.push({
      id: `internet-${server.id}`,
      source: 'internet',
      target: serverId,
      type: 'smoothstep',
      animated: false,
      label: serverLink ? `${serverLink.bandwidth} Mbps` : undefined,
      style: { stroke: serverLink?.color || '#0f766e', strokeWidth: 2.5 },
      labelStyle: { fill: 'var(--muted-text)', fontSize: 12, fontWeight: 600 },
    });

    server.vms?.forEach((vm, vmIndex) => {
      const vmId = `vm-${vm.id}`;
      const vmStartX = currentX + (clusterWidth - (vmCount * vmSpacing - (vmSpacing - vmWidth))) / 2;
      const vmPos = saved.get(vmId) || { x: vmStartX + vmIndex * vmSpacing, y: baseVmY };
      nodes.push({
        id: vmId,
        position: vmPos,
        data: {
          kind: 'vm',
          title: vm.name,
          subtitle: server.name,
          disks: vm.disks?.length || 0,
          ips: vm.ips?.length || 0,
        },
        type: 'workspaceNode',
        targetPosition: Position.Top,
      });

      const vmLink = networkConnections.find((item) => item.vmId === vm.id);
      edges.push({
        id: `${server.id}-${vm.id}`,
        source: serverId,
        target: vmId,
        type: 'smoothstep',
        animated: false,
        label: vmLink ? `${vmLink.bandwidth} Mbps` : undefined,
        style: { stroke: vmLink?.color || '#d97706', strokeWidth: 2 },
        labelStyle: { fill: 'var(--muted-text)', fontSize: 11, fontWeight: 600 },
      });
    });

    currentX += clusterWidth + 130;
  });

  return { nodes, edges };
}

function WorkspaceHeader({
  serverCount,
  vmCount,
  viewMode,
  setViewMode,
  extraActions,
}: {
  serverCount: number;
  vmCount: number;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  extraActions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="topbar-chip">
        <ServerIcon className="h-4 w-4 text-[var(--text-color)]" />
        {serverCount} servers
      </div>
      <div className="topbar-chip">
        <VmIcon className="h-4 w-4 text-[var(--accent-color)]" />
        {vmCount} VMs
      </div>
      <div className="inline-flex rounded-full border border-[var(--border-color)] bg-[var(--surface-soft)] p-1">
        <button
          type="button"
          onClick={() => setViewMode('2d')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${viewMode === '2d' ? 'bg-[var(--text-color)] text-[var(--surface-strong)]' : 'text-[var(--muted-text)] hover:text-[var(--text-color)]'}`}
        >
          2D canvas
        </button>
        <button
          type="button"
          onClick={() => setViewMode('3d')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${viewMode === '3d' ? 'bg-[var(--text-color)] text-[var(--surface-strong)]' : 'text-[var(--muted-text)] hover:text-[var(--text-color)]'}`}
        >
          3D preview
        </button>
      </div>
      {extraActions}
    </div>
  );
}

function getScenePalette(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    return {
      background: '#07111d',
      fog: '#07111d',
      ground: '#0d1727',
      grid: '#233148',
      internet: '#dce8f5',
      internetAccent: '#a7c7e7',
      server: '#1f6f78',
      serverAccent: '#7fd1d8',
      vm: '#8f5a18',
      vmAccent: '#f7ca84',
      label: '#e6edf5',
      labelMuted: '#9db0c7',
      edgeNeutral: '#4f647c',
    };
  }

  return {
    background: '#eef3f7',
    fog: '#eef3f7',
    ground: '#e4ebf2',
    grid: '#cad6e3',
    internet: '#18263a',
    internetAccent: '#8cabd3',
    server: '#0f766e',
    serverAccent: '#78d7cf',
    vm: '#c0841a',
    vmAccent: '#f3cc84',
    label: '#152033',
    labelMuted: '#5e6b82',
    edgeNeutral: '#94a3b8',
  };
}

function build3DScene(tree: Server[], networkConnections: GraphConnection[], theme: 'light' | 'dark') {
  const palette = getScenePalette(theme);
  const nodes: Workspace3DNode[] = [];
  const edges: Workspace3DEdge[] = [];
  const serverSpacing = 18;
  const vmSpacingX = 7;
  const vmSpacingZ = 8;
  const maxPerRow = 3;
  const totalWidth = Math.max((tree.length - 1) * serverSpacing, 0);
  const originX = -totalWidth / 2;

  nodes.push({
    id: 'internet',
    kind: 'internet',
    title: 'Internet',
    subtitle: 'External ingress and upstream connectivity',
    ips: [],
    disks: [],
    summary: ['Entry point'],
    position: [0, 7, -26],
    color: palette.internet,
    accent: palette.internetAccent,
  });

  tree.forEach((server, index) => {
    const serverX = originX + index * serverSpacing;
    const vmCount = server.vms?.length || 0;
    const serverPos: [number, number, number] = [serverX, 4.2, 0];

    nodes.push({
      id: `server-${server.id}`,
      kind: 'server',
      title: server.name,
      subtitle: server.location || 'No location recorded',
      ips: (server.ips || []).map((ip) => ip.address),
      disks: (server.vms || []).flatMap((vm) =>
        (vm.disks || []).map((disk) => ({
          label: `${vm.name}${disk.name ? ` / ${disk.name}` : ''}`,
          size: disk.size,
        })),
      ),
      summary: [`${server.ips?.length || 0} IPs`, `${vmCount} VMs`],
      position: serverPos,
      color: palette.server,
      accent: palette.serverAccent,
    });

    const serverLink = networkConnections.find((item) => item.serverId === server.id && !item.vmId);
    edges.push({
      id: `internet-${server.id}`,
      points: [
        [0, 6.4, -24],
        [serverX * 0.42, 7.8, -12],
        [serverPos[0], 5.1, -1.4],
      ],
      color: serverLink?.color || palette.edgeNeutral,
    });

    server.vms?.forEach((vm, vmIndex) => {
      const row = Math.floor(vmIndex / maxPerRow);
      const rowCount = Math.min(maxPerRow, vmCount - row * maxPerRow);
      const col = vmIndex % maxPerRow;
      const vmX = serverX + (col - (rowCount - 1) / 2) * vmSpacingX;
      const vmZ = 14 + row * vmSpacingZ;
      const vmPos: [number, number, number] = [vmX, 1.6, vmZ];
      const vmLink = networkConnections.find((item) => item.vmId === vm.id);

      nodes.push({
        id: `vm-${vm.id}`,
        kind: 'vm',
        title: vm.name,
        subtitle: server.name,
        ips: (vm.ips || []).map((ip) => ip.address),
        disks: (vm.disks || []).map((disk) => ({
          label: disk.name || disk.type,
          size: disk.size,
        })),
        summary: [`${vm.disks?.length || 0} disks`, `${vm.ips?.length || 0} IPs`],
        position: vmPos,
        color: palette.vm,
        accent: palette.vmAccent,
      });

      edges.push({
        id: `${server.id}-${vm.id}`,
        points: [
          [serverPos[0], 3.1, 1.6],
          [serverPos[0], 2.2, vmZ * 0.56],
          [vmPos[0], 1.5, vmPos[2] - 1.2],
        ],
        color: vmLink?.color || palette.vm,
      });
    });
  });

  return { nodes, edges, palette };
}

function Workspace3DNodeMesh({
  node,
  labelColor,
  mutedLabelColor,
}: {
  node: Workspace3DNode;
  labelColor: string;
  mutedLabelColor: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const isInternet = node.kind === 'internet';
  const isServer = node.kind === 'server';
  const scale: [number, number, number] = isInternet ? [6, 1.6, 6] : isServer ? [7.4, 2.6, 5.2] : [4.8, 1.45, 3.4];
  const bodyY = node.position[1];

  return (
    <group
      position={node.position}
      onPointerOver={(event) => {
        event.stopPropagation();
        setIsHovered(true);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        setIsHovered(false);
      }}
    >
      <mesh position={[0, -bodyY + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[isInternet ? 4.8 : isServer ? 4.4 : 2.9, 48]} />
        <meshStandardMaterial color={node.accent} transparent opacity={0.1} />
      </mesh>

      <mesh castShadow receiveShadow>
        <boxGeometry args={scale} />
        <meshStandardMaterial color={node.color} roughness={0.38} metalness={0.12} />
      </mesh>

      <mesh position={[0, scale[1] * 0.58, 0]} castShadow>
        <boxGeometry args={[scale[0] * 0.92, 0.12, scale[2] * 0.92]} />
        <meshStandardMaterial color={node.accent} roughness={0.2} metalness={0.28} />
      </mesh>

      {isInternet ? (
        <mesh position={[0, scale[1] * 0.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.1, 0.18, 16, 48]} />
          <meshStandardMaterial color={node.accent} emissive={node.accent} emissiveIntensity={0.15} />
        </mesh>
      ) : null}

      <Html position={[0, scale[1] * 0.52, 0]} center distanceFactor={13} transform occlude>
        <div className="workspace-3d-nameplate" style={{ color: isInternet ? 'var(--surface-strong)' : labelColor }}>
          {node.title}
        </div>
      </Html>

      {isHovered ? (
        <Html position={[0, scale[1] * 0.82 + 1.2, 0]} center distanceFactor={12} transform occlude>
          <div className="workspace-3d-label" style={{ color: labelColor }}>
            <p className="workspace-3d-label-kicker" style={{ color: mutedLabelColor }}>
              {node.kind === 'internet' ? 'UPSTREAM' : node.kind.toUpperCase()}
            </p>
            <p className="workspace-3d-label-title">{node.title}</p>
            {node.subtitle ? (
              <p className="workspace-3d-label-subtitle" style={{ color: mutedLabelColor }}>
                {node.subtitle}
              </p>
            ) : null}
            <div className="workspace-3d-label-stats">
              {node.summary.map((stat) => (
                <span key={stat} className="workspace-3d-label-chip">
                  {stat}
                </span>
              ))}
            </div>
            {node.ips.length ? (
              <div className="workspace-3d-detail-block">
                <p className="workspace-3d-detail-title">IP addresses</p>
                <div className="workspace-3d-detail-list">
                  {node.ips.map((ip) => (
                    <span key={ip} className="workspace-3d-detail-chip">
                      {ip}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {node.disks.length ? (
              <div className="workspace-3d-detail-block">
                <p className="workspace-3d-detail-title">Disks</p>
                <div className="workspace-3d-disk-list">
                  {node.disks.map((disk) => (
                    <div key={`${disk.label}-${disk.size}`} className="workspace-3d-disk-row">
                      <span className="workspace-3d-disk-name">{disk.label}</span>
                      <span className="workspace-3d-disk-size">{disk.size} GB</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function Workspace3DScene({ graphData }: { graphData: WorkspaceGraphData }) {
  const { theme } = useTheme();
  const { nodes, edges, palette } = useMemo(
    () => build3DScene(graphData.tree || [], graphData.networkConnections || [], theme),
    [graphData, theme],
  );

  return (
    <Canvas shadows dpr={[1, 1.8]} gl={{ antialias: true }} style={{ background: palette.background }}>
      <fog attach="fog" args={[palette.fog, 36, 92]} />
      <color attach="background" args={[palette.background]} />
      <PerspectiveCamera makeDefault position={[0, 22, 34]} fov={48} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[18, 24, 10]} intensity={1.15} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <pointLight position={[-12, 16, -14]} intensity={0.5} color={palette.serverAccent} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 6]}>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color={palette.ground} roughness={1} metalness={0} />
      </mesh>
      <gridHelper args={[160, 48, palette.grid, palette.grid]} position={[0, 0.01, 6]} />

      {edges.map((edge) => (
        <Line key={edge.id} points={edge.points} color={edge.color} lineWidth={2.2} dashed dashSize={1.4} gapSize={0.8} />
      ))}

      {nodes.map((node) => (
        <Workspace3DNodeMesh
          key={node.id}
          node={node}
          labelColor={palette.label}
          mutedLabelColor={palette.labelMuted}
        />
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={16}
        maxDistance={88}
        minPolarAngle={0.45}
        maxPolarAngle={1.32}
        target={[0, 3.2, 8]}
        mouseButtons={{
          LEFT: MOUSE.PAN,
          MIDDLE: MOUSE.DOLLY,
          RIGHT: MOUSE.ROTATE,
        }}
      />
    </Canvas>
  );
}

function WorkspaceCanvas2D({
  graphData,
  savedMap,
  monitoringMap,
  viewMode,
  setViewMode,
}: {
  graphData: WorkspaceGraphData;
  savedMap: Map<string, WorkspacePosition>;
  monitoringMap: Map<string, MonitoringStatus>;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) {
  const { token } = useAuth();
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const { fitView } = useReactFlow();
  const saveLayout = useMutation({
    mutationFn: (positions: WorkspacePosition[]) => workspaceApi.saveLayout(token!, positions),
    onMutate: () => {
      setSaveState('saving');
    },
    onSuccess: () => {
      setLastSavedAt(new Date());
      setSaveState('saved');
    },
    onError: () => {
      setSaveState('error');
    },
  });

  const initial = useMemo(() => {
    return toFlow(graphData.tree || [], graphData.networkConnections || [], savedMap, monitoringMap);
  }, [graphData, savedMap, monitoringMap]);
  const structure = useMemo(() => {
    return toFlow(graphData.tree || [], graphData.networkConnections || [], savedMap, new Map());
  }, [graphData, savedMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const serverCount = graphData.tree.length || 0;
  const vmCount = graphData.tree.reduce((sum, server) => sum + (server.vms?.length || 0), 0);

  useEffect(() => {
    setNodes(attachMonitoringToNodes(structure.nodes, monitoringMap));
    setEdges(structure.edges);
    setTimeout(() => fitView({ padding: 0.18 }), 50);
  }, [fitView, monitoringMap, setEdges, setNodes, structure.edges, structure.nodes]);

  useEffect(() => {
    setNodes((current) => attachMonitoringToNodes(current, monitoringMap));
  }, [monitoringMap, setNodes]);

  useEffect(() => {
    if (!nodes.length) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      handleSaveLayout();
    }, 900);
  }, [nodes]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === canvasRef.current);
      setTimeout(() => fitView({ padding: 0.2 }), 50);
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [fitView]);

  async function toggleFullscreen() {
    if (!canvasRef.current) return;

    if (document.fullscreenElement === canvasRef.current) {
      await document.exitFullscreen();
      return;
    }

    await canvasRef.current.requestFullscreen();
  }

  function buildPositions() {
    return nodes.map((node) => ({
      nodeId: node.id,
      x: node.position.x,
      y: node.position.y,
    }));
  }

  function getSaveLabel() {
    if (saveState === 'saving') return 'Saving...';
    if (saveState === 'saved') return lastSavedAt ? `Saved at ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saved';
    if (saveState === 'error') return 'Save failed';
    return 'Autosave on';
  }

  function getSaveButtonLabel() {
    if (saveState === 'saving') return 'Saving...';
    if (saveState === 'saved') return 'Saved';
    if (saveState === 'error') return 'Retry save';
    return 'Save';
  }

  function handleSaveLayout() {
    if (!nodes.length) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveLayout.mutate(buildPositions());
  }

  return (
    <Panel
      title="Infrastructure workspace"
      copy="Drag and arrange your nodes."
      toolbar={
        <WorkspaceHeader
          serverCount={serverCount}
          vmCount={vmCount}
          viewMode={viewMode}
          setViewMode={setViewMode}
          extraActions={
            <>
              <div className="topbar-chip hidden md:inline-flex">
                {getSaveLabel()}
              </div>
              <Button variant="ghost" onClick={handleSaveLayout} disabled={saveLayout.isPending}>
                {getSaveButtonLabel()}
              </Button>
              <Button variant="ghost" onClick={toggleFullscreen}>
                {isFullscreen ? <ExitFullscreenIcon className="mr-2 h-4 w-4" /> : <FullscreenIcon className="mr-2 h-4 w-4" />}
                {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const reset = toFlow(graphData.tree || [], graphData.networkConnections || [], new Map(), monitoringMap);
                  setNodes(reset.nodes);
                  setEdges(reset.edges);
                }}
              >
                Reset layout
              </Button>
            </>
          }
        />
      }
      className="overflow-hidden"
    >
      <div
        ref={canvasRef}
        className="workspace-flow h-[62vh] overflow-hidden rounded-[1.5rem] border animate-[fadeUp_380ms_ease] sm:h-[68vh] lg:h-[72vh]"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--surface-soft) 94%, var(--bg)) 0%, var(--surface-strong) 100%), repeating-linear-gradient(90deg, color-mix(in srgb, var(--border-color) 22%, transparent) 0, color-mix(in srgb, var(--border-color) 22%, transparent) 1px, transparent 1px, transparent 32px), repeating-linear-gradient(0deg, color-mix(in srgb, var(--border-color) 16%, transparent) 0, color-mix(in srgb, var(--border-color) 16%, transparent) 1px, transparent 1px, transparent 32px)',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.24 }}
          defaultEdgeOptions={{
            labelBgStyle: {
              fill: 'var(--surface-strong)',
              fillOpacity: 0.92,
            },
            labelBgPadding: [8, 4],
            labelBgBorderRadius: 999,
          }}
        >
          <MiniMap
            style={{ background: 'var(--bg)' }}
            nodeColor={(node) => (node.id === 'internet' ? '#172033' : node.id.startsWith('server') ? '#0f766e' : '#c0841a')}
          />
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={26} size={1.2} color="color-mix(in srgb, var(--border-color) 70%, transparent)" />
        </ReactFlow>
      </div>
    </Panel>
  );
}

function WorkspacePreview3D({
  graphData,
  viewMode,
  setViewMode,
}: {
  graphData: WorkspaceGraphData;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const serverCount = graphData.tree.length || 0;
  const vmCount = graphData.tree.reduce((sum, server) => sum + (server.vms?.length || 0), 0);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === canvasRef.current);
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    if (!canvasRef.current) return;

    if (document.fullscreenElement === canvasRef.current) {
      await document.exitFullscreen();
      return;
    }

    await canvasRef.current.requestFullscreen();
  }

  return (
    <Panel
      title="3D topology preview"
      copy="View the same layout in 3D."
      toolbar={
        <WorkspaceHeader
          serverCount={serverCount}
          vmCount={vmCount}
          viewMode={viewMode}
          setViewMode={setViewMode}
          extraActions={
            <Button variant="ghost" onClick={toggleFullscreen}>
              {isFullscreen ? <ExitFullscreenIcon className="mr-2 h-4 w-4" /> : <FullscreenIcon className="mr-2 h-4 w-4" />}
              {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            </Button>
          }
        />
      }
      className="overflow-hidden"
    >
      <div
        ref={canvasRef}
        className="workspace-3d-shell h-[62vh] overflow-hidden rounded-[1.5rem] border animate-[fadeUp_380ms_ease] sm:h-[68vh] lg:h-[72vh]"
      >
        <Workspace3DScene graphData={graphData} />

        <div className="workspace-3d-legend">
          <div className="topbar-chip">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--text-color)]" />
            Right click orbit
          </div>
          <div className="topbar-chip">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-color)]" />
            Left click pan
          </div>
          <div className="topbar-chip">
            <span className="h-2.5 w-2.5 rounded-full bg-[#d97706]" />
            Wheel zoom
          </div>
        </div>
      </div>
    </Panel>
  );
}

function WorkspaceExperience() {
  const { token } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const graph = useQuery({
    queryKey: ['graph'],
    queryFn: () => infraApi.getGraph(token!),
    enabled: Boolean(token),
  });
  const layout = useQuery({
    queryKey: ['workspace-layout'],
    queryFn: () => workspaceApi.getLayout(token!),
    enabled: Boolean(token),
  });
  const monitoringStatuses = useQuery({
    queryKey: ['monitoring-statuses'],
    queryFn: () => monitoringApi.getStatuses(token!),
    enabled: Boolean(token),
    refetchInterval: 15000,
  });

  const savedMap = useMemo(() => {
    const map = new Map<string, WorkspacePosition>();
    layout.data?.data.forEach((item) => map.set(item.nodeId, item));
    return map;
  }, [layout.data]);
  const monitoringMap = useMemo(
    () => new Map((monitoringStatuses.data?.data || []).map((entry: MonitoringStatus) => [entry.serverId, entry])),
    [monitoringStatuses.data],
  );

  if (graph.isLoading || layout.isLoading) {
    return (
      <Panel title="Workspace" copy="Loading workspace.">
        <div className="h-[72vh] rounded-[1.5rem] border bg-[var(--surface-soft)]" />
      </Panel>
    );
  }

  if (!graph.data?.data) {
    return (
      <EmptyState
        title="Workspace unavailable"
        copy="Could not load the workspace."
      />
    );
  }

  if (graph.data.data.tree.length === 0) {
    return (
      <EmptyState
        title="No topology to render"
        copy="Add servers and VMs first."
      />
    );
  }

  return viewMode === '2d' ? (
    <WorkspaceCanvas2D
      graphData={graph.data.data}
      savedMap={savedMap}
      monitoringMap={monitoringMap}
      viewMode={viewMode}
      setViewMode={setViewMode}
    />
  ) : (
    <WorkspacePreview3D
      graphData={graph.data.data}
      viewMode={viewMode}
      setViewMode={setViewMode}
    />
  );
}

export default function WorkspacePage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Topology workspace"
        title="Workspace"
        copy="Switch between the 2D and 3D views."
        actions={
          <div className="topbar-chip">
            <RouteIcon className="mr-2 inline h-4 w-4 text-[var(--accent-color)]" />
            Autosave on
          </div>
        }
      />
      <ReactFlowProvider>
        <WorkspaceExperience />
      </ReactFlowProvider>
    </div>
  );
}
