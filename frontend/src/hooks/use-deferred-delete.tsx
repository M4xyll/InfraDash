'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

export type PendingDelete<T> = {
  id: string;
  label: string;
  item: T;
};

export type GlobalPendingDelete = {
  key: string;
  namespace: string;
  id: string;
  label: string;
  commitAt: number;
  delayMs: number;
  undo: () => void;
};

type StoreEntry<T> = PendingDelete<T> & {
  key: string;
  namespace: string;
  delayMs: number;
  commitAt: number;
  onCommit: (item: T) => Promise<void> | void;
};

const listeners = new Set<() => void>();
const pendingEntries = new Map<string, StoreEntry<unknown>>();
const timers = new Map<string, number>();
let snapshotCache: StoreEntry<unknown>[] = [];
let snapshotDirty = true;

function emit() {
  snapshotDirty = true;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  if (snapshotDirty) {
    snapshotCache = Array.from(pendingEntries.values()).sort((a, b) => a.commitAt - b.commitAt);
    snapshotDirty = false;
  }

  return snapshotCache;
}

function clearOne(key: string) {
  const timer = timers.get(key);
  if (timer) {
    window.clearTimeout(timer);
    timers.delete(key);
  }

  pendingEntries.delete(key);
  emit();
}

async function commitDelete(key: string) {
  const entry = pendingEntries.get(key);
  if (!entry) return;

  clearOne(key);
  await entry.onCommit(entry.item);
}

function scheduleGlobalDelete<T>({
  namespace,
  item,
  getId,
  getLabel,
  delayMs,
  onCommit,
}: {
  namespace: string;
  item: T;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  delayMs: number;
  onCommit: (item: T) => Promise<void> | void;
}) {
  const id = getId(item);
  const key = `${namespace}:${id}`;
  if (pendingEntries.has(key)) return;

  const entry: StoreEntry<T> = {
    key,
    namespace,
    id,
    label: getLabel(item),
    item,
    delayMs,
    commitAt: Date.now() + delayMs,
    onCommit,
  };

  pendingEntries.set(key, entry as StoreEntry<unknown>);
  const timer = window.setTimeout(() => {
    void commitDelete(key);
  }, delayMs);
  timers.set(key, timer);
  emit();
}

function undoGlobalDelete(key: string) {
  clearOne(key);
}

export function useDeferredDelete<T>({
  namespace,
  delayMs = 5000,
  getId,
  getLabel,
  onCommit,
}: {
  namespace: string;
  delayMs?: number;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  onCommit: (item: T) => Promise<void> | void;
}) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const scopedEntries = useMemo(
    () => snapshot.filter((entry) => entry.namespace === namespace) as Array<StoreEntry<T>>,
    [namespace, snapshot],
  );

  const hiddenIds = useMemo(
    () => new Set(scopedEntries.map((entry) => entry.id)),
    [scopedEntries],
  );

  const pendingDeletes = useMemo(
    () =>
      scopedEntries.map((entry) => ({
        id: entry.id,
        label: entry.label,
        item: entry.item,
      })),
    [scopedEntries],
  );

  const scheduleDelete = useCallback(
    (item: T) => {
      scheduleGlobalDelete({
        namespace,
        item,
        getId,
        getLabel,
        delayMs,
        onCommit,
      });
    },
    [delayMs, getId, getLabel, namespace, onCommit],
  );

  const undoDelete = useCallback(
    (id: string) => {
      undoGlobalDelete(`${namespace}:${id}`);
    },
    [namespace],
  );

  return {
    hiddenIds,
    pendingDeletes,
    scheduleDelete,
    undoDelete,
    delayMs,
  };
}

export function usePendingDeleteOverlay() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const items = useMemo<GlobalPendingDelete[]>(
    () =>
      snapshot.map((entry) => ({
        key: entry.key,
        namespace: entry.namespace,
        id: entry.id,
        label: entry.label,
        commitAt: entry.commitAt,
        delayMs: entry.delayMs,
        undo: () => undoGlobalDelete(entry.key),
      })),
    [snapshot],
  );

  return { items };
}
