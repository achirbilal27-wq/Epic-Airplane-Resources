# Epic Airplane — Sky Frontier (Babylon.js)

A browser-first flight-game prototype in a separate `babylon-game/` folder on the `babylon-prototype` branch. The original Unity project and `main` branch remain untouched.

## Implemented in this prototype
- Babylon.js real-time 3D scene with a chase camera, ocean, islands, and clouds.
- A hangar menu with five selectable aircraft entries.
- Original GLB aircraft loading from the repository's `Assets/Models/GLB/` folder, with a procedural fallback if a remote model cannot load.
- Four region themes: tropical islands, amber desert, frost peaks, and a mysterious frontier, each with different colors and environmental props.
- Flight controls: keyboard, touch/drag steering, climb/dive, and boost.
- Six route rings per mission, mission completion rewards, and region unlock progression.
- Aircraft purchases, tuning upgrades, and local-device progress persistence using `localStorage`.
- Responsive HUD, mission progress display, and a GitHub Actions web-build workflow.

## Run locally
Requires Node.js 20 or newer.

```sh
cd babylon-game
npm install
npm run dev
```

Production web build:

```sh
npm run build
```

## Android wrapper
Capacitor is configured. Android project generation and APK packaging still need to be completed:

```sh
npm run build
npx cap add android
npx cap sync android
```

An Android build/signing workflow is not yet included. The existing GitHub Actions workflow validates and uploads the production web build only.

## Original models and limitations
The original GLB assets remain in the Unity project and are loaded at runtime from GitHub's raw file host. First load requires internet access; large models may take time to download. Verify asset licensing and attribution before distributing a public build.

This is still an early playable prototype, not a complete recreation. Mission scoring is deliberately simple. Collision/obstacle systems, audio, settings, offline model bundling, a real base-building loop, and a signed Android APK remain future work. Browser-based CI passing confirms compilation and bundling, not full device or gameplay QA.
