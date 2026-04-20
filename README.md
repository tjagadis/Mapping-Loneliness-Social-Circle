# USC Social Circle Map

A Vue + Mapbox demo that uses synthetic Strava/Fitbit-like mobility data to visualize how a student's places, contacts, distance moved, and inferred social circle change across a semester.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the project root:

```bash
VITE_MAPBOX_TOKEN=your_token_here
```

3. Run locally:

```bash
npm run dev
```

## GitHub Pages

If you deploy to GitHub Pages, keep the repo name in `vite.config.js` base path:

```js
base: '/Mapping-Loneliness-Social-Circle/'
```

Store the Mapbox token in GitHub Secrets and inject it during the build step as `VITE_MAPBOX_TOKEN`.
