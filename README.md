# Neptune

Find and publish Minecraft mods, modpacks, shaders, resource packs, data packs, plugins and worlds. Neptune lists its own
projects alongside Modrinth and CurseForge, live at <https://neptunemc.com>.

- Filters (source, game version, loader, category, sort) are applied by each source and kept in the URL.
- Every number shown comes from GitHub, Modrinth or the CurseForge API.
- Profiles, pinned projects, collections and settings are stored in the visitor's browser (`localStorage`).

## Develop

```bash
npm install
npm run dev
```

Run the tests with `npm test`, or try the site with a sample Neptune project with `npm run demo`. See
[TESTING.md](TESTING.md) for a full walkthrough, including a real publish on GitHub.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository (the `main` branch).
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push to `main` builds and publishes the site with `.github/workflows/deploy.yml`. It also rebuilds every
   6 hours so Neptune projects pick up new releases and download counts.

### Custom domain (neptunemc.com, on Cloudflare)

1. In the Cloudflare dashboard, open **neptunemc.com → DNS → Records**. Delete any existing A, AAAA or CNAME records
   for `neptunemc.com` and `www`, then add these. Set **Proxy status** to **DNS only** (grey cloud) on every one, so
   GitHub can issue the HTTPS certificate.

   | Type  | Name  | Content                            |
   | ----- | ----- | ---------------------------------- |
   | A     | @     | 185.199.108.153                    |
   | A     | @     | 185.199.109.153                    |
   | A     | @     | 185.199.110.153                    |
   | A     | @     | 185.199.111.153                    |
   | AAAA  | @     | 2606:50c0:8000::153                |
   | AAAA  | @     | 2606:50c0:8001::153                |
   | AAAA  | @     | 2606:50c0:8002::153                |
   | AAAA  | @     | 2606:50c0:8003::153                |
   | CNAME | www   | `<your-github-username>.github.io` |

2. In the GitHub repo, open **Settings → Pages → Custom domain**, enter `neptunemc.com` and save. When the DNS check
   passes, tick **Enforce HTTPS**. Cloudflare DNS usually updates within minutes; the certificate can take up to an hour.
3. Recommended: in your GitHub account (not the repo), open **Settings → Pages → Add a domain**, enter `neptunemc.com`,
   and add the TXT record it shows to Cloudflare (also **DNS only**). This stops anyone else using your domain for
   their own GitHub Pages site.

The `public/CNAME` file records the domain; with the GitHub Actions deploy, the setting in step 2 is what counts.

## Publishing on Neptune

Neptune has no server. Projects are listed in `registry/projects.json`, and their files live in each creator's own
GitHub repo as Releases.

1. A creator fills in the form at **Publish** (`/#/publish`). It opens a pre-filled issue on this repo.
2. `.github/workflows/submissions.yml` validates it and comments on the issue. Fix-ups are re-checked when the issue is
   edited.
3. To approve, add the **`approved`** label. The workflow adds the project to `registry/projects.json`, commits it,
   closes the issue and redeploys the site.
4. At build time, `scripts/build-registry.mjs` pulls each project's releases, download counts, stars and README from
   GitHub into `registry.json`, which the site reads.

To remove a project, delete its entry from `registry/projects.json` and push. A creator updates their listing by
submitting again with the same URL name. Only the original submitter can do that.

Only people with triage access or above to this repo can add labels, so only you (and anyone you invite) can approve.

### CurseForge API key

CurseForge requires an API key. A default key is set in `src/config.ts`. To use your own, get one from
<https://console.curseforge.com> and add it as a repository secret named `CURSEFORGE_API_KEY`, or put
`VITE_CURSEFORGE_API_KEY=...` in `.env.local` for local builds. The site is static, so whichever key you use is visible
to visitors.
