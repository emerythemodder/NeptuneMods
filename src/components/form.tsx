import type { ReactNode } from "react";

export function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section id={id} className="panel scroll-mt-32 p-5">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-faint">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-md border border-line bg-surface p-0.5">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded px-3 py-1 text-[12px] font-medium ${value === v ? "bg-surface-2 text-fg shadow-sm" : "text-muted hover:text-fg"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-[13px]">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-accent" : "bg-line-strong"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}
