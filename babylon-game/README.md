# Epic Airplane — Sky Frontier (Babylon.js)

A separate browser-first prototype for rebuilding the flight-game concept without requiring Unity. This is a new experimental folder on the `babylon-prototype` branch; the original `main` branch and Unity source files have not been changed.

## Current prototype
- Real-time 3D scene powered by Babylon.js.
- Procedurally generated ocean, islands, clouds, and a chase camera.
- A placeholder aircraft assembled from 3D primitives.
- Keyboard and touch controls, boost, flight HUD, distance tracking, and route-ring collection.
- Vite + TypeScript and a Capacitor Android wrapper configuration.

## Run locally
Requires Node.js 20 or newer.

```sh
cd babylon-game
npm install
npm run dev
```

For a production web build:

```sh
npm run build
```

## Android
The Capacitor wrapper is configured, but Android project generation/signing has not been completed in this initial commit. After dependencies are installed, run `npx cap add android`, then `npm run build` and `npx cap sync android`.

## Original assets
The Unity repository includes GLB aircraft models under `Assets/Models/GLB/`. They are intentionally preserved in the original project. The current prototype uses a procedural placeholder aircraft; integrating the original GLB models is a next step after validating the actual files and their licenses/attribution requirements.

## Known limitations
This is a playable technical prototype, not a feature-complete remake. Aircraft collection/upgrades, the home base, distinct mission biomes, saved progress, sound, collision/mission flow, accessibility settings, and original model integration are not implemented yet. The visual environment and aircraft are placeholders.
