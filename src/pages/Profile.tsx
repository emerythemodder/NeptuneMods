import { ArrowRight, Bookmark, Pencil, Pin, Upload, X } from "lucide-react";
import { getModrinthUser, getModrinthUserProjects } from "../api/modrinth";
import { neptuneProjectsBy } from "../api/neptune";
import { ProfileHeader } from "../components/ProfileHeader";
import { ProjectRow, SavedTile } from "../components/ProjectList";
import { Empty, Notice, ProjectIcon, Skeleton, Stat } from "../components/ui";
import { formatCompact, formatDate, formatNumber } from "../lib/format";
import { Link } from "../lib/router";
import { collectionsStore, profileStore, sameProject, type SavedProject } from "../lib/store";
import { useAsync } from "../lib/useAsync";

export async function loadCreator(username: string) {
  const [user, projects] = await Promise.all([getModrinthUser(username), getModrinthUserProjects(username)]);
  return {
    user,
    projects: [...projects].sort((a, b) => b.downloads - a.downloads),
    downloads: projects.reduce((n, p) => n + p.downloads, 0),
    followers: projects.reduce((n, p) => n + p.followers, 0),
  };
}

function ModrinthSummary({ username }: { username: string }) {
  const res = useAsync(() => loadCreator(username), [username]);
  return (
    <section className="panel p-4">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[14px] font-semibold">On Modrinth</h2>
        <Link to="/stats" className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-accent">
          Details <ArrowRight size={12} />
        </Link>
      </div>
      {res.loading ? (
        <Skeleton className="h-12" />
      ) : res.error || !res.data ? (
        <Notice tone="error">Couldn't find Modrinth user “{username}”.</Notice>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Projects" value={formatNumber(res.data.projects.length)} />
            <Stat label="Downloads" value={formatCompact(res.data.downloads)} title={formatNumber(res.data.downloads)} />
            <Stat label="Followers" value={formatCompact(res.data.followers)} title={formatNumber(res.data.followers)} />
          </div>
          {res.data.projects.length > 0 && (
            <div className="mt-4 flex -space-x-1.5">
              {res.data.projects.slice(0, 8).map((p) => (
                <Link key={p.id} to={`/project/modrinth/${p.id}`} title={p.title} className="rounded-md ring-2 ring-surface">
                  <ProjectIcon src={p.icon_url} alt={p.title} size={30} />
                </Link>
              ))}
            </div>
          )}
          <p className="mt-3 text-[12px] text-faint">Joined Modrinth {formatDate(res.data.user.created)}</p>
        </>
      )}
    </section>
  );
}

function NeptuneProjects({ login }: { login: string }) {
  const res = useAsync(() => neptuneProjectsBy(login), [login]);
  if (res.loading) return null;
  const list = res.data ?? [];
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <Upload size={14} className="text-faint" /> On Neptune
        </h2>
        <Link to="/publish" className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-accent">
          Publish <ArrowRight size={12} />
        </Link>
      </div>
      {list.length ? (
        <div className="panel overflow-hidden">
          {list.map((p) => (
            <ProjectRow key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <Empty title="Nothing published yet">
          <Link to="/publish" className="text-accent underline underline-offset-2">
            Publish a project
          </Link>{" "}
          from a GitHub repo and it shows up here once approved.
        </Empty>
      )}
    </section>
  );
}

export function ProfilePage() {
  const profile = profileStore.use();
  const { list } = collectionsStore.use();
  const isEmpty = !profile.displayName && !profile.handle && !profile.bio && profile.avatar.kind === "initials";

  const unpin = (p: SavedProject) => profileStore.set((s) => ({ ...s, pinned: s.pinned.filter((x) => !sameProject(x, p)) }));

  return (
    <div className="space-y-8">
      <ProfileHeader
        profile={profile}
        actions={
          <Link to="/profile/edit" className="btn">
            <Pencil size={13} /> Customize
          </Link>
        }
      />

      {isEmpty && (
        <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-medium">Make this profile yours</p>
            <p className="text-[13px] text-muted">Add a name, avatar, banner, bio and links, and pick an accent color for the site.</p>
          </div>
          <Link to="/profile/edit" className="btn btn-primary">
            Customize profile
          </Link>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-8 min-w-0">
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
              <Pin size={14} className="text-faint" /> Pinned
            </h2>
            {profile.pinned.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {profile.pinned.map((p) => (
                  <SavedTile
                    key={`${p.source}:${p.id}`}
                    p={p}
                    action={
                      <button className="btn btn-ghost btn-icon shrink-0" onClick={() => unpin(p)} aria-label={`Unpin ${p.title}`}>
                        <X size={14} />
                      </button>
                    }
                  />
                ))}
              </div>
            ) : (
              <Empty title="Nothing pinned yet">Open any project and choose “Pin to profile” to show it here.</Empty>
            )}
          </section>

          {profile.githubUsername && <NeptuneProjects login={profile.githubUsername} />}

          {profile.showCollections && list.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
                <Bookmark size={14} className="text-faint" /> Collections
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map((c) => (
                  <Link key={c.id} to={`/collections/${c.id}`} className="panel flex items-center gap-3 p-3 hover:border-line-strong">
                    <div className="flex -space-x-2">
                      {c.items.slice(0, 3).map((i) => (
                        <div key={i.id} className="rounded-md ring-2 ring-surface">
                          <ProjectIcon src={i.icon} alt="" size={28} />
                        </div>
                      ))}
                      {!c.items.length && <ProjectIcon src={null} alt="" size={28} />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{c.name}</div>
                      <div className="num text-[12px] text-muted">
                        {c.items.length} project{c.items.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          {profile.modrinthUsername && profile.showModrinthStats ? (
            <ModrinthSummary username={profile.modrinthUsername} />
          ) : (
            <div className="panel p-4 text-[13px] text-muted">
              Publish on Modrinth?{" "}
              <Link to="/profile/edit" query={{ section: "accounts" }} className="text-accent underline underline-offset-2">
                Link your username
              </Link>{" "}
              to show your real download and follower counts here.
            </div>
          )}
          <p className="text-[12px] text-faint">Your profile, pins and collections are saved in this browser only.</p>
        </aside>
      </div>
    </div>
  );
}
