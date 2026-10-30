import { useSyncExternalStore } from "react";
import { onAuthChange, supabase } from "./auth";
import { collectionsStore, profileStore, settingsStore, type Collection, type Profile, type Settings } from "./store";

// While signed in, the profile, collections and settings live in the user's row of the
// user_data table (see supabase/schema.sql) as well as in the browser.

type SyncStatus = "off" | "loading" | "saving" | "saved" | "error";

let status: SyncStatus = "off";
const listeners = new Set<() => void>();
function setStatus(s: SyncStatus) {
  status = s;
  listeners.forEach((l) => l());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );
}

interface Row {
  user_id: string;
  profile: Partial<Profile> | null;
  collections: Collection[] | null;
  settings: Partial<Settings> | null;
}

let userId: string | null = null;
let applying = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let unsubscribeStores: (() => void) | null = null;

function snapshot(): Omit<Row, "user_id"> {
  return { profile: profileStore.get(), collections: collectionsStore.get().list, settings: settingsStore.get() };
}

async function save() {
  if (!supabase || !userId) return;
  setStatus("saving");
  const { error } = await supabase.from("user_data").upsert({ user_id: userId, ...snapshot(), updated_at: new Date().toISOString() });
  setStatus(error ? "error" : "saved");
}

function scheduleSave() {
  if (applying || !userId) return;
  clearTimeout(timer);
  timer = setTimeout(save, 1200);
}

/** Collections from both sides, with the account's copy winning when the same one exists in both. */
function mergeCollections(remote: Collection[], local: Collection[]): Collection[] {
  const ids = new Set(remote.map((c) => c.id));
  return [...remote, ...local.filter((c) => !ids.has(c.id))];
}

async function start(id: string) {
  if (!supabase) return;
  userId = id;
  setStatus("loading");
  const { data, error } = await supabase.from("user_data").select("*").eq("user_id", id).maybeSingle<Row>();
  if (error) {
    setStatus("error");
    return;
  }
  if (data) {
    // The account's copy wins, so every device shows the same profile.
    applying = true;
    if (data.profile) profileStore.set({ ...profileStore.defaults, ...data.profile });
    collectionsStore.set({ list: mergeCollections(data.collections ?? [], collectionsStore.get().list) });
    if (data.settings) settingsStore.set({ ...settingsStore.defaults, ...data.settings });
    applying = false;
  }
  // First sign-in on this account: upload what's in this browser. Otherwise store any merged collections.
  await save();
  unsubscribeStores?.();
  const subs = [profileStore.subscribe(scheduleSave), collectionsStore.subscribe(scheduleSave), settingsStore.subscribe(scheduleSave)];
  unsubscribeStores = () => subs.forEach((u) => u());
}

function stop() {
  clearTimeout(timer);
  unsubscribeStores?.();
  unsubscribeStores = null;
  userId = null;
  setStatus("off");
}

export function initSync() {
  if (!supabase) return;
  onAuthChange((s) => {
    const id = s.status === "signed-in" ? s.user?.id ?? null : null;
    if (id && id !== userId) start(id);
    else if (!id && userId) stop();
  });
}
