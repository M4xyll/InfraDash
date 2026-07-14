import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function PageIntro({
  eyebrow,
  title,
  copy,
  actions,
  icon,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div>
        <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-[var(--muted-text)]">
          {icon}
          {eyebrow}
        </p>
        <h2 className="section-title mt-2">{title}</h2>
        <p className="section-copy">{copy}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3 lg:justify-end">{actions}</div> : null}
    </section>
  );
}

export function MetricStrip({
  items,
}: {
  items: Array<{ label: string; value: string | number; caption: string; icon?: React.ReactNode }>;
}) {
  return (
    <section className="soft-grid">
      {items.map((item) => (
        <div key={item.label} className="metric-card">
          <div className="flex items-center justify-between gap-3">
            <p className="metric-label">{item.label}</p>
            {item.icon ? <span className="text-[var(--muted-text)]">{item.icon}</span> : null}
          </div>
          <p className="metric-value">{item.value}</p>
          <p className="metric-caption">{item.caption}</p>
        </div>
      ))}
    </section>
  );
}

export function Panel({
  title,
  copy,
  toolbar,
  children,
  className,
  icon,
}: {
  title: string;
  copy?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <div className="panel-toolbar">
          <div>
            <h3 className="inline-flex items-center gap-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-color)]">
              {icon ? <span className="text-[var(--muted-text)]">{icon}</span> : null}
              {title}
            </h3>
            {copy ? <p className="mt-2 text-sm leading-6 text-[var(--muted-text)]">{copy}</p> : null}
          </div>
          {toolbar}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function EmptyState({
  title,
  copy,
}: {
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-dashed px-6 py-12 text-center">
      <h3 className="text-lg font-semibold text-[var(--text-color)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted-text)]">{copy}</p>
    </div>
  );
}
