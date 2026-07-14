'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { infraApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { ActivityIcon, DatabaseStackIcon, GlobeNetworkIcon, LayersIcon, LinkIcon, ServerIcon, VmIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBandwidth, formatBytes } from '@/lib/utils';
import { EmptyState, MetricStrip, PageIntro, Panel } from '@/components/page-kit';

export default function OverviewPage() {
  const { token } = useAuth();
  const summary = useQuery({
    queryKey: ['summary'],
    queryFn: () => infraApi.getSummary(token!),
    enabled: Boolean(token),
  });
  const graph = useQuery({
    queryKey: ['graph'],
    queryFn: () => infraApi.getGraph(token!),
    enabled: Boolean(token),
  });

  const stats = summary.data?.data;
  const tree = graph.data?.data.tree || [];

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="System overview"
        icon={<ActivityIcon className="h-4 w-4" />}
        title="See the whole estate before you dive into any one system."
        copy="Start with a quick overview of your infrastructure."
        actions={
          <Link href="/dashboard/workspace">
            <Button variant="secondary">
              <LayersIcon className="mr-2 h-4 w-4" />
              Open workspace
            </Button>
          </Link>
        }
      />

      {stats ? (
        <MetricStrip
          items={[
            { label: 'Servers', value: stats.totalServers, caption: 'Physical or host-level nodes on record', icon: <ServerIcon className="h-5 w-5" /> },
            { label: 'Virtual machines', value: stats.totalVMs, caption: 'Guest systems attached to the estate', icon: <VmIcon className="h-5 w-5" /> },
            { label: 'Storage', value: formatBytes(stats.totalStorage), caption: 'Total provisioned capacity', icon: <DatabaseStackIcon className="h-5 w-5" /> },
            { label: 'Bandwidth', value: formatBandwidth(stats.totalBandwidth), caption: 'Declared network throughput', icon: <LinkIcon className="h-5 w-5" /> },
          ]}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Panel
          title="Hierarchy snapshot"
          icon={<LayersIcon className="h-5 w-5" />}
          copy="A quick view of your current structure."
        >
          {tree.length === 0 ? (
            <EmptyState
              title="No infrastructure yet"
              copy="Add a server from the management pages to begin mapping the environment."
            />
          ) : (
            <div className="space-y-4">
              {tree.map((server) => (
                <Card key={server.id} className="bg-[var(--surface-soft)] shadow-none">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-[var(--text-color)] p-2 text-[var(--surface-strong)]">
                            <ServerIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-[var(--text-color)]">{server.name}</h3>
                            <p className="text-sm text-[var(--muted-text)]">{server.location || 'No location recorded'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge>{server.vms?.length || 0} VMs</Badge>
                        <Badge tone="accent">{server.ips?.length || 0} IPs</Badge>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {server.vms?.map((vm) => (
                        <div key={vm.id} className="rounded-[1.5rem] border bg-[var(--surface-strong)] p-4">
                          <div>
                            <div>
                              <p className="font-semibold text-[var(--text-color)]">{vm.name}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted-text)]">
                                {vm.disks?.length || 0} disks · {vm.ips?.length || 0} IPs
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Address space" icon={<GlobeNetworkIcon className="h-5 w-5" />} copy="Current IP usage.">
            {stats ? (
              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--surface-soft)] px-5 py-4">
                  <p className="metric-label">Free IPs</p>
                  <p className="metric-value text-3xl">{stats.freeIPs}</p>
                </div>
                <div className="rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--surface-soft)] px-5 py-4">
                  <p className="metric-label">In use</p>
                  <p className="metric-value text-3xl">{stats.inUseIPs}</p>
                </div>
                <div className="rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--surface-soft)] px-5 py-4">
                  <p className="metric-label">Reserved</p>
                  <p className="metric-value text-3xl">{stats.reservedIPs}</p>
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel title="Notes" icon={<ActivityIcon className="h-5 w-5" />} copy="A few quick details about this update.">
            <div className="space-y-3 text-sm leading-6 text-[var(--muted-text)]">
              <p className="rounded-[1.5rem] bg-[var(--surface-soft)] px-5 py-4">
                Top navigation replaces the old sidebar layout.
              </p>
              <p className="rounded-[1.5rem] bg-[var(--surface-soft)] px-5 py-4">
                The interface is lighter, cleaner, and easier to scan.
              </p>
              <p className="rounded-[1.5rem] bg-[var(--surface-soft)] px-5 py-4">
                Core features are all connected and working together.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
