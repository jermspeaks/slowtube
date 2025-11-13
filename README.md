# YouTube Watch Later

A comprehensive web application for managing your media consumption across YouTube videos, movies, and TV shows with tags, comments, state management, and intelligent organization.

## Features

### YouTube Videos
- Import videos from Google Takeout files (JSON or CSV format)
- Automatically fetch video details from YouTube Data API v3 (title, description, duration, channel, etc.)
- View videos in card or table format
- Tag videos with user-defined tags
- Add comments to videos
- Manage video states: feed, inbox, or archive
- View detailed video information including published date, duration, and channel
- **Built-in video player** for watching videos directly in the app
- Date range filtering for dashboard, stats, and group views
- Pagination (100 items per page)
- Clear all videos at once
- Automatic daily refresh when app is open
- Manual refresh option

### Movies & TV Shows
- Import movies and TV shows from TMDB (using TMDB IDs or IMDb IDs)
- Import movies from Letterboxd watchlist (CSV export)
- **Movies management**: Browse, search, and organize your movie collection
- **TV Shows management**: 
  - Track TV shows with episode information
  - Filter by status, archived/unarchived state
  - Sort by title, first air date, next episode date, or last episode date
  - View completion progress (watched episodes)
  - Archive/unarchive shows
  - Episode detail views
- TMDB integration for fetching movie and TV show metadata
- Search and add new movies/TV shows via TMDB search

### Channels
- View channels from your watch later list
- Channel detail pages with video listings
- Track subscribed channels (requires YouTube OAuth)

### Organization & Discovery
- **Dashboard**: Unified view showing recent YouTube videos, movies, and TV shows
- **Grouped View**: Organize content by groups/categories
- **Upcoming Calendar**: View scheduled TV show episodes and releases
- **Watch Next**: Curated list of items ready to watch (inbox videos, starred content)
- **Tags**: Tag management and organization system

### User Preferences
- **Dark Mode**: System, light, or dark theme with persistent preferences
- **Timezone Settings**: Configure your timezone for accurate date/time display in calendar views
- Toast notifications using shadcn sonner for better UX

### Analytics
- **Statistics page** with comprehensive analytics:
  - Channel rankings (top channels by video count)
  - Time statistics showing when videos were added (by hour, day of week, and month)
  - Total watch time calculation
  - Complete channel list
  - Date range filtering for statistics

### Technical Features
- Local SQLite persistence with automatic database migrations
- Optional YouTube OAuth 2.0 for subscribed channels and enhanced features

## Tech Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite
- **Authentication**: YouTube OAuth 2.0 (optional)
- **APIs**: 
  - YouTube Data API v3 (for video details)
  - TMDB API (for movies and TV shows)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS

## Setup

### Prerequisites

- Node.js 18+ and npm
- Google Cloud Project with YouTube Data API v3 enabled (optional, for video details fetching)
- OAuth 2.0 credentials configured (optional, for subscribed channels)
- TMDB API key (required for movies and TV shows)

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
# Edit .env with your credentials:
# - GOOGLE_CLIENT_ID (optional, for YouTube OAuth)
# - GOOGLE_CLIENT_SECRET (optional, for YouTube OAuth)
# - TMDB_API_KEY (required for movies and TV shows)
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

## API Setup

### TMDB API (Required for Movies & TV Shows)

1. Go to [TMDB](https://www.themoviedb.org/) and create an account
2. Navigate to [API Settings](https://www.themoviedb.org/settings/api)
3. Request an API key
4. Copy your API key to the `.env` file as `TMDB_API_KEY`

### Google OAuth Setup (Optional)

YouTube OAuth is optional and only needed for:
- Fetching video details from YouTube API (title, description, duration, etc.)
- Syncing subscribed channels
- Accessing subscription-related features

If you want to use YouTube OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3001/auth/youtube/callback`
6. Copy Client ID and Client Secret to `.env` file

**Note**: Without YouTube OAuth, you can still:
- Import videos from Google Takeout files
- Use all movie and TV show features
- Use most of the app's functionality

However, detailed video information (title, description, duration, etc.) won't be fetched automatically for YouTube videos.

## Usage

1. Start both servers (backend and frontend)
2. Navigate to http://localhost:3000
3. Configure your preferences in Settings:
   - Set your timezone for accurate calendar displays
   - Choose your theme preference (system/light/dark)
   - Optionally connect your YouTube account for enhanced features

### Importing Content

#### YouTube Videos
1. (Optional) Click "Connect with YouTube" in Settings to authenticate
2. Import your Google Takeout file:
   - Download your watch history from [Google Takeout](https://takeout.google.com/)
   - Select "YouTube and YouTube Music" → "Watch history"
   - Upload the JSON or CSV file using the "Import Google Takeout File" button in Settings
3. Video details will be automatically fetched from YouTube API in the background (if authenticated)

#### Movies & TV Shows
1. **From TMDB (data.json)**: Import TV shows and movies using TMDB IDs
   - Place your `data.json` file in the backend directory
   - Click "Import from TMDB (data.json)" in Settings
2. **From IMDb (data2.json)**: Import using IMDb IDs
   - Place your `data2.json` file in the backend directory
   - Click "Import from IMDb (data2.json)" in Settings
3. **From Letterboxd**: Import your watchlist
   - Export your watchlist from Letterboxd as CSV
   - Click "Import from Letterboxd (CSV)" in Settings and upload the file
4. **Manual Search**: Use the search button in Movies or TV Shows pages to find and add content via TMDB

### Managing Content

- **Videos**: Click on any video to view full details, edit tags/comments, or watch in the built-in player
- **Movies**: Browse, search, and manage your movie collection
- **TV Shows**: Track episodes, view completion progress, and manage show status
- **Channels**: View channels from your watch later list and explore channel details
- Use filters, sorting, and date ranges to organize your content
- Use the "Clear All" buttons in Settings to delete content (use with caution)

## Views

### Dashboard
The main unified view showing recent content across all media types:
- Recent YouTube videos (feed state)
- Recent movies
- Recent TV shows
- Quick access to all content types
- Click on any item to view/edit details

### YouTube Watch Later
The main view for browsing and managing your YouTube videos:
- Filter videos by state (feed, inbox, archive)
- Filter by channel
- Search by title or description
- Date range filtering
- Sort by published date or date added
- Switch between card and table views
- Pagination (100 items per page)
- Click on any video to view/edit details or watch in the built-in player

### Movies
Browse and manage your movie collection:
- Search movies by title
- Sort by title, release date, or date added
- Pagination support
- Add new movies via TMDB search
- View movie details and metadata

### TV Shows
Comprehensive TV show management:
- Filter by status, archived/unarchived state, and completion status
- Sort by title, first air date, next episode date, or last episode date
- View completion progress (watched episodes)
- Archive/unarchive shows
- Add new TV shows via TMDB search
- Navigate to show detail pages for episode management
- Episode views with filtering and sorting

### Channels
- View channels from your watch later list
- Channel detail pages showing all videos from that channel
- Track subscribed channels (requires YouTube OAuth)

### Upcoming Calendar
View scheduled TV show episodes and releases:
- Calendar view showing upcoming episodes
- Retroactive view for past episodes
- Timezone-aware date display
- Filter by date range

### Watch Next
Curated list of content ready to watch:
- Shows YouTube videos in "inbox" state
- Future: Will show starred movies and TV shows

### Stats
The statistics page provides analytics about your watch later videos:
- **Total Watch Time**: Sum of all video durations (formatted as months, days, hours, minutes, and seconds)
- **Channel Rankings**: Table showing top channels ranked by number of videos
- **Time Statistics**: Visual charts and tables showing when you mark videos as "Watch Later":
  - By hour of day (0-23)
  - By day of week (Monday-Sunday)
  - By month (January-December)
- **Channel List**: Complete list of all unique channels in your watch later list
- **Date Range Filtering**: Filter statistics by date range

All time statistics include both interactive bar charts (using recharts) and detailed tables for easy analysis.

### Grouped View
Organize content by groups/categories:
- Group videos by channel
- Date range filtering
- Video counts per channel

## Navigation Design Philosophy

The navigation structure is organized around a deliberate mental model designed to slow down consumption and create intentional decision-making. The three main sections follow a clear workflow: **Discover → Organize → Watch**.

### Core Philosophy: Slowing Down Consumption

The navigation is structured to separate two distinct modes of interaction:

1. **Organize & Discover Mode**: Finding, browsing, and categorizing content
2. **Decision-Making Mode**: Choosing what to actually consume based on organized preferences

This separation creates intentional friction in the consumption process, encouraging users to be more thoughtful about what they watch rather than mindlessly consuming content.

### The Three-Section Structure

#### Discover
**Purpose**: "What is possible to watch?"

This section contains all the content available to the user:
- **Dashboard**: Main view of all videos
- **Movies**: Movie collection
- **TV Shows**: TV show collection
- **Channels**: Subscribed and watch later channels
- **Upcoming**: Future releases and scheduled content

The "Upcoming" section is intentionally placed here because it helps users discover what's coming that they might want to watch, setting up the data flow correctly: first, see what's possible, then organize it.

#### Organize
**Purpose**: "I have chosen things I want to watch later, but it depends on different factors."

This section is for categorizing and understanding chosen content:
- **Grouped View**: Organize content by groups/categories
- **Stats**: Analytics and insights about your collection
- **Tags**: Tag management and organization

The "Organize" section allows users to create different groups/buckets based on various factors (mood, genre, time available, etc.). This categorization becomes the foundation for the decision-making process in the "Watch" section.

#### Watch
**Purpose**: "Based on the preferences I created by grouping and adding my taste preferences, show me what I should watch."

This section is for actual consumption decisions:
- **Watch Next**: Curated list based on organized preferences
  - For watch later videos: Shows items in the "inbox" state
  - For movies/TV shows: Shows starred items (feature pending)

The "Watch" section surfaces content based on the organizational work done in the previous sections, making it easier to decide what to consume next.

### Design Decisions

1. **Icon-Based Navigation**: All navigation items have icons for quick visual recognition and better mobile experience
2. **Responsive Design**: 
   - Desktop: Horizontal dropdown menus for efficient navigation
   - Mobile/Tablet: Hamburger menu with full-screen overlay to accommodate touch interactions
3. **Future-Proof Structure**: The three-section model easily accommodates new media types (podcasts, music albums, books, etc.) without requiring navigation restructuring
4. **Settings Placement**: Settings is always visible on the right side, separate from the main workflow, as it's a utility rather than part of the content consumption flow

### Data Flow

The navigation structure creates a natural data flow:

```
Discover (what's possible) 
  ↓
Organize (categorize by factors) 
  ↓
Watch (decision-making based on organization)
```

This flow ensures users:
1. First explore what's available
2. Then organize it based on their preferences and factors
3. Finally make informed decisions about what to consume

By separating these concerns, the application encourages more intentional media consumption rather than passive browsing.

## Database Migrations

The application includes an automatic database migration system that runs on startup. Migrations are stored in `backend/src/migrations/` and are executed automatically when the backend server starts. The migration system:

- Tracks executed migrations in a `.migrations` file
- Only runs pending migrations
- Includes safety checks to prevent duplicate column/index errors
- Is idempotent (safe to run multiple times)

## Video Details Fetching

After importing videos from Google Takeout, the app will automatically fetch detailed information from YouTube Data API v3 (if authenticated):

- Video title and description
- Duration
- Published date
- Channel title
- Thumbnail URL
- YouTube URL

The fetch process runs in the background and shows progress. Videos with a `pending` fetch status will be processed automatically when you click "Import Google Takeout File" or manually trigger a fetch.

**Note**: YouTube OAuth is optional. Without it, videos can still be imported from Google Takeout, but detailed metadata won't be fetched automatically.

## Settings

The Settings page provides comprehensive configuration options:

- **YouTube Authentication**: Connect your YouTube account (optional)
- **Import Videos**: Upload Google Takeout files
- **Import TV Shows & Movies**: Import from TMDB, IMDb, or Letterboxd
- **Timezone Settings**: Configure your timezone for accurate date/time display
- **Theme Settings**: Choose between system, light, or dark theme
- **Danger Zone**: Clear all videos or reset TV shows/movies (use with caution)
