# Health Dashboard

A private personal health dashboard that combines WHOOP recovery data and Hevy training data into one place, with the long-term goal of producing clear daily recommendations.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

For a more stable local run that behaves like production:

```bash
npm run start:prod
```

This builds the app and starts the production server on [http://localhost:3000](http://localhost:3000).

## Private mobile access

The local phone setup is Tailscale. Install Tailscale on this Windows PC and on your iPhone, sign into the same account, then run:

```bash
npm run mobile
```

Open the app from the phone at `http://<your-pc-tailscale-name>:8000` or `http://<your-pc-tailscale-ip>:8000`. In Safari, use Share -> Add to Home Screen to install it like a private app. The PC must stay awake and the mobile server must keep running.

For persistent mobile access without keeping the PC awake, deploy to Vercel Hobby with a free Neon Postgres database. The deployed app uses GitHub SSO and stores dashboard data in Postgres instead of the local SQLite file.

Vercel setup:

```bash
npm install
npm run build
```

Create a Neon Postgres database through the Vercel Marketplace, then set the deployment environment variables listed below. After Neon is connected, migrate the current local SQLite data once:

```bash
$env:DATABASE_URL="postgres://..."
npm run db:migrate:postgres
```

Update the WHOOP app redirect URI to your Vercel callback URL:

```text
https://healthmax-two.vercel.app/api/auth/whoop/callback
```

Create a GitHub OAuth app for the SSO gate with this callback URL:

```text
https://healthmax-two.vercel.app/api/auth/callback/github
```

## Environment

Create a local `.env.local` file based on `.env.example`.

Required variables:

```env
WHOOP_CLIENT_ID=
WHOOP_CLIENT_SECRET=
WHOOP_REDIRECT_URI=https://healthmax-two.vercel.app/api/auth/whoop/callback
HEVY_API_KEY=
```

Optional variables:

```env
DISCORD_WEBHOOK_URL=
DATABASE_URL=
AUTH_SECRET=
NEXTAUTH_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
NEXTAUTH_URL=https://healthmax-two.vercel.app
AUTH_TRUST_HOST=true
ALLOWED_GITHUB_USERS=your-github-username
```

If `DATABASE_URL` is absent, the app uses local SQLite at `data/health-dashboard.sqlite`. If `DATABASE_URL` is present, the app initializes and uses Postgres. If GitHub auth variables and `ALLOWED_GITHUB_USERS` are present, the public app is protected by GitHub SSO.

## Current Direction

- Next.js app router foundation
- Local-first development
- WHOOP OAuth integration
- Hevy API integration
- Deterministic recommendation engine
- No paid LLM dependency in the MVP

## Next Milestones

- Add WHOOP auth routes and token exchange
- Add Hevy API client and ingestion flow
- Define normalized daily health/training schema
- Build the first Today dashboard
- Add sync freshness, provenance, and recommendation explanations

## Privacy

The WHOOP privacy policy page lives at [privacy.html](./privacy.html).
