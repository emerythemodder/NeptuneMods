import { BarChart3, Bookmark, Cloud, CloudOff, Download, LogOut, Pencil, Search, Settings, Upload, User, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CONTENT, EDITIONS, isContentType, typesFor } from "../lib/content";
import { Link, navigate, useRoute } from "../lib/router";
import { profileStore, settingsStore } from "../lib/store";
import { accountsEnabled, signOut, useAuth } from "../lib/auth";
import { useSyncStatus } from "../lib/sync";
import { Avatar, displayName } from "./Avatar";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0 text-fg">
      <img src="./logo.png" alt="" width={26} height={26} className="shrink-0" />
      <span className="font-semibold tracking-tight text-[15px]">Neptune</span>
    </Link>
  );
}

function SearchBox({ className = "" }: { className?: string }) {
  const { segments, query } = useRoute();
  const onBrowse = segments[0] === "browse" && isContentType(segments[1] ?? "");
  const { edition } = settingsStore.use();
  const q = onBrowse ? (query.get("q") ?? "") : "";
  const [value, setValue] = useState(q);
  useEffect(() => {
    setValue(q);
  }, [q]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const type = onBrowse ? segments[1] : typesFor(settingsStore.get().edition)[0];
    const next = Object.fromEntries(onBrowse ? query : []);
    navigate(`/browse/${type}`, { ...next, q: value.trim(), page: undefined });
  };

  return (
    <form onSubmit={submit} className={`relative ${className}`} role="search">
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={
          onBrowse
            ? `Search ${CONTENT[segments[1] as keyof typeof CONTENT].label.toLowerCase()}`
            : edition === "bedrock"
              ? "Search add-ons, maps, skins…"
              : "Search mods, modpacks, shaders…"
        }
        className="input pl-8 pr-8"
        aria-label="Search"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            if (onBrowse) navigate(`/browse/${segments[1]}`, { ...Object.fromEntries(query), q: undefined, page: undefined });
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-fg"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </form>
  );
}

const SYNC_LABEL = { off: "", loading: "Syncing…", saving: "Saving…", saved: "Synced to your account", error: "Couldn't sync. Changes are kept here." };

function UserMenu() {
  const profile = profileStore.use();
  const auth = useAuth();
  const sync = useSyncStatus();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { path } = useRoute();
  useEffect(() => {
    setOpen(false);
  }, [path]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items: [string, string, ReactNode][] = [
    ["/profile", "Profile", <User size={14} />],
    ["/profile/edit", "Customize profile", <Pencil size={14} />],
    ["/collections", "Collections", <Bookmark size={14} />],
    ["/publish", "Publish a project", <Upload size={14} />],
    ["/download", "Download the launcher", <Download size={14} />],
    ["/stats", "Creator stats", <BarChart3 size={14} />],
    ["/settings", "Settings", <Settings size={14} />],
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center rounded-full" aria-label="Account menu" aria-expanded={open}>
        <Avatar profile={profile} size={30} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 panel shadow-xl shadow-black/20 py-1 z-50">
          <div className="px-3 py-2 border-b border-line mb-1">
            <div className="font-medium text-fg truncate">{displayName(profile)}</div>
            {auth.user?.email ? (
              <div className="text-[12px] text-muted truncate">{auth.user.email}</div>
            ) : (
              profile.handle && <div className="text-[12px] text-muted truncate">@{profile.handle}</div>
            )}
            {sync !== "off" && (
              <div className={`mt-1 flex items-center gap-1 text-[11px] ${sync === "error" ? "text-red-400" : "text-faint"}`}>
                {sync === "error" ? <CloudOff size={11} /> : <Cloud size={11} />}
                {SYNC_LABEL[sync]}
              </div>
            )}
          </div>
          {items.map(([to, label, icon]) => (
            <Link key={to} to={to} className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-muted hover:text-fg hover:bg-surface-2">
              {icon}
              {label}
            </Link>
          ))}
          {auth.status === "signed-in" && (
            <button
              onClick={() => signOut()}
              className="mt-1 flex w-full items-center gap-2.5 border-t border-line px-3 py-2 text-left text-[13px] text-muted hover:bg-surface-2 hover:text-fg"
            >
              <LogOut size={14} /> Sign out
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TypeNav() {
  const { segments } = useRoute();
  const settings = settingsStore.use();
  const active = segments[0] === "browse" && isContentType(segments[1] ?? "") ? segments[1] : null;
  // On a browse page the edition follows the page; elsewhere it's the last one picked.
  const edition = active ? CONTENT[active as keyof typeof CONTENT].edition : settings.edition;
  return (
    <nav className="scroll-x -mb-px flex items-center gap-1 overflow-x-auto" aria-label="Content types">
      <div className="mr-2 flex shrink-0 rounded-md border border-line bg-surface p-0.5" role="group" aria-label="Edition">
        {EDITIONS.map((e) => (
          <button
            key={e.value}
            onClick={() => {
              settingsStore.set((s) => ({ ...s, edition: e.value }));
              if (e.value !== edition) navigate(`/browse/${typesFor(e.value)[0]}`);
            }}
            aria-pressed={edition === e.value}
            className={`rounded px-2 py-0.5 text-[12px] font-medium transition-colors ${
              edition === e.value ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>
      {typesFor(edition).map((t) => (
        <Link
          key={t}
          to={`/browse/${t}`}
          className={`whitespace-nowrap border-b-2 px-2.5 py-2.5 text-[13px] transition-colors ${
            active === t ? "border-accent text-fg font-medium" : "border-transparent text-muted hover:text-fg"
          }`}
        >
          {CONTENT[t].label}
        </Link>
      ))}
    </nav>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-14 items-center gap-4">
            <Logo />
            <SearchBox className="hidden sm:block flex-1 max-w-lg" />
            <div className="ml-auto flex items-center gap-1">
              <Link to="/download" className="btn mr-1 hidden md:inline-flex">
                <Download size={14} /> Get the app
              </Link>
              <Link to="/publish" className="btn mr-1 hidden lg:inline-flex">
                <Upload size={14} /> Publish
              </Link>
              <Link to="/collections" className="btn btn-ghost btn-icon" title="Collections" aria-label="Collections">
                <Bookmark size={16} />
              </Link>
              {accountsEnabled && auth.status === "signed-out" && (
                <Link to="/signin" className="btn btn-primary mr-1">
                  Sign in
                </Link>
              )}
              <UserMenu />
            </div>
          </div>
          <SearchBox className="sm:hidden pb-2" />
          <TypeNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-[12px] text-faint">
          <span>Project data from GitHub, Modrinth and CurseForge.</span>
          <span>Not affiliated with Mojang, Modrinth or CurseForge.</span>
        </div>
      </footer>
    </div>
  );
}
