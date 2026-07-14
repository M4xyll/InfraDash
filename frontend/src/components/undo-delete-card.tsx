'use client';

import { GlobalPendingDelete } from '@/hooks/use-deferred-delete';

export function UndoDeleteStack({
  items,
}: {
  items: GlobalPendingDelete[];
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.key}
          className="animate-[undoToastIn_260ms_cubic-bezier(0.22,1,0.36,1)] rounded-[1.5rem] border bg-[var(--surface-strong)] p-4 shadow-[var(--panel-shadow)]"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-text)]">Deletion queued</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-color)]">
            <span className="font-semibold">{item.label}</span> will be deleted in 5 seconds.
          </p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={item.undo}
              className="rounded-full border bg-[var(--surface-soft)] px-4 py-2 text-sm font-semibold text-[var(--text-color)]"
            >
              Undo
            </button>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-soft)]">
              <div
                className="h-full bg-[var(--accent-color)]"
                style={{
                  animation: `undoCountdown ${Math.max(item.commitAt - Date.now(), 120)}ms linear forwards`,
                  transformOrigin: 'left center',
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
