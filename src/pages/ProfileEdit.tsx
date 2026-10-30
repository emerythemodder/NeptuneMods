import { ArrowDown, ArrowUp, Check, ExternalLink, Plus, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Field, Section, Segmented, Toggle } from "../components/form";
import { getModrinthUser } from "../api/modrinth";
import { ProfileHeader, curseforgeProfileUrl } from "../components/ProfileHeader";
import { SavedTile } from "../components/ProjectList";
import { Notice, PageHeader } from "../components/ui";
import { ACCENTS, BANNER_GRADIENTS } from "../lib/appearance";
import { isHttpUrl, resizeImage } from "../lib/image";
import { Link, useRoute } from "../lib/router";
import { DEFAULT_PROFILE, profileStore, settingsStore, type AvatarKind, type BannerKind, type Profile } from "../lib/store";

const MAX_LINKS = 5;

type AccountCheck = { state: "idle" | "checking" | "ok" | "missing"; name?: string };

function ImagePicker({ label, onPick, square, maxW, maxH }: { label: string; onPick: (url: string) => void; square?: boolean; maxW: number; maxH: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            setError("");
            onPick(await resizeImage(f, maxW, maxH, square));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed.");
          }
        }}
      />
      <button type="button" className="btn" onClick={() => ref.current?.click()}>
        <Upload size={14} /> {label}
      </button>
      {error && <p className="mt-1.5 text-[12px] text-red-400">{error}</p>}
    </div>
  );
}

export function ProfileEdit() {
  const profile = profileStore.use();
  const settings = settingsStore.use();
  const { query } = useRoute();
  const [saveFailed, setSaveFailed] = useState(false);
  const [mrCheck, setMrCheck] = useState<AccountCheck>({ state: "idle" });
  const [ghCheck, setGhCheck] = useState<AccountCheck>({ state: "idle" });

  useEffect(() => {
    const s = query.get("section");
    if (s) document.getElementById(s)?.scrollIntoView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<Profile> | ((p: Profile) => Partial<Profile>)) => {
    const ok = profileStore.set((p) => ({ ...p, ...(typeof patch === "function" ? patch(p) : patch) }));
    setSaveFailed(!ok);
  };

  const checkGithub = async () => {
    const name = profile.githubUsername.trim();
    if (!name) return;
    setGhCheck({ state: "checking" });
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(name)}`).catch(() => null);
    if (res?.ok) {
      const u = await res.json();
      setGhCheck({ state: "ok", name: u.login });
      update({ githubUsername: u.login });
    } else {
      setGhCheck({ state: "missing" });
    }
  };

  const checkModrinth = async () => {
    const name = profile.modrinthUsername.trim();
    if (!name) return;
    setMrCheck({ state: "checking" });
    try {
      const u = await getModrinthUser(name);
      setMrCheck({ state: "ok", name: u.username });
      update({ modrinthUsername: u.username });
    } catch {
      setMrCheck({ state: "missing" });
    }
  };

  const move = (i: number, d: -1 | 1) =>
    update((p) => {
      const pinned = [...p.pinned];
      [pinned[i], pinned[i + d]] = [pinned[i + d], pinned[i]];
      return { pinned };
    });

  return (
    <div>
      <PageHeader
        title="Customize profile"
        subtitle="Changes save automatically to this browser."
        actions={
          <Link to="/profile" className="btn btn-primary">
            <Check size={14} /> Done
          </Link>
        }
      />
      {saveFailed && (
        <div className="mb-4">
          <Notice tone="error">Your browser's storage is full, so the last change won't be kept after you leave. Try a smaller image.</Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5 min-w-0">
          <Section id="basics" title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name">
                <input className="input" value={profile.displayName} maxLength={40} onChange={(e) => update({ displayName: e.target.value })} />
              </Field>
              <Field label="Handle">
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint">@</span>
                  <input
                    className="input pl-6"
                    value={profile.handle}
                    maxLength={24}
                    onChange={(e) => update({ handle: e.target.value.replace(/[^\w.-]/g, "") })}
                  />
                </div>
              </Field>
              <Field label="Pronouns">
                <input className="input" value={profile.pronouns} maxLength={24} placeholder="Optional" onChange={(e) => update({ pronouns: e.target.value })} />
              </Field>
              <Field label="Location">
                <input className="input" value={profile.location} maxLength={40} placeholder="Optional" onChange={(e) => update({ location: e.target.value })} />
              </Field>
            </div>
            <Field label="Status" hint="A short line under your name, like what you're playing.">
              <input className="input" value={profile.status} maxLength={60} placeholder="Playing Create: Above and Beyond" onChange={(e) => update({ status: e.target.value })} />
            </Field>
            <Field label="Bio" hint={`${profile.bio.length}/300`}>
              <textarea className="input" rows={4} maxLength={300} value={profile.bio} onChange={(e) => update({ bio: e.target.value })} />
            </Field>
          </Section>

          <Section id="avatar" title="Avatar">
            <Segmented<AvatarKind>
              value={profile.avatar.kind}
              options={[
                ["initials", "Initials"],
                ["minecraft", "Minecraft skin"],
                ["image", "Upload"],
              ]}
              onChange={(kind) => update((p) => ({ avatar: { ...p.avatar, kind } }))}
            />
            {profile.avatar.kind === "minecraft" && (
              <Field label="Minecraft username" hint="Shows your skin's face.">
                <input
                  className="input max-w-xs"
                  value={profile.avatar.minecraftName}
                  maxLength={16}
                  onChange={(e) => update((p) => ({ avatar: { ...p.avatar, minecraftName: e.target.value.replace(/[^\w]/g, "") } }))}
                />
              </Field>
            )}
            {profile.avatar.kind === "image" && (
              <div className="flex items-center gap-3">
                <ImagePicker label={profile.avatar.image ? "Replace image" : "Choose image"} square maxW={256} maxH={256} onPick={(image) => update((p) => ({ avatar: { ...p.avatar, image } }))} />
                {profile.avatar.image && (
                  <button type="button" className="btn btn-ghost" onClick={() => update((p) => ({ avatar: { ...p.avatar, image: "" } }))}>
                    Remove
                  </button>
                )}
              </div>
            )}
          </Section>

          <Section id="banner" title="Banner">
            <Segmented<BannerKind>
              value={profile.banner.kind}
              options={[
                ["gradient", "Gradient"],
                ["color", "Solid color"],
                ["image", "Upload"],
              ]}
              onChange={(kind) => update((p) => ({ banner: { ...p.banner, kind } }))}
            />
            {profile.banner.kind === "gradient" && (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {Object.entries(BANNER_GRADIENTS).map(([id, g]) => (
                  <button
                    key={id}
                    type="button"
                    title={g.name}
                    aria-label={g.name}
                    onClick={() => update((p) => ({ banner: { ...p.banner, gradient: id } }))}
                    className={`h-10 rounded-md border-2 ${profile.banner.gradient === id ? "border-accent" : "border-transparent"}`}
                    style={{ background: g.css }}
                  />
                ))}
              </div>
            )}
            {profile.banner.kind === "color" && (
              <input
                type="color"
                value={profile.banner.color}
                onChange={(e) => update((p) => ({ banner: { ...p.banner, color: e.target.value } }))}
                className="h-9 w-20 cursor-pointer rounded-md border border-line bg-surface"
              />
            )}
            {profile.banner.kind === "image" && (
              <div className="flex items-center gap-3">
                <ImagePicker label={profile.banner.image ? "Replace image" : "Choose image"} maxW={1500} maxH={500} onPick={(image) => update((p) => ({ banner: { ...p.banner, image } }))} />
                <span className="text-[12px] text-faint">Wide images work best (about 3:1).</span>
              </div>
            )}
          </Section>

          <Section id="accent" title="Accent color" hint="Used for buttons, links and highlights across the whole site.">
            <div className="flex flex-wrap items-center gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  title={a.name}
                  aria-label={a.name}
                  onClick={() => settingsStore.set((s) => ({ ...s, accent: a.value }))}
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: a.value }}
                >
                  {settings.accent.toLowerCase() === a.value && <Check size={14} color="#fff" strokeWidth={3} />}
                </button>
              ))}
              <label className="ml-1 flex items-center gap-2 text-[12px] text-muted">
                Custom
                <input
                  type="color"
                  value={settings.accent}
                  onChange={(e) => settingsStore.set((s) => ({ ...s, accent: e.target.value }))}
                  className="h-8 w-12 cursor-pointer rounded-md border border-line bg-surface"
                />
              </label>
            </div>
          </Section>

          <Section id="links" title="Links" hint="GitHub, Discord invite, YouTube, your website…">
            {profile.links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input w-36 shrink-0"
                  placeholder="Label"
                  value={l.label}
                  maxLength={24}
                  onChange={(e) => update((p) => ({ links: p.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }))}
                />
                <input
                  className={`input ${l.url && !isHttpUrl(l.url) ? "border-red-500/60" : ""}`}
                  placeholder="https://"
                  value={l.url}
                  onChange={(e) => update((p) => ({ links: p.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) }))}
                />
                <button type="button" className="btn btn-ghost btn-icon shrink-0" aria-label="Remove link" onClick={() => update((p) => ({ links: p.links.filter((_, j) => j !== i) }))}>
                  <X size={14} />
                </button>
              </div>
            ))}
            {profile.links.length < MAX_LINKS && (
              <button type="button" className="btn" onClick={() => update((p) => ({ links: [...p.links, { label: "", url: "" }] }))}>
                <Plus size={14} /> Add link
              </button>
            )}
          </Section>

          <Section id="accounts" title="Accounts" hint="Link your accounts on other sites. They show as links on your profile.">
            <Field label="Modrinth username" hint="Shows your real project, download and follower counts.">
              <div className="flex gap-2">
                <input
                  className="input max-w-xs"
                  value={profile.modrinthUsername}
                  onChange={(e) => {
                    setMrCheck({ state: "idle" });
                    update({ modrinthUsername: e.target.value.trim() });
                  }}
                />
                <button type="button" className="btn" onClick={checkModrinth} disabled={!profile.modrinthUsername || mrCheck.state === "checking"}>
                  {mrCheck.state === "checking" ? "Checking…" : "Verify"}
                </button>
              </div>
            </Field>
            {mrCheck.state === "ok" && <p className="text-[12px] text-emerald-500">Found {mrCheck.name} on Modrinth.</p>}
            {mrCheck.state === "missing" && <p className="text-[12px] text-red-400">No Modrinth user with that name.</p>}

            <Field label="CurseForge username" hint="CurseForge has no public profile lookup, so this appears as a link to your CurseForge page.">
              <div className="flex gap-2">
                <input
                  className="input max-w-xs"
                  value={profile.curseforgeUsername}
                  maxLength={32}
                  onChange={(e) => update({ curseforgeUsername: e.target.value.replace(/[^\w.-]/g, "") })}
                />
                {profile.curseforgeUsername && (
                  <a href={curseforgeProfileUrl(profile.curseforgeUsername)} target="_blank" rel="noreferrer" className="btn">
                    Open <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </Field>

            <Field label="GitHub username" hint="Shows the projects you've published on Neptune.">
              <div className="flex gap-2">
                <input
                  className="input max-w-xs"
                  value={profile.githubUsername}
                  maxLength={39}
                  onChange={(e) => {
                    setGhCheck({ state: "idle" });
                    update({ githubUsername: e.target.value.replace(/[^A-Za-z0-9-]/g, "") });
                  }}
                />
                <button type="button" className="btn" onClick={checkGithub} disabled={!profile.githubUsername || ghCheck.state === "checking"}>
                  {ghCheck.state === "checking" ? "Checking…" : "Verify"}
                </button>
              </div>
            </Field>
            {ghCheck.state === "ok" && <p className="text-[12px] text-emerald-500">Found {ghCheck.name} on GitHub.</p>}
            {ghCheck.state === "missing" && <p className="text-[12px] text-red-400">No GitHub user with that name.</p>}

            <div className="space-y-3 border-t border-line pt-4">
              <Toggle label="Show Modrinth stats on my profile" checked={profile.showModrinthStats} onChange={(v) => update({ showModrinthStats: v })} />
              <Toggle label="Show my collections on my profile" checked={profile.showCollections} onChange={(v) => update({ showCollections: v })} />
            </div>
          </Section>

          <Section id="pinned" title="Pinned projects" hint="Pin projects from their pages. Reorder them here.">
            {profile.pinned.length === 0 ? (
              <p className="text-[13px] text-faint">Nothing pinned yet.</p>
            ) : (
              <div className="space-y-2">
                {profile.pinned.map((p, i) => (
                  <SavedTile
                    key={`${p.source}:${p.id}`}
                    p={p}
                    action={
                      <div className="flex shrink-0 gap-0.5">
                        <button type="button" className="btn btn-ghost btn-icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" className="btn btn-ghost btn-icon" disabled={i === profile.pinned.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                          <ArrowDown size={14} />
                        </button>
                        <button type="button" className="btn btn-ghost btn-icon" onClick={() => update((x) => ({ pinned: x.pinned.filter((_, j) => j !== i) }))} aria-label="Unpin">
                          <X size={14} />
                        </button>
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </Section>

          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-ghost text-red-400"
              onClick={() => confirm("Reset your profile to the defaults? Pins are removed too.") && update(DEFAULT_PROFILE)}
            >
              <Trash2 size={14} /> Reset profile
            </button>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-32 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Preview</p>
            <ProfileHeader profile={profile} compact />
          </div>
        </aside>
      </div>
    </div>
  );
}
