# WakaTime Data Sync & Dashboard

A tool built with NestJS to fetch your daily WakaTime coding statistics, store them in a GitHub Gist, and beautifully display them on a web page using ECharts.

## Features

- **Automated Sync**: Uses GitHub CI/CD (GitHub Actions) to automatically sync your WakaTime data every day.
- **Gist Storage**: Keeps your coding history in a GitHub Gist for easy and versioned access.
- **Data Visualization**: An `index.html` page running ECharts to render your daily total coding hours and the top 5 languages used.

## Architecture

1. **Backend**: A NestJS standalone CLI script (`src/main.ts`) runs as a cron job via GitHub Actions.
2. **Storage**: Data is exported as JSON and uploaded to your GitHub Gist.
3. **Frontend**: A static HTML file (`index.html`) can be hosted anywhere (e.g. GitHub Pages) and fetches live data directly from your Gist.

## Setup Instructions

### 1. Prerequisites
You will need the following 3 credentials/IDs:
- **WAKATIME_API_KEY**: From your [WakaTime account settings](https://wakatime.com/settings/api-key).
- **GitHub PAT (Personal Access Token)**: Go to [GitHub Developer Settings](https://github.com/settings/tokens/new) and generate a classic token with `gist` scope.
- **Gist ID**: Create an empty public Gist at [gist.github.com](https://gist.github.com), look at the URL, e.g. `https://gist.github.com/username/12345abcdef`, the ID is `12345abcdef`.

### 2. Configure GitHub Secrets
Go to this repository's **Settings > Secrets and variables > Actions**, and click **New repository secret**.
Add the following secrets:
- `WAKATIME_API_KEY`: Your WakaTime API key
- `GH_TOKEN`: Your GitHub PAT
- `GIST_ID`: Your Gist ID

### 3. Setup GitHub Pages (Optional but Recommended)
To view your dashboard online:
1. Go to repository **Settings > Pages**.
2. Set the source branch to `main` (or the branch you push to) and folder to `/ (root)`.
3. Save. Once the site is live, append your Gist ID: `https://<your-username>.github.io/<repo>/index.html?gist=YOUR_GIST_ID`.

### 4. Running Locally
```bash
# Install dependencies
npm install

# Build the NestJS app
npm run build

# Run the sync task manually
WAKATIME_API_KEY="your-key" GH_TOKEN="your-token" GIST_ID="gist-id" node dist/main.js
```

Then open `index.html?gist=gist-id` in your browser.
