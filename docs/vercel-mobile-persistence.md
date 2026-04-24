# Vercel Mobile Persistence Setup

This guide moves Health OS from local/Tailscale-only access to a persistent mobile web app on Vercel Hobby with Neon Postgres and GitHub SSO.

## 1. Commit And Push The App Changes

Vercel deploys from GitHub, not from uncommitted files on your PC.

Before expecting Vercel to see code changes:

```powershell
git status
git add .
git commit -m "Add Vercel mobile persistence"
git push
```

If the Vercel project is connected to `main`, merge the PR into `main` to update the production deployment.

Preview deployments can build from PR branches, but production updates come from the configured production branch.

## 2. Create Or Import The Vercel Project

Use these project settings:

```text
Application Preset: Next.js
Root Directory: ./
Build Command: npm run build
Output Directory: leave default
Install Command: npm install
```

Deploy once to get a stable URL like:

```text
https://healthmax-two.vercel.app
```

Use that exact URL in the later OAuth settings.

## 3. Add Neon Postgres

In Vercel, add Neon Postgres from the Marketplace.

Confirm Vercel adds:

```env
DATABASE_URL=postgres://...
```

Add it to at least the Production environment. Add it to Preview too if you want PR deployments to use the same database or a separate Neon branch.

## 4. Create GitHub SSO Credentials

In GitHub:

1. Open Settings.
2. Go to Developer settings.
3. Open OAuth Apps.
4. Click New OAuth App.
5. Use `Health OS` as the app name.
6. Set Homepage URL to your Vercel URL.
7. Set Authorization callback URL to:

```text
https://healthmax-two.vercel.app/api/auth/callback/github
```

Copy the client ID and generate a client secret. Add them to Vercel:

```env
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
```

Limit access to your GitHub account:

```env
ALLOWED_GITHUB_USERS=your-github-username
```

Multiple allowed GitHub usernames can be comma-separated.

## 5. Generate Auth Secrets

Run this locally in PowerShell:

```powershell
node -e "console.log(crypto.randomBytes(32).toString('base64url'))"
```

Use the generated value for both:

```env
AUTH_SECRET=generated_value
NEXTAUTH_SECRET=generated_value
```

Add the production auth URL:

```env
NEXTAUTH_URL=https://healthmax-two.vercel.app
AUTH_TRUST_HOST=true
```

## 6. Add WHOOP, Hevy, And Discord Variables

Add these in Vercel:

```env
WHOOP_CLIENT_ID=...
WHOOP_CLIENT_SECRET=...
WHOOP_REDIRECT_URI=https://healthmax-two.vercel.app/api/auth/whoop/callback
HEVY_API_KEY=...
DISCORD_WEBHOOK_URL=...
```

Then update the WHOOP developer app redirect URI to exactly match:

```text
https://healthmax-two.vercel.app/api/auth/whoop/callback
```

OAuth redirect URLs must match exactly.

## 7. Redeploy After Env Changes

Vercel does not apply new environment variables to an already-built deployment.

After adding or editing env vars:

1. Open the Vercel project.
2. Go to Deployments.
3. Select the latest deployment.
4. Click Redeploy.

## 8. Migrate Local SQLite Data To Neon

After `DATABASE_URL` is available, run this locally:

```powershell
$env:DATABASE_URL="postgres://..."
npm run db:migrate:postgres
```

The script reads:

```text
data/health-dashboard.sqlite
```

It migrates provider tokens, WHOOP records, Hevy workouts, nutrition targets/intake, and Discord delivery history.

## 9. Verify The Deployed App

Open the Vercel URL on desktop first:

1. Sign in with GitHub.
2. Confirm Today loads.
3. Open Utilities.
4. Sync WHOOP.
5. Sync Hevy.
6. Add a test nutrition entry.
7. Refresh and confirm it persists.
8. Send or preview the Discord/LLM handoff.

Then open the same Vercel URL on iPhone Safari and use Share -> Add to Home Screen.

## Notes

Local mode still works without `DATABASE_URL`; it uses SQLite.

Vercel mode should use `DATABASE_URL`; it uses Neon Postgres.

Tailscale can stay as a backup, but the Vercel URL is the persistent mobile path.
