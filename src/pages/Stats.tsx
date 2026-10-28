import { BarChart3 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { typeFromModrinth } from "../api/modrinth";
import { Empty, Notice, PageHeader, ProjectIcon, Skeleton, Stat } from "../components/ui";
import { CONTENT } from "../lib/content";
import { formatCompact, formatDate, formatNumber, timeAgo } from "../lib/format";
import { Link, navigate, useRoute } from "../lib/router";
import { profileStore } from "../lib/store";
import { useAsync } from "../lib/useAsync";
import { loadCreator } from "./Profile";

function Report({ username }: { username: string }) {
  const profile = profileStore.use();
  const res = useAsync(() => loadCreator(username), [username]);
  if (res.loading) return <Skeleton className="h-72" />;
  if (res.error || !res.data) return <Notice tone="error">Couldn't find Modrinth user “{username}”.</Notice>;
  const { user, projects, downloads, followers } = res.data;
  const top = projects[0]?.downloads || 1;
  const linked = profile.modrinthUsername.toLowerCase() === user.username.toLowerCase();

  return (
    <div className="space-y-6">
      <div className="panel flex flex-wrap items-center gap-4 p-4">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="h-14 w-14 rounded-full bg-surface-2 object-cover" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-surface-2" />
        )}
        <div className="min-w-0 flex-1">
          <a href={`https://modrinth.com/user/${user.username}`} target="_blank" rel="noreferrer" className="text-[17px] font-semibold hover:text-accent">
            {user.username}
          </a>
          <p className="text-[12px] text-muted">Joined Modrinth {formatDate(user.created)}</p>
          {user.bio && <p className="mt-1 text-[13px] text-muted line-clamp-2">{user.bio}</p>}
        </div>
        {!linked && (
          <button className="btn" onClick={() => profileStore.set((p) => ({ ...p, modrinthUsername: user.username }))}>
            Link to my profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ["Projects", projects.length, formatNumber(projects.length)],
            ["Total downloads", downloads, formatCompact(downloads)],
            ["Total followers", followers, formatCompact(followers)],
          ] as const
        ).map(([label, n, shown]) => (
          <div key={label} className="panel p-4">
            <Stat label={label} value={shown} title={formatNumber(n)} />
          </div>
        ))}
      </div>

      {projects.length === 0 ? (
        <Empty title="No public projects">This user hasn't published anything on Modrinth yet.</Empty>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-faint">
                <th className="px-4 py-2.5 font-semibold">Project</th>
                <th className="px-4 py-2.5 font-semibold">Downloads</th>
                <th className="px-4 py-2.5 text-right font-semibold">Followers</th>
                <th className="px-4 py-2.5 text-right font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5">
                    <Link to={`/project/modrinth/${p.id}`} className="flex items-center gap-2.5 hover:text-accent">
                      <ProjectIcon src={p.icon_url} alt="" size={28} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{p.title}</span>
                        <span className="block text-[11px] text-faint">{CONTENT[typeFromModrinth(p.project_type)].singular}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="w-[40%] px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(1, (p.downloads / top) * 100)}%` }} />
                      </div>
                      <span className="num w-16 text-right" title={formatNumber(p.downloads)}>
                        {formatCompact(p.downloads)}
                      </span>
                    </div>
                  </td>
                  <td className="num px-4 py-2.5 text-right" title={formatNumber(p.followers)}>
                    {formatCompact(p.followers)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted" title={formatDate(p.updated)}>
                    {timeAgo(p.updated)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function Stats() {
  const profile = profileStore.use();
  const { query } = useRoute();
  const username = query.get("user") ?? profile.modrinthUsername;
  const [input, setInput] = useState(username);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate("/stats", { user: input.trim() });
  };

  return (
    <div>
      <PageHeader
        title="Creator stats"
        subtitle="Real download and follower numbers for any Modrinth creator. CurseForge doesn't offer a public author lookup."
      />
      <form onSubmit={submit} className="mb-6 flex max-w-md gap-2">
        <input className="input" placeholder="Modrinth username" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn btn-primary" disabled={!input.trim()}>
          Look up
        </button>
      </form>
      {username ? (
        <Report username={username} />
      ) : (
        <Empty title="Enter a Modrinth username" icon={<BarChart3 size={28} strokeWidth={1.5} />}>
          Or link yours in{" "}
          <Link to="/profile/edit" query={{ section: "accounts" }} className="text-accent underline underline-offset-2">
            your profile
          </Link>{" "}
          so it shows up here automatically.
        </Empty>
      )}
    </div>
  );
}
