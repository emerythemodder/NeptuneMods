import { Check, Download as DownloadIcon, ExternalLink, ShieldAlert } from "lucide-react";
import { LAUNCHER_ASSET, LAUNCHER_REPO } from "../config";
import { Notice, Skeleton } from "../components/ui";
import { formatCompact, formatDate } from "../lib/format";
import { useAsync } from "../lib/useAsync";

interface Release {
  name: string | null;
  tag_name: string;
  html_url: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
  assets: { name: string; size: number; download_count: number; browser_download_url: string }[];
}

/** The newest published release that has the installer attached. */
async function latestInstaller() {
  const res = await fetch(`https://api.github.com/repos/${LAUNCHER_REPO}/releases?per_page=20`);
  if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
  const releases: Release[] = await res.json();
  for (const r of releases) {
    if (r.draft) continue;
    const asset = r.assets.find((a) => a.name === LAUNCHER_ASSET);
    if (asset) {
      const downloads = releases.flatMap((x) => x.assets).filter((a) => a.name === LAUNCHER_ASSET).reduce((n, a) => n + a.download_count, 0);
      return { release: r, asset, downloads };
    }
  }
  return null;
}

const FEATURES = [
  "Sign in with Microsoft. Neptune checks you own Minecraft: Java Edition.",
  "Separate instances for Vanilla, Fabric, Quilt, Forge and NeoForge, each with its own mods and worlds.",
  "Install mods, resource packs and shaders from Neptune, Modrinth and CurseForge, with required dependencies added for you.",
  "Downloads the right Java for each Minecraft version automatically.",
  "Bedrock add-ons open straight into Minecraft for Windows.",
];

const mb = (bytes: number) => `${Math.round(bytes / 1_000_000)} MB`;

export function Download() {
  const latest = useAsync(latestInstaller, []);
  const info = latest.data;

  return (
    <div className="space-y-10">
      <section className="flex flex-col items-start gap-10 pt-2 sm:pt-6 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">Neptune Launcher</h1>
          <p className="mt-3 max-w-xl text-muted">
            A Minecraft launcher with Neptune, Modrinth and CurseForge built in. Make an instance, add mods, and press Play.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {latest.loading ? (
              <Skeleton className="h-11 w-56" />
            ) : info ? (
              <a href={info.asset.browser_download_url} className="btn btn-primary h-11 px-5 text-[14px]">
                <DownloadIcon size={16} /> Download for Windows
              </a>
            ) : (
              <button className="btn h-11 px-5 text-[14px]" disabled>
                <DownloadIcon size={16} /> Not released yet
              </button>
            )}
            {info && (
              <span className="num text-[13px] text-muted">
                {info.release.name || info.release.tag_name} · {mb(info.asset.size)} · {formatDate(info.release.published_at)}
                {info.downloads > 0 && ` · ${formatCompact(info.downloads)} downloads`}
              </span>
            )}
          </div>
          <p className="mt-2 text-[12px] text-faint">Windows 10 or 11, 64-bit. Java is downloaded for you.</p>

          {latest.error && (
            <div className="mt-4 max-w-xl">
              <Notice tone="error">
                Couldn't check for the latest version ({latest.error}).{" "}
                <a href={`https://github.com/${LAUNCHER_REPO}/releases`} className="underline" target="_blank" rel="noreferrer">
                  See all releases
                </a>
              </Notice>
            </div>
          )}
          {!latest.loading && !latest.error && !info && (
            <div className="mt-4 max-w-xl">
              <Notice>The first version hasn't been published yet. Check back soon.</Notice>
            </div>
          )}
        </div>
        <img
          src="./planet.webp"
          alt=""
          width={220}
          height={220}
          className="hidden shrink-0 drop-shadow-[0_20px_60px_rgba(129,82,212,0.35)] md:block"
        />
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-3 text-[15px] font-semibold">What it does</h2>
          <ul className="panel divide-y divide-line">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3 px-4 py-3 text-[13px]">
                <Check size={15} className="mt-0.5 shrink-0 text-accent" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <aside className="space-y-4">
          <div className="panel p-4 text-[13px]">
            <h3 className="mb-2 flex items-center gap-2 font-semibold">
              <ShieldAlert size={15} className="text-amber-500" /> "Windows protected your PC"
            </h3>
            <p className="text-muted">
              The installer isn't code-signed yet, so Windows may warn you the first time. Click <b className="text-fg">More info</b>, then{" "}
              <b className="text-fg">Run anyway</b>.
            </p>
          </div>
          <a
            href={`https://github.com/${LAUNCHER_REPO}/releases`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-accent"
          >
            All versions and release notes <ExternalLink size={12} />
          </a>
        </aside>
      </section>
    </div>
  );
}
