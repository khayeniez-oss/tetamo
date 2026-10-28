"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
import { usePathname } from "next/navigation";
import { listingDraftKey, restoreListingDraft, serializeListingDraft } from "@/lib/listing-draft-storage";
import { supabase } from "@/lib/supabase";
import { useListingDemo } from "@/lib/use-listing-demo";

type Snapshot = { draft: object; storageError: boolean };
const snapshots = new Map<string, Snapshot>();
const listeners = new Map<string, Set<() => void>>();
const serverSnapshot = () => null;
function notify(key: string) { listeners.get(key)?.forEach(listener => listener()); }

// An external store keeps draft reads, writes and cross-tab updates synchronized.
export function useListingDraft<T extends object>(role: string, empty: () => T) {
  const pathname = usePathname();
  const demoScope = useListingDemo();
  const editCode = pathname.match(/\/edit\/([^/]+)/)?.[1];
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const key = listingDraftKey(userId ?? "signed-out", demoScope ? `${role}:demo:${demoScope}` : role, editCode);
  const persist = Boolean(userId);

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (active && !receivedAuthEvent) setUserId(data.session?.user.id ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedAuthEvent = true;
      if (active) setUserId(session?.user.id ?? null);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const getSnapshot = useCallback(() => {
    const cached = snapshots.get(key);
    if (cached) return cached;
    let draft = demoScope ? { ...empty(), demo: true } : empty();
    let storageError = false;
    if (persist) {
      try { draft = restoreListingDraft(localStorage.getItem(key), draft); }
      catch { storageError = true; }
    }
    const snapshot = { draft, storageError };
    snapshots.set(key, snapshot);
    return snapshot;
  }, [key, persist, empty, demoScope]);
  const subscribe = useCallback((listener: () => void) => {
    const group = listeners.get(key) ?? new Set<() => void>();
    listeners.set(key, group);
    group.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key && event.key !== null) return;
      snapshots.delete(key);
      notify(key);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      group.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }, [key]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const setDraft: Dispatch<SetStateAction<T>> = useCallback((update) => {
    const previous = getSnapshot();
    const next = typeof update === "function" ? (update as (value: T) => T)(previous.draft as T) : update;
    if (next === previous.draft) return;
    const draft = demoScope ? { ...next, demo: true } : next;
    let storageError = false;
    if (persist) {
      try { localStorage.setItem(key, serializeListingDraft(draft)); }
      catch { storageError = true; }
    }
    snapshots.set(key, { draft, storageError });
    notify(key);
  }, [getSnapshot, key, persist, demoScope]);
  const clearDraft = useCallback(() => { setDraft(empty()); }, [empty, setDraft]);
  return { draft: (snapshot?.draft ?? empty()) as T, setDraft, clearDraft, ready: userId !== undefined && snapshot !== null, storageError: snapshot?.storageError ?? false, demoScope };
}
