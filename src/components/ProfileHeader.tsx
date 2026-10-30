import { ExternalLink, MapPin } from "lucide-react";
import { isHttpUrl } from "../lib/image";
import type { Profile } from "../lib/store";
import { Avatar, bannerStyle, displayName } from "./Avatar";

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const curseforgeProfileUrl = (name: string) => `https://www.curseforge.com/members/${encodeURIComponent(name)}/projects`;

function accounts(p: Profile) {
  const out: { label: string; url: string; dot: string }[] = [];
  if (p.modrinthUsername) out.push({ label: "Modrinth", url: `https://modrinth.com/user/${encodeURIComponent(p.modrinthUsername)}`, dot: "bg-modrinth" });
  if (p.curseforgeUsername) out.push({ label: "CurseForge", url: curseforgeProfileUrl(p.curseforgeUsername), dot: "bg-curseforge" });
  if (p.githubUsername) out.push({ label: "GitHub", url: `https://github.com/${encodeURIComponent(p.githubUsername)}`, dot: "bg-fg" });
  return out;
}

export function ProfileHeader({ profile, compact = false, actions }: { profile: Profile; compact?: boolean; actions?: React.ReactNode }) {
  const links = profile.links.filter((l) => isHttpUrl(l.url));
  const linked = accounts(profile);
  const size = compact ? 72 : 104;
  return (
    <div className={compact ? "panel overflow-hidden" : ""}>
      <div className={`${compact ? "h-24" : "h-40 sm:h-52 rounded-lg border border-line"} bg-surface-2`} style={bannerStyle(profile)} />
      <div className={compact ? "px-4 pb-4" : "px-1 sm:px-4"}>
        <div className="flex flex-wrap items-end justify-between gap-3" style={{ marginTop: -size / 2 }}>
          <Avatar profile={profile} size={size} className="ring-4 ring-bg" />
          {actions && <div className="flex gap-2 pb-1">{actions}</div>}
        </div>
        <div className="mt-3">
          <h1 className={`${compact ? "text-[18px]" : "text-[24px]"} font-semibold leading-tight tracking-tight`}>{displayName(profile)}</h1>
          <p className="text-[13px] text-muted">
            {[profile.handle && `@${profile.handle}`, profile.pronouns].filter(Boolean).join(" · ")}
          </p>
          {profile.status && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-0.5 text-[12px] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {profile.status}
            </p>
          )}
          {profile.bio && <p className={`mt-3 whitespace-pre-line text-fg ${compact ? "text-[13px] line-clamp-4" : "max-w-2xl"}`}>{profile.bio}</p>}
          {linked.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {linked.map((a) => (
                <a
                  key={a.label}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer me"
                  className="inline-flex h-6 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[12px] text-muted hover:border-line-strong hover:text-fg"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${a.dot}`} />
                  {a.label}
                </a>
              ))}
            </div>
          )}
          {(profile.location || links.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted">
              {profile.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} className="text-faint" />
                  {profile.location}
                </span>
              )}
              {links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer me" className="inline-flex items-center gap-1 hover:text-accent">
                  {l.label.trim() || hostLabel(l.url)} <ExternalLink size={11} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
