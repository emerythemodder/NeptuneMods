# Testing Neptune

There are three levels. Start with the first; each one takes a few minutes.

## 1. Automated tests (1 minute, offline)

```bash
npm install
npm test
```

You should see `pass 38` and `fail 0`. These check:

- **Submission rules**: bad names, links and versions are rejected, and extra fields people sneak in are dropped.
- **The approval automation**: valid submissions wait for approval, only the `approved` label publishes, and nobody
  can take over someone else's project.
- **The registry build**: GitHub releases become versions with the right files, download counts and game versions.
  It runs against a fake GitHub, so no internet is needed.

The same tests run before every deploy. If one fails, the site isn't updated.

## 2. Try the site locally (5 minutes)

```bash
npm run demo
```

Open <http://localhost:5173>. The demo lists one real GitHub project (Mod Menu) as if it were published on Neptune.
Nothing you do here affects the live site.

Try each of these:

- [ ] **Home**: the "New on Neptune" section shows Mod Menu.
- [ ] **Mods → Source: Neptune**: Mod Menu is listed with its GitHub downloads and stars.
- [ ] **Open Mod Menu**: the README renders with its images, and **Versions** lists real releases with **Download**
      buttons.
- [ ] **Mods → Source: CurseForge**, pick **Fabric** and **1.20.1**: results are all Fabric mods, sorted by downloads.
- [ ] **Plugins → Platform: Paper**: a note says CurseForge can't filter by Paper, and Modrinth results still show.
- [ ] **Publish**: paste `TerraformersMC/ModMenu` and press **Check**. It finds the latest release and its `.jar`, and
      fills in the name and summary. Locally the site doesn't know its GitHub repo, so you'll see **Copy submission
      text** instead of **Submit on GitHub**. That's expected.
- [ ] **Bedrock**: click **Bedrock** next to the tabs. The tabs change to Add-ons, Maps, Texture packs, Scripts and
      Skins, and add-ons from CurseForge load. Pick a version like **1.21.50** and open a project: its versions have
      `.mcaddon` downloads.
- [ ] **Publish → Edition: Bedrock Edition**: the types, game versions and categories switch to Bedrock ones.
- [ ] **Customize profile**: set a Minecraft skin avatar, a banner and an accent color. Under **Accounts**, add
      Modrinth, CurseForge and GitHub usernames, then check that your **Profile** shows all three links.

Stop the demo with `Ctrl+C`.

## 3. A real publish on GitHub (10 minutes, after the site is live)

This goes through the whole real flow once, using a throwaway project.

1. **Make a test repo.** On GitHub, create a public repo called `neptune-test-mod`. Tick **Add a README**.
2. **Make a release.** In that repo, go to **Releases → Create a new release**:
   - Tag: `v1.0.0`
   - Title: `v1.0.0 for 1.21.1`
   - Attach any small file renamed to `neptune-test-mod-1.0.0.jar`. It doesn't need to be a real mod.
   - Press **Publish release**.
3. **Submit it.** On your live site, open **Publish**, paste `your-username/neptune-test-mod`, press **Check**, then
   fill in a summary, pick **Fabric** and **1.21.1**, and press **Submit on GitHub**. Press **Submit new issue** on the
   page that opens.
4. **Watch the check.** Within a minute, a bot comment should say the submission **looks valid**, and the issue gets
   a `submission` label. You can follow it under the repo's **Actions** tab.
5. **Approve it.** Add the **`approved`** label to the issue. The bot comments that it's published, closes the issue,
   and starts a deploy.
6. **See it live.** After the deploy finishes (about 2 minutes, shown in **Actions**), open **Mods → Source:
   Neptune**. Your test mod is there, with the `v1.0.0` release and a working download button.
7. **Clean up.** Remove the test entry from `registry/projects.json` in your Neptune repo and commit. The site
   redeploys without it. Then delete the `neptune-test-mod` repo.

### If something doesn't happen

- **No bot comment:** open **Actions → Neptune submissions** to see what happened. If nothing ran, check that
  **Settings → Actions → General** allows actions, and that **Settings → General → Features → Issues** is ticked.
- **Approved, but the deploy didn't start:** run **Actions → Deploy to GitHub Pages → Run workflow** by hand.
- **The site still shows old data:** it's cached for a few minutes. Hard-refresh with `Ctrl+Shift+R`.
