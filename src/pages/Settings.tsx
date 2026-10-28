import { Check, Download, Trash2, Upload } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import type { SourceFilter } from "../api/search";
import { Notice, PageHeader, Select } from "../components/ui";
import { ACCENTS } from "../lib/appearance";
import { collectionsStore, profileStore, settingsStore, type Theme } from "../lib/store";

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 last:border-b-0">
      <div>
        <div className="font-medium">{title}</div>
        {hint && <div className="text-[12px] text-muted">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const settings = settingsStore.use();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  const exportData = () => {
    const data = { version: 1, profile: profileStore.get(), collections: collectionsStore.get().list, settings: settingsStore.get() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "neptune-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      if (data.profile) profileStore.set((p) => ({ ...p, ...data.profile }));
      if (Array.isArray(data.collections)) collectionsStore.set({ list: data.collections });
      if (data.settings) settingsStore.set((s) => ({ ...s, ...data.settings }));
      setMsg({ tone: "info", text: "Imported." });
    } catch {
      setMsg({ tone: "error", text: "That file isn't a Neptune export." });
    }
  };

  const clearAll = () => {
    if (!confirm("Delete your profile, collections and settings from this browser?")) return;
    profileStore.reset();
    collectionsStore.reset();
    settingsStore.reset();
    setMsg({ tone: "info", text: "Local data cleared." });
  };

  const set = (patch: Partial<typeof settings>) => settingsStore.set((s) => ({ ...s, ...patch }));

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" />
      {msg && (
        <div className="mb-4">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}

      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Appearance</h2>
      <div className="panel mb-8">
        <Row title="Theme">
          <div className="inline-flex rounded-md border border-line bg-surface p-0.5">
            {(["dark", "light", "system"] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => set({ theme: t })}
                className={`rounded px-3 py-1 text-[12px] font-medium capitalize ${settings.theme === t ? "bg-surface-2 text-fg shadow-sm" : "text-muted hover:text-fg"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </Row>
        <Row title="Accent color">
          <div className="flex flex-wrap gap-1.5">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                title={a.name}
                aria-label={a.name}
                onClick={() => set({ accent: a.value })}
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={{ background: a.value }}
              >
                {settings.accent.toLowerCase() === a.value && <Check size={12} color="#fff" strokeWidth={3} />}
              </button>
            ))}
            <input type="color" value={settings.accent} onChange={(e) => set({ accent: e.target.value })} className="h-6 w-8 cursor-pointer rounded border border-line bg-surface" aria-label="Custom accent" />
          </div>
        </Row>
        <Row title="Results layout">
          <Select value={settings.layout} onChange={(e) => set({ layout: e.target.value as "list" | "grid" })} className="w-32">
            <option value="list">List</option>
            <option value="grid">Grid</option>
          </Select>
        </Row>
      </div>

      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Search</h2>
      <div className="panel mb-8">
        <Row title="Default source" hint="Which site to search when you open a category.">
          <Select value={settings.defaultSource} onChange={(e) => set({ defaultSource: e.target.value as SourceFilter })} className="w-40">
            <option value="all">Both</option>
            <option value="modrinth">Modrinth</option>
            <option value="curseforge">CurseForge</option>
          </Select>
        </Row>
      </div>

      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Your data</h2>
      <div className="panel">
        <Row title="Export" hint="Download your profile, collections and settings as JSON.">
          <button className="btn" onClick={exportData}>
            <Download size={14} /> Export
          </button>
        </Row>
        <Row title="Import" hint="Restore from an export, e.g. on another device.">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) importData(f);
            }}
          />
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Import
          </button>
        </Row>
        <Row title="Clear local data" hint="Removes everything Neptune saved in this browser.">
          <button className="btn text-red-400" onClick={clearAll}>
            <Trash2 size={14} /> Clear
          </button>
        </Row>
      </div>
    </div>
  );
}
