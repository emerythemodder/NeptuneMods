import { Box, ChevronDown, CircleAlert } from "lucide-react";
import { useState, type ReactNode, type SelectHTMLAttributes } from "react";
import type { Source } from "../api/types";

export function ProjectIcon({ src, alt, size = 48 }: { src: string | null; alt: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <div
      className="shrink-0 overflow-hidden rounded-md border border-line bg-surface-2 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {src && !broken ? (
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <Box size={size * 0.4} className="text-faint" strokeWidth={1.5} />
      )}
    </div>
  );
}

const SOURCE_TAG: Record<Source, [string, string]> = {
  neptune: ["bg-accent", "Neptune"],
  modrinth: ["bg-modrinth", "Modrinth"],
  curseforge: ["bg-curseforge", "CurseForge"],
};

export function SourceTag({ source }: { source: Source }) {
  const [dot, label] = SOURCE_TAG[source];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted whitespace-nowrap">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export function Select({ children, className = "", ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative ${className}`}>
      <select {...rest} className="input appearance-none pr-7 cursor-pointer">
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-faint" />
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-2 ${className}`} />;
}

export function Empty({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon && <div className="text-faint mb-1">{icon}</div>}
      <p className="font-medium text-fg">{title}</p>
      {children && <div className="text-muted text-[13px] max-w-md">{children}</div>}
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-[13px] ${
        tone === "error" ? "border-red-500/30 bg-red-500/5 text-red-400" : "border-line bg-surface-2 text-muted"
      }`}
    >
      <CircleAlert size={14} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-fg">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, title }: { label: string; value: ReactNode; title?: string }) {
  return (
    <div title={title}>
      <div className="num text-[18px] font-semibold text-fg">{value}</div>
      <div className="text-[12px] text-muted">{label}</div>
    </div>
  );
}
