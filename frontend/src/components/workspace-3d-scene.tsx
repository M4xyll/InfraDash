'use client';

import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, Line, OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import { MOUSE } from 'three';
import { GraphConnection, Server } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';

type WorkspaceGraphData = {
  tree: Server[];
  networkConnections: GraphConnection[];
};

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
      textOnDark: '#08131d',
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
    textOnDark: '#08131d',
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
  faceTextColor,
}: {
  node: Workspace3DNode;
  labelColor: string;
  mutedLabelColor: string;
  faceTextColor: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const isInternet = node.kind === 'internet';
  const isServer = node.kind === 'server';
  const scale: [number, number, number] = isInternet ? [6, 1.6, 6] : isServer ? [7.4, 2.6, 5.2] : [4.8, 1.45, 3.4];
  const bodyY = node.position[1];
  const textSize = isInternet ? 0.56 : isServer ? 0.52 : 0.42;
  const maxWidth = isInternet ? 5 : isServer ? 5.9 : 3.8;

  return (
    <group position={node.position}>
      <mesh position={[0, -bodyY + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[isInternet ? 4.8 : isServer ? 4.4 : 2.9, 48]} />
        <meshStandardMaterial color={node.accent} transparent opacity={0.1} />
      </mesh>

      <group
        onPointerEnter={(event) => {
          event.stopPropagation();
          setIsHovered(true);
        }}
        onPointerLeave={(event) => {
          event.stopPropagation();
          setIsHovered(false);
        }}
      >
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

        <Text
          position={[0, 0.02, scale[2] / 2 + 0.03]}
          fontSize={textSize}
          maxWidth={maxWidth}
          lineHeight={1}
          letterSpacing={-0.02}
          color={isInternet ? faceTextColor : '#f8fafc'}
          anchorX="center"
          anchorY="middle"
        >
          {node.title}
        </Text>
      </group>

      {isHovered ? (
        <Html position={[0, scale[1] * 0.82 + 1.2, 0]} center distanceFactor={12} transform occlude>
          <div className="workspace-3d-label workspace-3d-floating-detail" style={{ color: labelColor, pointerEvents: 'none' }}>
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

export function Workspace3DScene({ graphData }: { graphData: WorkspaceGraphData }) {
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
          faceTextColor={palette.textOnDark}
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

export function Workspace3DLoader() {
  return (
    <div className="workspace-3d-loader">
      <div className="workspace-3d-loader-rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="workspace-3d-loader-copy">
        <p className="workspace-3d-loader-kicker">3D preview</p>
        <p className="workspace-3d-loader-title">Building spatial topology</p>
        <p className="workspace-3d-loader-text">Loading the scene graph, materials, and camera controls.</p>
      </div>
    </div>
  );
}
