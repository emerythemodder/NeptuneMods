import { Bookmark, Check, Pin, Plus } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Project } from "../api/types";
import { collectionsStore, newId, profileStore, sameProject, toSaved } from "../lib/store";

export const MAX_PINNED = 6;

export function PinButton({ project }: { project: Project }) {
  const profile = profileStore.use();
  const pinned = profile.pinned.some((p) => sameProject(p, project));
  const full = !pinned && profile.pinned.length >= MAX_PINNED;
  const toggle = () =>
    profileStore.set((s) => ({
      ...s,
      pinned: pinned ? s.pinned.filter((p) => !sameProject(p, project)) : [...s.pinned, toSaved(project)],
    }));
  return (
    <button
      className={`btn ${pinned ? "text-accent" : ""}`}
      onClick={toggle}
      disabled={full}
      title={full ? `You can pin up to ${MAX_PINNED} projects` : pinned ? "Unpin from your profile" : "Show on your profile"}
    >
      <Pin size={14} className={pinned ? "fill-current" : ""} />
      {pinned ? "Pinned" : "Pin to profile"}
    </button>
  );
}

export function SaveMenu({ project }: { project: Project }) {
  const { list } = collectionsStore.use();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const savedIn = list.filter((c) => c.items.some((i) => sameProject(i, project)));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = (id: string) =>
    collectionsStore.set((s) => ({
      list: s.list.map((c) =>
        c.id !== id
          ? c
          : c.items.some((i) => sameProject(i, project))
            ? { ...c, items: c.items.filter((i) => !sameProject(i, project)) }
            : { ...c, items: [toSaved(project), ...c.items] },
      ),
    }));

  const create = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    collectionsStore.set((s) => ({
      list: [{ id: newId(), name: name.trim(), description: "", createdAt: new Date().toISOString(), items: [toSaved(project)] }, ...s.list],
    }));
    setName("");
  };

  return (
    <div className="relative" ref={ref}>
      <button className={`btn ${savedIn.length ? "text-accent" : ""}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Bookmark size={14} className={savedIn.length ? "fill-current" : ""} />
        {savedIn.length ? "Saved" : "Save"}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 panel p-2 shadow-xl shadow-black/20">
          <p className="px-1.5 pb-1.5 text-[12px] font-medium text-muted">Save to collection</p>
          {list.length === 0 && <p className="px-1.5 pb-2 text-[12px] text-faint">No collections yet.</p>}
          <div className="max-h-56 overflow-y-auto">
            {list.map((c) => {
              const on = savedIn.includes(c);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className="flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left text-[13px] hover:bg-surface-2"
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${on ? "border-accent bg-accent text-accent-fg" : "border-line-strong"}`}>
                    {on && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className="truncate flex-1">{c.name}</span>
                  <span className="num text-[11px] text-faint">{c.items.length}</span>
                </button>
              );
            })}
          </div>
          <form onSubmit={create} className="mt-1.5 flex gap-1.5 border-t border-line pt-2">
            <input className="input" placeholder="New collection" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            <button className="btn btn-icon shrink-0" aria-label="Create collection" disabled={!name.trim()}>
              <Plus size={14} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
