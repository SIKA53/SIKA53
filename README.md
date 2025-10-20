# Lotto Machine Demo

This repository now includes a responsive Three.js-powered lotto machine prototype under [`app/`](app/). It was scaffolded with Vite and React and showcases real-time physics, a scripted draw sequence, and hooks for future enhancements such as audio cues or localization.

## Zero-install demo

The repository now ships with a pre-built static bundle inside [`docs/`](docs/). Push the branch to GitHub and enable **GitHub Pages** with the "Deploy from a branch" option that targets the `docs/` folder on your default branch. GitHub will publish the experience at

```
https://<your-account>.github.io/<your-repo>/
```

Once the page is live you can tap that link from any desktop or mobile browser—no npm commands required. The same `docs/index.html` file can also be opened directly from local storage or any static host if you prefer to deploy elsewhere.

## Features

- **Interactive 3D chamber** built with Three.js, complete with lighting, glass materials, and animated camera tracks.
- **Physics-driven lotto balls** using `cannon-es`, continuously tumbling until six unique balls are emitted through the draw tube.
- **Cinematic draw flow** orchestrated with GSAP timelines, including tube zoom, front-facing finale, and number slot alignment.
- **Responsive UI** for desktop and mobile, featuring Draw and Retry controls plus live number highlights.
- **Viewport-aware cameras** that retarget their tracks for portrait and landscape screens so the experience feels native on phones, tablets, and PCs alike.
- **Extensibility hooks** to plug in custom audio cues and localized copy without rewriting core logic.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- npm (bundled with Node.js)

### Installation

```bash
cd app
npm install
```

### Development Server

```bash
npm run dev
```

Vite will print a local development URL (typically `http://localhost:5173`). Open it in your browser to interact with the lotto machine. The dev server supports hot module replacement for rapid iteration.

### Production Build

```bash
npm run build
```

The production-ready assets will be output to [`docs/`](docs/) so they can be hosted directly (for example via GitHub Pages). Preview the bundle locally with:

```bash
npm run preview
```

### Optional Enhancements

- Register audio clips via `useAudioCue().registerCue(key, url)` and enable playback by toggling the hook’s `enabled` flag.
- Supply translations by calling `useLocale` with locale-specific overrides or updating the returned `setOverrides` handler.

Enjoy experimenting with the virtual lotto experience!
