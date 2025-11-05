# YouTube Watch Later

A web application for managing your YouTube watch later list with tags, comments, and state management.

## Features

- Import videos from Google Takeout files (JSON or CSV format)
- Automatically fetch video details from YouTube Data API v3 (title, description, duration, channel, etc.)
- View videos in card or table format
- Tag videos with user-defined tags
- Add comments to videos
- Manage video states: feed, inbox, or archive
- View detailed video information including published date, duration, and channel
- Clear all videos at once
- Automatic daily refresh when app is open
- Manual refresh option
- Local SQLite persistence with automatic database migrations
- **Statistics page** with analytics:
  - Channel rankings (top channels by video count)
  - Time statistics showing when videos were added (by hour, day of week, and month)
  - Total watch time calculation
  - Complete channel list

## Tech Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite
- **Authentication**: YouTube OAuth 2.0
- **Styling**: Tailwind CSS

## Setup

### Prerequisites

- Node.js 18+ and npm
- Google Cloud Project with YouTube Data API v3 enabled
- OAuth 2.0 credentials configured

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd youtube-watch-later
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

**Note**: Tailwind CSS is already configured in this project. The frontend uses Tailwind CSS for all styling. Configuration files:
- `frontend/tailwind.config.js` - Tailwind configuration
- `frontend/postcss.config.js` - PostCSS configuration
- `frontend/src/index.css` - Contains Tailwind directives

4. Configure environment variables:
```bash
cd ../backend
cp .env.example .env
# Edit .env with your Google OAuth credentials
```

5. Start the backend server:
```bash
cd backend
npm run dev
```

6. Start the frontend development server:
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3001/auth/youtube/callback`
6. Copy Client ID and Client Secret to `.env` file

**Note**: Authentication is required for fetching video details from YouTube API. Without authentication, you can still import videos from Google Takeout files, but detailed information (title, description, duration, etc.) won't be fetched automatically.

## Usage

1. Start both servers (backend and frontend)
2. Navigate to http://localhost:3000
3. Click "Connect with YouTube" to authenticate (required for fetching video details)
4. Import your Google Takeout file:
   - Download your watch history from [Google Takeout](https://takeout.google.com/)
   - Select "YouTube and YouTube Music" → "Watch history"
   - Upload the JSON or CSV file using the "Import Google Takeout File" button
5. Video details will be automatically fetched from YouTube API in the background
6. Manage your videos with tags, comments, and state changes
7. Click on any video to view full details and edit tags/comments
8. Use the "Clear All Videos" button to delete all videos at once (use with caution)

## Views

### Dashboard
The main view for browsing and managing your videos:
- Filter videos by state (feed, inbox, archive, or all)
- Filter by channel
- Search by title or description
- Sort by published date or date added
- Switch between card and table views
- Click on any video to view/edit details

### Stats
The statistics page provides analytics about your watch later videos:
- **Total Watch Time**: Sum of all video durations (formatted as months, days, hours, minutes, and seconds)
- **Channel Rankings**: Table showing top channels ranked by number of videos
- **Time Statistics**: Visual charts and tables showing when you mark videos as "Watch Later":
  - By hour of day (0-23)
  - By day of week (Monday-Sunday)
  - By month (January-December)
- **Channel List**: Complete list of all unique channels in your watch later list

All time statistics include both interactive bar charts (using recharts) and detailed tables for easy analysis.

## Database Migrations

The application includes an automatic database migration system that runs on startup. Migrations are stored in `backend/src/migrations/` and are executed automatically when the backend server starts. The migration system:

- Tracks executed migrations in a `.migrations` file
- Only runs pending migrations
- Includes safety checks to prevent duplicate column/index errors
- Is idempotent (safe to run multiple times)

## Video Details Fetching

After importing videos from Google Takeout, the app will automatically fetch detailed information from YouTube Data API v3:

- Video title and description
- Duration
- Published date
- Channel title
- Thumbnail URL
- YouTube URL

The fetch process runs in the background and shows progress. Videos with a `pending` fetch status will be processed automatically when you click "Import Google Takeout File" or manually trigger a fetch.
