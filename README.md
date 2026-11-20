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

Opening a saved activity from a list, the calendar or a form-result badge shows
a read-only detail modal. Tap Edit to change it; new activities still open
directly in the form. Routine templates keep their existing editing flow.

In Settings, My rating tracks your singles and doubles ratings separately.
Choose a format, enter the rating and its date, then tap Add rating update.
Every save keeps a new history entry, including multiple updates on the same
day. The latest value follows the rating date (then the time it was recorded),
so adding an older result does not replace your current rating. History is
stored on-device or synced to your signed-in account like your other logs.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

On iPhone web browsers, type into a form field and dismiss the keyboard: the
page should stay at its original zoom. Shared web fields use 16px text to avoid
iOS focus zoom; custom field styles should keep text at least that large.
Pinch-to-zoom must remain available.

Decimal fields (ratings, weights, distances and minutes) accept either `,` or `.`
as the decimal separator, normalizing commas to dots while typing. Check that
`25,8` and `25.8` both pass rating validation; malformed decimals must still fail.
Names and other non-decimal fields must retain commas unchanged.

For rating history, add two singles updates and one doubles update. Check that
each format keeps its own history after reloading, and that adding an older
dated entry does not change the latest rating. Blank, negative or malformed
ratings and invalid dates must show an error without adding an entry.

Open saved tennis, gym and other activities: details should show no editable
fields or Save/Delete controls. Tap Edit to check that the existing values load
in the form and can still be saved. Viewing or closing details must not change
stored records. Gym details must include all exercises; interval details must
include every step and match details must include recorded self-assessments.

The build command exports the web app to `dist/`. Native App Store builds
require separate signing and build setup.
Web hosting must serve `index.html` for unknown paths so Expo Router links work
when opened directly or refreshed.
