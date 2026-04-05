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

## Environment

Create a local `.env.local` file based on `.env.example`.

Required variables:

```env
WHOOP_CLIENT_ID=
WHOOP_CLIENT_SECRET=
WHOOP_REDIRECT_URI=http://localhost:3000/api/auth/whoop/callback
HEVY_API_KEY=
ADMIN_ACTION_SECRET=
```

Optional variables:

```env
DISCORD_WEBHOOK_URL=
```

`ADMIN_ACTION_SECRET` protects manual syncs and Discord delivery routes. Store it in `.env.local`, then enter the same value in the Settings page when you want to run protected actions from the browser.

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
