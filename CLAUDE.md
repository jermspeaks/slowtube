# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Does

Slowtube is a personal media consumption organizer for YouTube videos, movies, and TV shows. The philosophy is "slow down consumption" through intentional organization. It's a local-first app storing all data in SQLite.

## Project Structure

Monorepo with two packages:
- `frontend/` — React 19 + Vite 7 SPA, runs on port 5200
- `backend/` — Express 5 + Node.js API server, runs on port 3001

Frontend proxies `/api/*` requests to the backend via Vite config.

## Commands

### Backend
```bash
cd backend
npm run dev      # tsx watch (hot reload)
npm run build    # tsc compile to dist/
npm start        # run compiled dist/server.js
```

### Frontend
```bash
cd frontend
npm run dev      # Vite dev server on port 5200
npm run build    # tsc + vite build
npm run lint     # ESLint (strict: 0 warnings allowed)
npm run preview  # Preview production build
```

## Architecture

### Frontend (`frontend/src/`)

Feature-based organization:
- `features/youtube/` — Watch Later, Dashboard, Stats, Channels, Tags, Archive, Player pages
- `features/media/` — Movies, TV shows, Calendar pages; TMDB API integration
- `shared/` — Layout, UI components (shadcn/ui + Radix UI), auth hooks, API client

State management is local React hooks only (no Redux/Zustand). Data fetching uses Axios. Styling is Tailwind CSS 4.

### Backend (`backend/src/`)

- `server.ts` — Express app entry point, mounts all routes
- `services/database.ts` — Core database abstraction (~2900 lines); all SQLite queries go here
- `services/youtube.ts` — YouTube Data API v3 integration, OAuth token management, batch fetching
- `services/tmdb.ts` — TMDB API for movie/TV metadata
- `services/gemini.ts` — Google Gemini AI integration (Zod validation, JSON schema)
- `services/import.ts` — Google Takeout, TMDB data.json, Letterboxd CSV parsers
- `services/tv-episode-refresh.ts` — Daily cron job to refresh episode data
- `routes/` — Express route handlers (thin; delegate to services)
- `migrations/` — 40+ sequential SQL migrations, auto-applied on startup

### Database

SQLite at `backend/database/watch-later.db`. Key tables: `videos`, `media_states`, `channels`, `tags`, `comments`, `oauth_sessions`, `movies`, `tv_shows`, `tv_episodes`, `movie_playlists`, `channel_lists`.

Migrations run automatically on server start via `src/config/migrations.ts`.

## Environment Variables

Copy `backend/.env.example` to `backend/.env`. Required for full functionality:
- `YOUTUBE_API_KEY` — YouTube Data API v3
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — YouTube OAuth
- `TMDB_API_KEY` — Movies and TV shows
- `PORT` (default: 3001), `FRONTEND_URL` (default: http://localhost:3000)
- `TV_EPISODE_REFRESH_ENABLED`, `TV_EPISODE_REFRESH_TIME` — cron schedule
