import { BarChart3, Bookmark, Pencil, Search, Settings, Upload, User, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CONTENT, CONTENT_TYPES, isContentType } from "../lib/content";
import { Link, navigate, useRoute } from "../lib/router";
import { profileStore } from "../lib/store";
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
  const q = onBrowse ? (query.get("q") ?? "") : "";
  const [value, setValue] = useState(q);
  useEffect(() => {
    setValue(q);
  }, [q]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const type = onBrowse ? segments[1] : "mods";
    const next = Object.fromEntries(onBrowse ? query : []);
    navigate(`/browse/${type}`, { ...next, q: value.trim(), page: undefined });
  };

  return (
    <form onSubmit={submit} className={`relative ${className}`} role="search">
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={onBrowse ? `Search ${CONTENT[segments[1] as keyof typeof CONTENT].label.toLowerCase()}` : "Search mods, modpacks, shaders…"}
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

function UserMenu() {
  const profile = profileStore.use();
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
            {profile.handle && <div className="text-[12px] text-muted truncate">@{profile.handle}</div>}
          </div>
          {items.map(([to, label, icon]) => (
            <Link key={to} to={to} className="flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-muted hover:text-fg hover:bg-surface-2">
              {icon}
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function TypeNav() {
  const { segments } = useRoute();
  const active = segments[0] === "browse" ? segments[1] : null;
  return (
    <nav className="scroll-x -mb-px flex gap-1 overflow-x-auto" aria-label="Content types">
      {CONTENT_TYPES.map((t) => (
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
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-14 items-center gap-4">
            <Logo />
            <SearchBox className="hidden sm:block flex-1 max-w-lg" />
            <div className="ml-auto flex items-center gap-1">
              <Link to="/publish" className="btn mr-1 hidden md:inline-flex">
                <Upload size={14} /> Publish
              </Link>
              <Link to="/collections" className="btn btn-ghost btn-icon" title="Collections" aria-label="Collections">
                <Bookmark size={16} />
              </Link>
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
