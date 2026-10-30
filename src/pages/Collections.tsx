import { ArrowLeft, Bookmark, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { SavedTile } from "../components/ProjectList";
import { Empty, PageHeader, ProjectIcon } from "../components/ui";
import { formatDate } from "../lib/format";
import { Link, navigate } from "../lib/router";
import { collectionsStore, newId, sameProject, type Collection } from "../lib/store";

export function Collections() {
  const { list } = collectionsStore.use();
  const [name, setName] = useState("");
  const create = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const c: Collection = { id: newId(), name: name.trim(), description: "", createdAt: new Date().toISOString(), items: [] };
    collectionsStore.set((s) => ({ list: [c, ...s.list] }));
    setName("");
  };

  return (
    <div>
      <PageHeader title="Collections" subtitle="Group projects into lists, like a modpack you're planning. Saved in this browser." />
      <form onSubmit={create} className="mb-6 flex max-w-md gap-2">
        <input className="input" placeholder="New collection name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary" disabled={!name.trim()}>
          <Plus size={14} /> Create
        </button>
      </form>
      {list.length === 0 ? (
        <Empty title="No collections yet" icon={<Bookmark size={28} strokeWidth={1.5} />}>
          Create one above, or use “Save” on any project page.
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <Link key={c.id} to={`/collections/${c.id}`} className="panel p-4 hover:border-line-strong">
              <div className="mb-3 flex -space-x-2">
                {c.items.slice(0, 5).map((i) => (
                  <div key={`${i.source}:${i.id}`} className="rounded-md ring-2 ring-surface">
                    <ProjectIcon src={i.icon} alt="" size={36} />
                  </div>
                ))}
                {c.items.length === 0 && <ProjectIcon src={null} alt="" size={36} />}
              </div>
              <div className="font-medium">{c.name}</div>
              <div className="num text-[12px] text-muted">
                {c.items.length} project{c.items.length === 1 ? "" : "s"} · created {formatDate(c.createdAt)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function CollectionPage({ id }: { id: string }) {
  const { list } = collectionsStore.use();
  const c = list.find((x) => x.id === id);
  if (!c) return <Empty title="Collection not found">It may have been deleted.</Empty>;

  const patch = (p: Partial<Collection>) => collectionsStore.set((s) => ({ list: s.list.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const remove = () => {
    if (!confirm(`Delete “${c.name}”? This can't be undone.`)) return;
    collectionsStore.set((s) => ({ list: s.list.filter((x) => x.id !== id) }));
    navigate("/collections");
  };

  return (
    <div>
      <Link to="/collections" className="btn btn-ghost -ml-2 mb-4">
        <ArrowLeft size={14} /> Collections
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <input
            value={c.name}
            onChange={(e) => patch({ name: e.target.value })}
            maxLength={60}
            aria-label="Collection name"
            className="w-full rounded-md border border-transparent bg-transparent px-1 -ml-1 text-[22px] font-semibold tracking-tight hover:border-line focus:border-accent focus:outline-none"
          />
          <textarea
            value={c.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Add a description…"
            rows={1}
            maxLength={300}
            className="w-full resize-none rounded-md border border-transparent bg-transparent px-1 -ml-1 text-[13px] text-muted placeholder:text-faint hover:border-line focus:border-accent focus:outline-none"
          />
        </div>
        <button className="btn btn-ghost text-red-400" onClick={remove}>
          <Trash2 size={14} /> Delete
        </button>
      </div>
      {c.items.length === 0 ? (
        <Empty title="This collection is empty">
          Browse projects and use “Save” to add them here.{" "}
          <Link to="/browse/mods" className="text-accent underline underline-offset-2">
            Browse mods
          </Link>
        </Empty>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {c.items.map((p) => (
            <SavedTile
              key={`${p.source}:${p.id}`}
              p={p}
              action={
                <button
                  className="btn btn-ghost btn-icon shrink-0"
                  aria-label={`Remove ${p.title}`}
                  onClick={() => patch({ items: c.items.filter((i) => !sameProject(i, p)) })}
                >
                  <X size={14} />
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
