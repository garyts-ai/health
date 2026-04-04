# Health Dashboard

A private personal health dashboard that combines WHOOP recovery data and Hevy training data into one place, with the long-term goal of producing clear daily recommendations.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment

Create a local `.env.local` file based on `.env.example`.

Required variables:

```env
WHOOP_CLIENT_ID=
WHOOP_CLIENT_SECRET=
WHOOP_REDIRECT_URI=http://localhost:3000/api/auth/whoop/callback
HEVY_API_KEY=
```

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
