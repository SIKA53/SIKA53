# Lotto Machine Demo

This repository now includes a responsive Three.js-powered lotto machine prototype under [`app/`](app/). It was scaffolded with Vite and React and showcases real-time physics, a scripted draw sequence, and hooks for future enhancements such as audio cues or localization.

## Features

- **Interactive 3D chamber** built with Three.js, complete with lighting, glass materials, and animated camera tracks.
- **Physics-driven lotto balls** using `cannon-es`, continuously tumbling until six unique balls are emitted through the draw tube.
- **Cinematic draw flow** orchestrated with GSAP timelines, including tube zoom, front-facing finale, and number slot alignment.
- **Responsive UI** for desktop and mobile, featuring Draw and Retry controls plus live number highlights.
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

The production-ready assets will be output to `app/dist/`. Preview the bundle with:

```bash
npm run preview
```

### Optional Enhancements

- Register audio clips via `useAudioCue().registerCue(key, url)` and enable playback by toggling the hook’s `enabled` flag.
- Supply translations by calling `useLocale` with locale-specific overrides or updating the returned `setOverrides` handler.

Enjoy experimenting with the virtual lotto experience!
