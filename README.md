# StreamCore

StreamCore is a backend-focused streaming platform simulation built from the supplied diagrams and requirements. It models the core systems of a modern streaming product: authentication, multi-profile accounts, subscription state handling, catalog browsing, secure playback authorization, watch history, recommendations, Redis caching, background jobs, and admin analytics.

The frontend is intentionally lightweight. It acts as a control panel for demonstrating the backend systems rather than a full media player.

## What The App Does

- Lets a user register and log in.
- Supports multiple profiles per account.
- Loads a seeded content catalog from PostgreSQL.
- Generates a signed playback token when Play is clicked.
- Verifies stream access with token expiry and HMAC signature checks.
- Tracks watch progress and continue-watching data.
- Generates starter and personalized recommendations.
- Exposes admin APIs for content, analytics, and health checks.

## Tech Stack

- Backend: Node.js, TypeScript, Express
- ORM / DB: Prisma + PostgreSQL
- Cache: Redis
- Jobs: BullMQ
- Real time: Socket.io
- Auth: JWT + RBAC
- Frontend: React + Vite
- Local infra: Docker Compose

## Project Layout

- [backend/](backend) - API, services, domain logic, Prisma schema, seed data
- [frontend/](frontend) - React dashboard for login, catalog, playback, and recommendations
- [docker-compose.yml](docker-compose.yml) - Local PostgreSQL and Redis

## Core Backend Features

- JWT authentication with role-based access control
- Multi-profile account model
- Subscription state machine with Active, GracePeriod, Suspended, Cancelled, and Expired states
- Content catalog APIs with Redis caching
- Signed playback token generation and verification
- Watch history and continue-watching support
- Hybrid recommendation engine with fallback starter picks for new users
- Redis-backed rate limiting
- BullMQ queue for recommendation recalculation
- Admin analytics and health endpoints

## Frontend Features

- Create account and login flow
- Profile creation
- Catalog view with title, description, type, rating, year, and genres
- Play flow with visible playback authorization result
- Recommendations view
- Backend status messaging

## Local Setup

### 1. Start infrastructure

```bash
docker-compose up -d
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npx prisma db push
npm run seed
npm run dev
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Vite will use the first free port starting at `5174`. If that port is taken, it may move to `5175`, `5176`, and so on.

## Environment Variables

Backend values are documented in [backend/.env.example](backend/.env.example).

Key variables:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `STREAM_SIGNING_SECRET`
- `PORT`
- `RECOMMENDATION_TTL_SECONDS`
- `DEFAULT_SESSION_TTL_HOURS`
- `TMDB_API_KEY` (optional, for bulk catalog import)
- `TMDB_IMPORT_PAGES` (optional, default `3`)
- `TVMAZE_IMPORT_PAGES` (optional, default `10`, no API key needed)

For production frontend deployment, set `VITE_API_BASE` to your backend API URL ending in `/api`.

## Expand Catalog With TMDB

If you want a much larger catalog than the default seed data, import metadata from TMDB.

1. Create a TMDB API key from [developer.themoviedb.org](https://developer.themoviedb.org).
2. Set `TMDB_API_KEY` in `backend/.env`.
3. Optionally set `TMDB_IMPORT_PAGES` (each page is up to 20 items for movie and TV import).
4. Run:

```bash
cd backend
npm run import:catalog
```

The importer upserts content and genres into your existing schema. It imports metadata only (title, overview, genres, rating, year), not media files.

## Expand Catalog With TVMaze (No API Key)

If you want a free provider without API-key setup, use TVMaze.

1. Optionally set `TVMAZE_IMPORT_PAGES` in `backend/.env`.
2. Run:

```bash
cd backend
npm run import:catalog:tvmaze
```

This importer adds and updates series metadata (title, description, genres, rating, release year) in your existing catalog tables.

## Demo Flow

1. Open the frontend.
2. Create an account or log in.
3. Create a profile.
4. Load the catalog.
5. Click Play on a content item.
6. Check the Playback Result card for the signed stream URL and expiry.
7. Generate recommendations.

## API Highlights

- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Log in and get JWT
- `GET /api/content` - List catalog content
- `POST /api/content/play/:contentId` - Generate stream token
- `GET /stream/:contentId?token=...` - Verify signed stream access
- `POST /api/content/watch-progress` - Update watch history
- `GET /api/content/recommendations/:profileId` - Get recommendations
- `GET /api/admin/analytics` - Admin metrics
- `GET /api/health` - Health check

## Important Demo Credentials

- Admin email: `admin@streamcore.local`
- Admin password: `admin123`

The seed script also creates a starter catalog and a subscription for the seeded admin user.

## Hosting Recommendation

Best deployment split:

- Frontend: Vercel
- Backend: Railway or Render
- PostgreSQL: Railway Postgres or Neon
- Redis: Railway Redis or Upstash

If you deploy separately, set the frontend `VITE_API_BASE` to your backend public URL.

## Troubleshooting

- If login fails, ensure the backend is connected to the correct PostgreSQL database and the seed has been run.
- If the catalog is empty, run `npx prisma db push` and `npm run seed` inside `backend/`.
- If the frontend cannot reach the API, check `VITE_API_BASE`.
- If ports are busy, stop older dev server terminals and restart the app.

## Notes

This project is designed to demonstrate backend architecture and system design ideas from the diagrams, not to behave like a full consumer streaming platform.
