# YouTube Watch Later

A web application for managing your YouTube watch later list with tags, comments, and state management.

## Features

- Import videos from YouTube Watch Later playlist via YouTube Data API v3
- View videos in card or table format
- Tag videos with user-defined tags
- Add comments to videos
- Manage video states: feed, inbox, or archive
- Automatic daily refresh when app is open
- Manual refresh option
- Local SQLite persistence

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite
- **Authentication**: YouTube OAuth 2.0

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

## Usage

1. Start both servers (backend and frontend)
2. Navigate to http://localhost:3000
3. Click "Connect with YouTube" to authenticate
4. Import your watch later playlist
5. Manage your videos with tags, comments, and state changes

