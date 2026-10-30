# Setting up accounts

Neptune's sign-up and sign-in (email, Google, Microsoft and Discord) run on **Supabase**, a free hosted backend.
Until you do this, the site works as before: profiles and collections are saved in each visitor's browser.

Do the parts in order. Part 1 is required; parts 3–5 each add one sign-in button and can be done any time.

You'll copy a few values between websites. **Client secrets are passwords: only paste them into the Supabase
dashboard, never into the code, a GitHub file or a chat.**

---

## 1. Create the Supabase project (10 minutes)

1. Go to **supabase.com**, click **Start your project**, and sign up (signing in with GitHub is easiest).
2. Click **New project**. Name it `neptune`, set a strong database password (save it in your password manager), pick
   the region closest to you, and click **Create new project**. Wait a minute for it to finish.
3. **Create the table.** In the left sidebar, open **SQL Editor → New query**. Open `supabase/schema.sql` from this
   repo, copy everything, paste it in, and click **Run**. You should see "Success. No rows returned".
4. **Set the site address.** Open **Authentication → URL Configuration**:
   - **Site URL:** `https://neptunemc.com`
   - **Redirect URLs:** click **Add URL** and add `https://neptunemc.com/**`, then add `http://localhost:5173/**` so
     sign-in also works when testing locally.
   - Click **Save**.
5. **Copy your two public values.** Open **Project Settings → API** (or **Data API**). Copy the **Project URL**, which
   looks like `https://abcdefgh.supabase.co`, and the **anon public** key, a long string starting with `eyJ`.
   Don't use the `service_role` key; that one is secret.

## 2. Give the values to the website (3 minutes)

1. In GitHub, open **github.com/emerythemodder/NeptuneMods → Settings → Secrets and variables → Actions**.
2. Click the **Variables** tab (not Secrets), then **New repository variable**, twice:
   - Name `SUPABASE_URL`, value: your Project URL
   - Name `SUPABASE_ANON_KEY`, value: your anon public key
3. Go to **Actions → Deploy to GitHub Pages → Run workflow**. After about 2 minutes, **neptunemc.com** shows a
   **Sign in** button. Email sign-up works now.

**Test it:** click **Sign in → Create an account**, use your email, and open the confirmation link Supabase sends.

> Supabase's built-in email sender only allows a few emails per hour, which is fine for testing. Before lots of people
> sign up, connect your own sender under **Project Settings → Authentication → SMTP Settings**. Resend
> (resend.com) has a free plan and gives you a `noreply@neptunemc.com` address.

## 3. Add "Continue with Google" (10 minutes)

1. Go to **console.cloud.google.com** and create a project called `Neptune`.
2. Open **APIs & Services → OAuth consent screen**. Choose **External**, fill in the app name (`Neptune`), your
   support email and `neptunemc.com` as the app domain, then save.
3. Open **APIs & Services → Credentials → Create credentials → OAuth client ID**. Choose **Web application**.
4. Under **Authorized redirect URIs**, add `https://<your-project>.supabase.co/auth/v1/callback`. Use your Project
   URL from part 1 with `/auth/v1/callback` on the end. Click **Create**.
5. Copy the **Client ID** and **Client secret**.
6. In Supabase, open **Authentication → Sign In / Providers → Google**, switch it on, paste both values, and save.

## 4. Add "Continue with Microsoft" (10 minutes)

1. Go to **portal.azure.com** and sign in with a Microsoft account. Search for **App registrations** and click
   **New registration**.
2. Name it `Neptune Website`. Under **Supported account types**, choose **Accounts in any organizational directory
   and personal Microsoft accounts**.
3. Under **Redirect URI**, choose **Web** and enter `https://<your-project>.supabase.co/auth/v1/callback`. Click
   **Register**.
4. Copy the **Application (client) ID** from the overview page.
5. Open **Certificates & secrets → New client secret**, give it a description, and click **Add**. Copy the **Value**
   right away (it's only shown once).
6. In Supabase, open **Authentication → Sign In / Providers → Azure**, switch it on, paste the client ID and secret,
   leave **Azure Tenant URL** empty, and save.

Microsoft client secrets expire (24 months at most). Put a reminder in your calendar to make a new one.

## 5. Add "Continue with Discord" (5 minutes)

1. Go to **discord.com/developers/applications** and click **New Application**. Name it `Neptune`.
2. Open **OAuth2**. Under **Redirects**, add `https://<your-project>.supabase.co/auth/v1/callback` and save.
3. Copy the **Client ID**, then click **Reset Secret** and copy the **Client Secret**.
4. In Supabase, open **Authentication → Sign In / Providers → Discord**, switch it on, paste both values, and save.

---

## What gets stored

Each account has one row in the `user_data` table: the profile, collections and settings, the same things the site
already saved in the browser. The security rules in `schema.sql` let people read and change only their own row.
People can delete their account (and that row) from **Settings → Account**.

If someone signs in with Google and later with Microsoft using the same email address, Supabase links them to the
same account.
