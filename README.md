# Court Log

Personal tennis, gym and fitness tracker using Expo, Expo Router and TypeScript.
Targets iOS and web, with local persistence and date-based Grand Slam themes.

## Development

Use Node.js 24 LTS and npm.

```sh
npm install
npm run web
```

For an iPhone, install Expo Go, run `npm start`, and scan the QR code.
The phone and computer should be on the same network.

For the iOS Simulator, install Xcode and run `npm run ios`.

Routes live in [src/app](./src/app), pure business rules in
[src/domain](./src/domain), and the storage interface in
[src/data/repository.ts](./src/data/repository.ts). See
[backend adapters](./docs/backend.md) for cloud migration notes.

Tap the Home season pill to open Settings. Expand Developer options to preview
all four themes or load/remove sample data. The app starts empty; demo data never
replaces your own records.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

The build command exports the web app to `dist/`. Native App Store builds
require separate signing and build setup.
Web hosting must serve `index.html` for unknown paths so Expo Router links work
when opened directly or refreshed.
